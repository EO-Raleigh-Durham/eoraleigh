// Server-only. Keeps an On the Radar issue's card on the Board workboard in
// step with the issue. Shared by the Radar page's actions and the connector's
// issue tools (src/lib/mcp/own-tools.ts), so both move the card the same way.
import { revalidatePath } from "next/cache";
import { companyOs } from "@/kernel/data/supabase";

// Every assigned issue has one card on the Board workboard (Dave, 20 Nov
// 2026), assigned to the same person under their chair's function, linked back
// by subject_type "issue". Solving or dropping the issue moves the card to
// Done or Not Doing; reopening it moves the card back to To do. A failure here
// never blocks the issue change: the card is a mirror, the issue is the record.
export async function syncIssueCard(issueId: string): Promise<void> {
  try {
    const { data: issue } = await companyOs
      .from("issues")
      .select("id, title, notes_md, status, assignee_person_id")
      .eq("id", issueId)
      .maybeSingle();
    if (!issue) return;
    const { data: board } = await companyOs
      .from("boards")
      .select("id, board_columns(id, name, is_done, is_not_doing), epics(id, name)")
      .eq("slug", "board")
      .maybeSingle();
    if (!board) return;
    type Col = { id: string; name: string; is_done: boolean; is_not_doing: boolean };
    const cols = (board.board_columns ?? []) as Col[];
    const todo = cols.find((c) => c.name === "To do") ?? cols.find((c) => !c.is_done && !c.is_not_doing);
    const done = cols.find((c) => c.is_done);
    const notDoing = cols.find((c) => c.is_not_doing);
    const closed = issue.status === "solved" || issue.status === "dropped";
    const column = issue.status === "solved" ? done : issue.status === "dropped" ? notDoing : todo;

    const { data: existing } = await companyOs
      .from("tasks")
      .select("id")
      .eq("subject_type", "issue")
      .eq("subject_id", issueId)
      .is("archived_at", null)
      .maybeSingle();

    if (!issue.assignee_person_id) {
      if (existing) await companyOs.from("tasks").update({ assignee_id: null }).eq("id", existing.id);
      return;
    }
    // The chair's function on the Board workboard: "<role name> activities".
    const { data: seats } = await companyOs
      .from("board_appointments")
      .select("board_roles(name)")
      .eq("person_id", issue.assignee_person_id)
      .order("fiscal_year_start", { ascending: false })
      .limit(1);
    const roleName = ((seats ?? [])[0] as { board_roles: { name: string } | null } | undefined)?.board_roles?.name;
    const epic = ((board.epics ?? []) as { id: string; name: string }[]).find((e) => roleName && e.name.startsWith(roleName));

    const fields = {
      title: issue.title.slice(0, 200),
      description: `From On the Radar. Solving or dropping the issue there moves this card.${issue.notes_md ? `\n\n${issue.notes_md}` : ""}`,
      assignee_id: issue.assignee_person_id,
      board_column_id: column?.id ?? null,
      status: closed ? "done" : "open",
      completed_at: closed ? new Date().toISOString() : null,
      ...(epic ? { epic_id: epic.id } : {}),
    };
    if (existing) await companyOs.from("tasks").update(fields).eq("id", existing.id);
    else if (!closed)
      await companyOs.from("tasks").insert({ ...fields, board_id: board.id, priority: "p2", subject_type: "issue", subject_id: issueId });
    revalidatePath("/board/workboards/boards/board");
  } catch (e) {
    console.error("syncIssueCard:", (e as Error).message);
  }
}
