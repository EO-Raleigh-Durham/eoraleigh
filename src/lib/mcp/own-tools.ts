// Server-only. The connector's own-records tools (Dave, 2026-11-21): anyone
// connected (board, super admin, contractor) reads and updates their own
// goal, their cards (My Commitments), their chair update on a board meeting
// agenda, and the Radar issues assigned to or filed by them. Area "me", so
// every level gets them (./access.ts).
//
// Ownership is checked against the caller from the bearer token, never from
// tool input: a goal's key result must be accountable to the caller, a card
// assigned to them, a meeting update for a seat they hold that fiscal year,
// an issue assigned to them or filed by them. Writes use the same tables and
// rules the pages use (goals: checkInKr; cards: landCard; updates: saveUpdate;
// issues: createIssue and setIssueStatus with syncIssueCard).
//
// Data modules load lazily, inside each tool's body, so this file can be
// imported by the unit tests without a database.
import { CHAPTER_NAME } from "../../kernel/config/chapter.ts";
import { z } from "zod";
import type { McpCaller } from "./caller";
import { NO_INPUT, untrusted, writeTool, type Tool } from "./tools-core.ts";

const db = async () => (await import("../supabase")).supabase;
const audit = async () => (await import("@/kernel/audit/audit")).recordAudit;
const today = async () => (await import("../access-grants")).vnToday();
const fyNow = async () => (await import("../fiscal-year")).currentFyStart();
const revalidate = async (...paths: string[]) => {
  const { revalidatePath } = await import("next/cache");
  for (const p of paths) {
    try {
      revalidatePath(p);
    } catch {
      // Outside a request (tests, scripts) there is nothing to revalidate.
    }
  }
};

const KR_STATUSES = ["on_track", "at_risk", "off_track", "done"] as const;
const ISSUE_DIAGNOSES = ["goal", "system", "execution"] as const;
const ISSUE_STATUSES = ["open", "solving", "solved", "dropped"] as const;
const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-12-08");
const uuid = (what: string) => z.string().uuid(`Use the ${what} id from my_commitments`);

const NO_PERSON = {
  error: `Your ${CHAPTER_NAME} login is not linked to a person record, so there is nothing of yours to show or change. Ask the chapter manager to link it.`,
};

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// ---- Loaders ----------------------------------------------------------------

type KrRow = {
  id: string;
  title: string;
  current_value: number;
  target_value: number | null;
  unit: string | null;
  direction: string;
  status: string;
  accountable_person_id: string;
  objective: { title: string; year: number } | null;
};

async function myKeyResults(personId: string, fy: number): Promise<KrRow[]> {
  const { data, error } = await (await db())
    .from("key_results")
    .select("id, title, current_value, target_value, unit, direction, status, accountable_person_id, objective:objectives!key_results_objective_id_fkey!inner(title, year)")
    .eq("accountable_person_id", personId)
    .eq("objective.year", fy)
    .order("sort_order");
  if (error) throw new Error(`key_results: ${error.message}`);
  return (data ?? []) as unknown as KrRow[];
}

async function loadKr(id: string): Promise<KrRow | null> {
  const { data, error } = await (await db())
    .from("key_results")
    .select("id, title, current_value, target_value, unit, direction, status, accountable_person_id, objective:objectives!key_results_objective_id_fkey(title, year)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`key_results: ${error.message}`);
  return (data as unknown as KrRow | null) ?? null;
}

type Seat = { roleId: string; roleName: string; position: string };

async function mySeats(personId: string, fy: number): Promise<Seat[]> {
  const { data, error } = await (await db())
    .from("board_appointments")
    .select("board_role_id, position, role:board_roles(name)")
    .eq("person_id", personId)
    .eq("fiscal_year_start", fy);
  if (error) throw new Error(`board_appointments: ${error.message}`);
  const rows = (data ?? []) as unknown as { board_role_id: string; position: string; role: { name: string } | null }[];
  return rows.map((r) => ({ roleId: r.board_role_id, roleName: r.role?.name ?? "Board role", position: r.position }));
}

type CardRow = {
  id: string;
  title: string;
  due_date: string | null;
  assignee_id: string | null;
  board_id: string | null;
  board_column_id: string | null;
  subject_type: string | null;
  subject_id: string | null;
  status: string;
  board_columns: { name: string; is_done: boolean; is_not_doing: boolean } | null;
  boards: { slug: string; name: string } | null;
};

const CARD_COLUMNS =
  "id, title, due_date, assignee_id, board_id, board_column_id, subject_type, subject_id, status, board_columns(name, is_done, is_not_doing), boards(slug, name)";

async function loadCard(id: string): Promise<CardRow | null> {
  const { data, error } = await (await db()).from("tasks").select(CARD_COLUMNS).eq("id", id).is("archived_at", null).maybeSingle();
  if (error) throw new Error(`tasks: ${error.message}`);
  return (data as unknown as CardRow | null) ?? null;
}

type IssueRow = {
  id: string;
  title: string;
  diagnosis: string;
  status: string;
  notes_md: string | null;
  filed_by: string;
  assignee_person_id: string | null;
  created_at: string;
};

const ISSUE_COLUMNS = "id, title, diagnosis, status, notes_md, filed_by, assignee_person_id, created_at";

async function loadIssue(id: string): Promise<IssueRow | null> {
  const { data, error } = await (await db()).from("issues").select(ISSUE_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`issues: ${error.message}`);
  return (data as IssueRow | null) ?? null;
}

/** An issue is the caller's when it is assigned to them or they filed it. */
export function ownsIssue(issue: { assignee_person_id: string | null; filed_by: string }, personId: string | null, email: string): boolean {
  return (personId !== null && issue.assignee_person_id === personId) || issue.filed_by.toLowerCase() === email.toLowerCase();
}

// ---- Tools ------------------------------------------------------------------

export function ownTools(caller: McpCaller): Tool[] {
  const personId = caller.user.personId;
  const actorLabel = caller.user.fullName || caller.user.email;
  const actor = `${caller.user.email} (connector)`;

  const reads: Tool[] = [
    {
      name: "my_commitments",
      area: "me",
      title: "My commitments",
      description:
        "Everything that is yours this fiscal year: your board seats, your goal (the key results you are accountable for), " +
        "your open cards, the next board meeting and whether your update is written, and the Radar issues assigned to you or filed by you. " +
        "Call it before changing any of them: it gives the ids the write tools take.",
      readOnly: true,
      ...NO_INPUT,
      run: async () => {
        if (!personId) return NO_PERSON;
        const supabase = await db();
        const fy = await fyNow();
        const day = await today();
        const { nextBoardMeeting } = await import("../board-home-shared");
        const next = nextBoardMeeting(day);
        const { getMeeting } = await import("../board-meetings");
        const [seats, krs, cardsRes, meeting, assigned, filed] = await Promise.all([
          mySeats(personId, fy),
          myKeyResults(personId, fy),
          supabase
            .from("tasks")
            .select(CARD_COLUMNS)
            .eq("assignee_id", personId)
            .eq("status", "open")
            .is("archived_at", null)
            .not("board_id", "is", null)
            .order("due_date", { ascending: true, nullsFirst: false })
            .limit(200),
          getMeeting(next),
          supabase.from("issues").select(ISSUE_COLUMNS).eq("assignee_person_id", personId).in("status", ["open", "solving"]),
          supabase.from("issues").select(ISSUE_COLUMNS).eq("filed_by", caller.user.email).in("status", ["open", "solving"]),
        ]);
        if (cardsRes.error) throw new Error(`tasks: ${cardsRes.error.message}`);
        const cards = ((cardsRes.data ?? []) as unknown as CardRow[]).filter((c) => !c.board_columns?.is_done && !c.board_columns?.is_not_doing);
        let written: string[] = [];
        if (meeting && seats.length) {
          const { data } = await supabase
            .from("meeting_updates")
            .select("board_role_id")
            .eq("meeting_id", meeting.id)
            .in("board_role_id", seats.map((s) => s.roleId));
          written = ((data ?? []) as { board_role_id: string }[]).map((r) => r.board_role_id);
        }
        const issues = new Map<string, IssueRow>();
        for (const i of [...((assigned.data ?? []) as IssueRow[]), ...((filed.data ?? []) as IssueRow[])]) issues.set(i.id, i);
        return {
          seats: seats.map((s) => ({ role: s.roleName, position: s.position })),
          goal: krs.map((k) => ({
            keyResultId: k.id,
            title: k.title,
            priority: k.objective?.title ?? null,
            current: Number(k.current_value),
            target: k.target_value === null ? null : Number(k.target_value),
            unit: k.unit,
            direction: k.direction,
            status: k.status,
          })),
          cards: cards.map((c) => ({
            cardId: c.id,
            title: untrusted(c.title),
            board: c.boards?.name ?? null,
            column: c.board_columns?.name ?? null,
            due: c.due_date,
            overdue: Boolean(c.due_date && c.due_date < day),
          })),
          nextMeeting: {
            on: next,
            label: dayLabel(next),
            updates: seats.map((s) => ({ role: s.roleName, written: written.includes(s.roleId) })),
          },
          issues: [...issues.values()].map((i) => ({
            issueId: i.id,
            title: untrusted(i.title),
            status: i.status,
            diagnosis: i.diagnosis,
            assignedToMe: i.assignee_person_id === personId,
            notes: untrusted(i.notes_md),
            raised: i.created_at.slice(0, 10),
          })),
        };
      },
    },
  ];

  const writes: Tool[] = [
    writeTool(caller, {
      name: "goal_check_in",
      area: "me",
      title: "My goal: check in",
      description:
        "Records where one of your key results stands now: its current value and status (on_track, at_risk, off_track, done), " +
        "with an optional note for the trail. Only key results you are accountable for.",
      input: z.object({
        keyResultId: uuid("keyResult"),
        value: z.number().finite(),
        status: z.enum(KR_STATUSES),
        note: z.string().trim().min(1).max(2000).optional(),
      }),
      properties: {
        keyResultId: { type: "string", description: "From my_commitments goal[].keyResultId." },
        value: { type: "number", description: "The current value, in the key result's unit." },
        status: { type: "string", enum: [...KR_STATUSES] },
        note: { type: "string", description: "Optional. What moved and why." },
      },
      required: ["keyResultId", "value", "status"],
      plan: async (f) => {
        if (!personId) return NO_PERSON;
        const kr = await loadKr(f.keyResultId);
        if (!kr || kr.accountable_person_id !== personId) return { error: "That key result is not one you are accountable for. Use my_commitments to see yours." };
        const unit = kr.unit ? ` ${kr.unit}` : "";
        const warnings: string[] = [];
        if (f.status === "done") warnings.push("This marks the key result done.");
        if (kr.target_value !== null && f.value === Number(kr.current_value) && f.status === kr.status) warnings.push("Nothing changes: the value and status are already this.");
        return {
          summary: `${kr.title}: ${Number(kr.current_value)}${unit} → ${f.value}${unit}, ${f.status.replace("_", " ")}`,
          warnings,
        };
      },
      apply: async (f) => {
        const supabase = await db();
        const before = await loadKr(f.keyResultId);
        const updates = { current_value: f.value, status: f.status, updated_at: new Date().toISOString() };
        const { error } = await supabase.from("key_results").update(updates).eq("id", f.keyResultId).eq("accountable_person_id", personId!);
        if (error) throw new Error(error.message);
        await (await audit())({
          table: "key_results",
          recordId: f.keyResultId,
          operation: "update",
          actor,
          oldData: before ? { current_value: before.current_value, status: before.status } : null,
          newData: updates,
        });
        if (f.note) {
          const { error: logErr } = await supabase.from("kr_logs").insert({
            key_result_id: f.keyResultId,
            week_start: await today(),
            value: f.value,
            note_md: f.note,
            author_kind: "human",
            author_person_id: personId,
          });
          if (logErr) throw new Error(`Checked in, but the note was not saved: ${logErr.message}`);
        }
        await revalidate("/board/goals", "/board", "/member/priorities");
      },
    }),

    writeTool(caller, {
      name: "card_update",
      area: "me",
      title: "My cards: update a card",
      description:
        "Changes one of your own cards: moves it to another column on its board (by column name, e.g. Doing or Done), " +
        "sets or clears its due date, and/or adds a comment. Only cards assigned to you.",
      input: z.object({
        cardId: uuid("card"),
        column: z.string().trim().min(1).max(60).optional(),
        dueDate: DAY.nullable().optional(),
        comment: z.string().trim().min(1).max(4000).optional(),
      }),
      properties: {
        cardId: { type: "string", description: "From my_commitments cards[].cardId." },
        column: { type: "string", description: "The column to move it to, by name." },
        dueDate: { type: ["string", "null"], description: "YYYY-MM-DD, or null to clear." },
        comment: { type: "string" },
      },
      required: ["cardId"],
      plan: async (f) => {
        if (!personId) return NO_PERSON;
        if (f.column === undefined && f.dueDate === undefined && f.comment === undefined) return { error: "Say what to change: column, dueDate or comment." };
        const card = await loadCard(f.cardId);
        if (!card || card.assignee_id !== personId) return { error: "That card is not assigned to you. Use my_commitments to see yours." };
        const parts: string[] = [];
        const warnings: string[] = [];
        if (f.column !== undefined) {
          const { data } = await (await db()).from("board_columns").select("id, name, is_done, is_not_doing").eq("board_id", card.board_id!);
          const cols = (data ?? []) as { id: string; name: string; is_done: boolean; is_not_doing: boolean }[];
          const col = cols.find((c) => c.name.toLowerCase() === f.column!.toLowerCase());
          if (!col) return { error: `No column called "${f.column}" on ${card.boards?.name ?? "that board"}. Columns: ${cols.map((c) => c.name).join(", ")}.` };
          parts.push(`${card.board_columns?.name ?? "no column"} → ${col.name}`);
          if (col.is_done) warnings.push("This marks the card done.");
          if (col.is_not_doing) warnings.push("This closes the card as not doing.");
        }
        if (f.dueDate !== undefined) parts.push(f.dueDate ? `due ${dayLabel(f.dueDate)}` : "due date cleared");
        if (f.comment !== undefined) parts.push("adds a comment");
        return { summary: `${card.title}: ${parts.join(", ")}`, warnings };
      },
      apply: async (f) => {
        const supabase = await db();
        const card = (await loadCard(f.cardId))!;
        if (card.assignee_id !== personId) throw new Error("That card is no longer assigned to you.");
        const boardActor = { label: actorLabel, personId, isAdmin: false };
        if (f.dueDate !== undefined) {
          const { error } = await supabase.from("tasks").update({ due_date: f.dueDate }).eq("id", f.cardId);
          if (error) throw new Error(error.message);
          await (await audit())({ table: "tasks", recordId: f.cardId, operation: "update", actor, newData: { due_date: f.dueDate } });
        }
        if (f.comment !== undefined) {
          const { error } = await supabase
            .from("task_comments")
            .insert({ task_id: f.cardId, author_person_id: personId, author_label: actorLabel, body: f.comment });
          if (error) throw new Error(error.message);
        }
        if (f.column !== undefined) {
          const { data } = await supabase.from("board_columns").select("id, name, is_done, is_not_doing").eq("board_id", card.board_id!);
          const col = ((data ?? []) as { id: string; name: string; is_done: boolean; is_not_doing: boolean }[]).find(
            (c) => c.name.toLowerCase() === f.column!.toLowerCase(),
          );
          if (col && col.id !== card.board_column_id) {
            const { landCard } = await import("@/entities/boards/lib/land-card");
            const slug = card.boards?.slug ?? "";
            const moved = await landCard({
              taskId: f.cardId,
              actor: boardActor,
              from: { boardId: card.board_id!, columnId: card.board_column_id, status: card.status },
              to: { boardId: card.board_id!, boardSlug: slug, columnId: col.id, isDone: col.is_done, isNotDoing: col.is_not_doing },
              subject: { type: card.subject_type, id: card.subject_id },
              logNote: `Moved through the ${CHAPTER_NAME} connector`,
              refreshSlugs: slug ? [slug] : [],
            });
            if (!moved.ok) throw new Error(moved.error);
          }
        }
        await revalidate("/board", "/board/workboards/my-week");
      },
    }),

    writeTool(caller, {
      name: "meeting_update_write",
      area: "me",
      title: "Board meeting: write my update",
      description:
        "Writes or replaces your chair's update on a board meeting agenda (the next meeting unless a date is given). " +
        "Only for a seat you hold that fiscal year; if you hold more than one, name the role.",
      input: z.object({
        body: z.string().trim().min(1).max(10000),
        meetingOn: DAY.optional(),
        role: z.string().trim().min(1).max(100).optional(),
      }),
      properties: {
        body: { type: "string", description: "The update, in Markdown." },
        meetingOn: { type: "string", description: "The meeting date, YYYY-MM-DD. Defaults to the next board meeting." },
        role: { type: "string", description: "Your board role's name, when you hold more than one." },
      },
      required: ["body"],
      plan: async (f) => {
        if (!personId) return NO_PERSON;
        const { nextBoardMeeting } = await import("../board-home-shared");
        const { getMeeting } = await import("../board-meetings");
        const { fyStartForDate } = await import("../fiscal-year");
        const next = nextBoardMeeting(await today());
        const day = f.meetingOn ?? next;
        const meeting = await getMeeting(day);
        if (!meeting && day !== next) return { error: `There is no board meeting on ${dayLabel(day)}. The next one is ${dayLabel(next)}.` };
        const seats = await mySeats(personId, meeting?.fiscal_year_start ?? fyStartForDate(day));
        if (!seats.length) return { error: "You hold no board seat that fiscal year, so there is no update of yours to write." };
        const seat = f.role ? seats.find((s) => s.roleName.toLowerCase() === f.role!.toLowerCase()) : seats.length === 1 ? seats[0] : null;
        if (!seat) return { error: `Say which role this update is for: ${seats.map((s) => s.roleName).join(", ")}.` };
        const warnings: string[] = [];
        if (meeting?.status === "held") warnings.push("That meeting has already been held.");
        if (meeting?.status === "cancelled") warnings.push("That meeting was cancelled.");
        let replaces = false;
        if (meeting) {
          const { data } = await (await db()).from("meeting_updates").select("id").eq("meeting_id", meeting.id).eq("board_role_id", seat.roleId).maybeSingle();
          replaces = Boolean(data);
        }
        if (replaces) warnings.push("This replaces the update already written for this seat.");
        return { summary: `${seat.roleName} update for the ${dayLabel(day)} board meeting`, warnings, details: { body: f.body } };
      },
      apply: async (f) => {
        const { nextBoardMeeting } = await import("../board-home-shared");
        const { ensureMeeting, getMeeting } = await import("../board-meetings");
        const day = f.meetingOn ?? nextBoardMeeting(await today());
        await ensureMeeting(day);
        const meeting = (await getMeeting(day))!;
        const seats = await mySeats(personId!, meeting.fiscal_year_start);
        const seat = f.role ? seats.find((s) => s.roleName.toLowerCase() === f.role!.toLowerCase()) : seats.length === 1 ? seats[0] : null;
        if (!seat) throw new Error("You no longer hold that seat.");
        const { error } = await (await db())
          .from("meeting_updates")
          .upsert(
            { meeting_id: meeting.id, board_role_id: seat.roleId, person_id: personId, body_md: f.body, updated_at: new Date().toISOString() },
            { onConflict: "meeting_id,board_role_id" },
          );
        if (error) throw new Error(error.message);
        await revalidate("/board/meetings", `/board/meetings/${day}`, "/board");
      },
    }),

    writeTool(caller, {
      name: "issue_file",
      area: "me",
      title: "Radar: raise an issue",
      description:
        "Puts an issue On the Radar, assigned to you, with its diagnosis: goal (the target is wrong), system (the process is) " +
        "or execution (the work is not getting done). It gets a card on the Board workboard.",
      input: z.object({
        title: z.string().trim().min(1).max(300),
        diagnosis: z.enum(ISSUE_DIAGNOSES),
        notes: z.string().trim().min(1).max(4000).optional(),
      }),
      properties: {
        title: { type: "string" },
        diagnosis: { type: "string", enum: [...ISSUE_DIAGNOSES] },
        notes: { type: "string" },
      },
      required: ["title", "diagnosis"],
      plan: async (f) => {
        if (!personId) return NO_PERSON;
        return { summary: `On the Radar: "${f.title}" (${f.diagnosis} problem), assigned to you`, warnings: [] };
      },
      apply: async (f) => {
        const row = {
          title: f.title,
          diagnosis: f.diagnosis,
          assignee_person_id: personId,
          notes_md: f.notes ?? null,
          filed_by: caller.user.email,
        };
        const { data, error } = await (await db()).from("issues").insert(row).select("id").single();
        if (error) throw new Error(error.message);
        const id = (data as { id: string }).id;
        await (await audit())({ table: "issues", recordId: id, operation: "insert", actor, newData: row });
        const { syncIssueCard } = await import("@/entities/ideas/lib/issue-card");
        await syncIssueCard(id);
        await revalidate("/board/radar", "/board");
        return { issueId: id };
      },
    }),

    writeTool(caller, {
      name: "issue_update",
      area: "me",
      title: "Radar: update my issue",
      description:
        "Changes the status of a Radar issue assigned to you or filed by you (open, solving, solved, dropped) and/or adds a dated note. " +
        "Solving or dropping it moves its card on the Board workboard.",
      input: z.object({
        issueId: uuid("issue"),
        status: z.enum(ISSUE_STATUSES).optional(),
        note: z.string().trim().min(1).max(4000).optional(),
      }),
      properties: {
        issueId: { type: "string", description: "From my_commitments issues[].issueId." },
        status: { type: "string", enum: [...ISSUE_STATUSES] },
        note: { type: "string", description: "Added to the issue's notes with today's date and your name." },
      },
      required: ["issueId"],
      plan: async (f) => {
        if (!personId && !caller.user.email) return NO_PERSON;
        if (f.status === undefined && f.note === undefined) return { error: "Say what to change: status or note." };
        const issue = await loadIssue(f.issueId);
        if (!issue || !ownsIssue(issue, personId, caller.user.email)) return { error: "That issue is not assigned to you or filed by you. Use my_commitments to see yours." };
        const parts: string[] = [];
        const warnings: string[] = [];
        if (f.status !== undefined && f.status !== issue.status) parts.push(`${issue.status} → ${f.status}`);
        if (f.status === "dropped") warnings.push("Dropping closes the issue without solving it.");
        if (f.note !== undefined) parts.push("adds a note");
        if (!parts.length) return { error: `It is already ${issue.status}.` };
        return { summary: `${issue.title}: ${parts.join(", ")}`, warnings };
      },
      apply: async (f) => {
        const issue = (await loadIssue(f.issueId))!;
        const updates: Record<string, unknown> = {};
        if (f.status !== undefined && f.status !== issue.status) {
          updates.status = f.status;
          updates.resolved_at = f.status === "solved" || f.status === "dropped" ? new Date().toISOString() : null;
        }
        if (f.note !== undefined) {
          updates.notes_md = [issue.notes_md ?? "", `${await today()}, ${actorLabel}: ${f.note}`].filter(Boolean).join("\n\n");
        }
        const { error } = await (await db()).from("issues").update(updates).eq("id", f.issueId);
        if (error) throw new Error(error.message);
        await (await audit())({ table: "issues", recordId: f.issueId, operation: "update", actor, newData: updates });
        const { syncIssueCard } = await import("@/entities/ideas/lib/issue-card");
        await syncIssueCard(f.issueId);
        await revalidate("/board/radar", "/board");
      },
    }),
  ];

  // Raising a Radar issue is board work on the website (ideas.manage), so a
  // contractor updates only issues already theirs and never files one.
  const handedWrites = caller.reach.level === "contractor" ? writes.filter((t) => t.name !== "issue_file") : writes;
  return [...reads, ...handedWrites];
}
