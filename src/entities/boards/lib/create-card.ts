import { cleanTokens } from "./tokens";
import { companyOs, type CompanyOsUpdate } from "@/kernel/data/supabase";
import { recordAudit } from "@/kernel/audit/audit";
import { type Result } from "@/kernel/data/result";
import { zodIssuesToMessage } from "@/kernel/config/schemas";
import type { BoardActor } from "./access";
import { notifyBoardAssignee } from "./notify";
import { endPosition, ensureMember, mergeCardMeta, refresh } from "./card-helpers";
import { TASK_PRIORITIES, columnStatus, type TaskPriority } from "./types";
import { createCardInput, type CreateCardInput } from "./schemas";
import { announcePrLink } from "./pr-stamp";
import { sparkLabelMetadata } from "./card-spark";

// Server-only. Making a card once the caller is known to be allowed on its
// board. The page's createCard (./actions.ts) reaches here through
// boardMutation's session check; the chapter connector (src/lib/mcp/
// workboard-tools.ts) through its own check of the bearer token's person.
// One body, so a card made either way is the same card.

export function cleanPriority(p: string | undefined): TaskPriority {
  return TASK_PRIORITIES.includes(p as TaskPriority) ? (p as TaskPriority) : "p3";
}

export async function insertCard(actor: BoardActor, raw: CreateCardInput): Promise<Result & { id?: string }> {
  // The guard stays first (the action-auth check insists on it); the schema
  // runs next so everything below sees a trimmed, well-typed input.
  const parsed = createCardInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: zodIssuesToMessage(parsed.error.issues) };
  const input = parsed.data;
  const title = input.title;

  const { data: col, error: colErr } = await companyOs.from("board_columns").select("id, is_done, is_not_doing").eq("id", input.columnId).eq("board_id", input.boardId).maybeSingle();
  if (colErr) return { ok: false, error: colErr.message };
  if (!col) return { ok: false, error: "That column is not on this board." };
  const isDone = (col as { is_done: boolean }).is_done;
  const status = columnStatus(col as { is_done: boolean; is_not_doing: boolean });

  const row = {
    board_id: input.boardId,
    board_column_id: input.columnId,
    title,
    description: input.description?.trim() || null,
    priority: cleanPriority(input.priority),
    assignee_id: input.assigneeId || null,
    created_by: actor.personId,
    due_date: input.dueDate || null,
    human_tokens: cleanTokens(input.humanTokens),
    internal: input.internal ?? false,
    status,
    completed_at: isDone ? new Date().toISOString() : null,
    position: await endPosition(input.boardId, input.columnId),
    // assigned_at drives the "New" chip the assignee sees on the board; the PR
    // link is written by the same helper a saved card's Save uses.
    metadata: {
      ...mergeCardMeta({}, { assignedAt: !!input.assigneeId, prUrl: input.prUrl?.trim() ? input.prUrl : undefined }).meta,
      ...(input.ideaId ? { idea_id: input.ideaId, ...(input.spark ? sparkLabelMetadata(input.spark) : {}) } : {}),
    } as CompanyOsUpdate<"tasks">["metadata"],
  };
  const { data, error } = await companyOs.from("tasks").insert(row).select("id").single();
  if (error) return { ok: false, error: error.message };
  // A PR pasted on the new card asks HTT for its title and state now (F8),
  // before anything below can return early; the card exists from here on.
  await announcePrLink(data.id, null, row.metadata as Record<string, unknown>);
  // The create row is where a card's age starts: the Flow view and the
  // drawer's activity read it. Until W.184 only the SQL path wrote one, so 134
  // of the 139 cards made here in the fortnight before 8 Oct had no age. The
  // sprint is set after this by setCardSprint, which logs its own move.
  const { error: logErr } = await companyOs
    .from("task_stage_log")
    .insert({ task_id: data.id, from_column_id: null, to_column_id: input.columnId, kind: "create", moved_by: actor.personId });
  if (logErr) {
    refresh();
    return { ok: false, error: `Card created, but its stage history could not be written: ${logErr.message}`, id: data.id };
  }
  if (input.assigneeId) {
    const memberErr = await ensureMember(input.boardId, input.assigneeId);
    if (memberErr) {
      // The card row exists at this point. Hand the id back with the failure so
      // the client can turn its retry into an update instead of a second card.
      refresh();
      return { ok: false, error: `Card created, but the assignee could not be added to the board: ${memberErr}`, id: data.id };
    }
    await notifyBoardAssignee(input.boardId, input.assigneeId, title, actor.personId, null, { taskId: data.id, actorName: actor.label });
  }
  await recordAudit({ table: "tasks", recordId: data.id, operation: "insert", actor: actor.label, newData: row });
  refresh();
  return { ok: true, id: data.id };
}
