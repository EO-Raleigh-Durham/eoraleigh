// Server-only. Data for the role-based board home (/board): who the viewer is
// on the board this fiscal year, their goal, their cards, and for the
// President and the chapter manager every chair's standing.
import { supabase } from "@/lib/supabase";
import { currentFyStart } from "@/lib/fiscal-year";
import { chapterToday } from "@/kernel/config/dates";

export type BoardSeat = { personId: string; name: string; roleKey: string; roleName: string; sort: number };

export type BoardViewer = {
  personId: string | null;
  firstName: string;
  roleKeys: string[]; // board_roles.key held this fiscal year
  roleNames: string[];
  isPresident: boolean;
  isManager: boolean; // chapter staff (people.is_eo_staff)
};

export type Goal = {
  title: string;
  value: number;
  target: number | null;
  unit: string | null;
  direction: string;
  status: string;
  measured: boolean;
};

export type CardStage = "todo" | "doing" | "done";
export type Card = { id: string; title: string; dueDate: string | null; overdue: boolean; column: string | null; boardSlug: string | null; boardId: string | null; stage: CardStage };

export type ReportRow = {
  personId: string;
  name: string;
  roles: string[];
  goal: Goal | null;
  openCards: number;
  overdueCards: number;
};

export async function loadBoardSeats(fyStart = currentFyStart()): Promise<BoardSeat[]> {
  const { data, error } = await supabase
    .from("board_appointments")
    .select("person_id, people(name, preferred_name), board_roles(key, name, sort_order)")
    .eq("fiscal_year_start", fyStart);
  if (error) throw new Error(`board_appointments: ${error.message}`);
  type Row = {
    person_id: string;
    people: { name: string | null; preferred_name: string | null } | null;
    board_roles: { key: string; name: string; sort_order: number } | null;
  };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.board_roles)
    .map((r) => ({
      personId: r.person_id,
      name: r.people?.preferred_name || r.people?.name || "Unknown",
      roleKey: r.board_roles!.key,
      roleName: r.board_roles!.name,
      sort: r.board_roles!.sort_order,
    }))
    .sort((a, b) => a.sort - b.sort);
}

// The sidebar's role keys for the signed-in person: their board seats this
// fiscal year, plus "manager" for chapter staff. A failed read gives no roles,
// so the sidebar falls back to the full nav rather than breaking the shell.
export async function loadMyRoleKeys(personId: string | null): Promise<string[]> {
  if (!personId) return [];
  try {
    const [seats, staff] = await Promise.all([
      loadBoardSeats(),
      supabase.from("people").select("is_eo_staff").eq("id", personId).maybeSingle(),
    ]);
    const keys = seats.filter((s) => s.personId === personId).map((s) => s.roleKey);
    if ((staff.data as { is_eo_staff: boolean | null } | null)?.is_eo_staff) keys.push("manager");
    return keys;
  } catch {
    return [];
  }
}

export async function loadBoardViewer(personId: string | null, fallbackName: string | null, seats: BoardSeat[]): Promise<BoardViewer> {
  const mine = seats.filter((s) => s.personId === personId);
  let isStaff = false;
  let name = mine[0]?.name ?? fallbackName ?? "";
  if (personId) {
    const { data } = await supabase.from("people").select("is_eo_staff, preferred_name, name").eq("id", personId).maybeSingle();
    const p = data as { is_eo_staff: boolean | null; preferred_name: string | null; name: string | null } | null;
    isStaff = Boolean(p?.is_eo_staff);
    name = p?.preferred_name || name || p?.name || "";
  }
  return {
    personId,
    firstName: name.split(" ")[0] || "there",
    roleKeys: mine.map((s) => s.roleKey),
    roleNames: mine.map((s) => s.roleName),
    isPresident: mine.some((s) => s.roleKey === "president"),
    isManager: isStaff,
  };
}

type KrRow = {
  title: string;
  current_value: number;
  target_value: number | null;
  unit: string | null;
  direction: string;
  status: string;
  accountable_person_id: string;
  kr_logs: { id: string }[];
};

async function loadGoals(fyStart: number): Promise<KrRow[]> {
  const { data, error } = await supabase
    .from("key_results")
    .select("title, current_value, target_value, unit, direction, status, accountable_person_id, kr_logs(id), objective:objectives!key_results_objective_id_fkey!inner(year)")
    .eq("objective.year", fyStart);
  if (error) throw new Error(`key_results: ${error.message}`);
  return (data ?? []) as unknown as KrRow[];
}

const toGoal = (k: KrRow): Goal => ({
  title: k.title,
  value: Number(k.current_value),
  target: k.target_value === null ? null : Number(k.target_value),
  unit: k.unit,
  direction: k.direction,
  status: k.status,
  measured: k.kr_logs.length > 0 || Number(k.current_value) !== 0,
});

type TaskRow = {
  id: string;
  title: string;
  due_date: string | null;
  assignee_id: string | null;
  board_id: string | null;
  board_columns: { name: string; is_done: boolean; is_not_doing: boolean } | null;
  boards: { slug: string } | null;
};

async function loadOpenTasks(assignees: string[] | null): Promise<TaskRow[]> {
  let q = supabase
    .from("tasks")
    .select("id, title, due_date, assignee_id, board_id, board_columns(name, is_done, is_not_doing), boards(slug)")
    .eq("status", "open")
    .is("archived_at", null)
    .not("board_id", "is", null)
    .limit(2000);
  if (assignees) q = q.in("assignee_id", assignees);
  const { data, error } = await q;
  if (error) throw new Error(`tasks: ${error.message}`);
  return ((data ?? []) as unknown as TaskRow[]).filter((t) => !t.board_columns?.is_done && !t.board_columns?.is_not_doing);
}

// Cards finished in the last 14 days, so the Done column shows recent wins
// without growing forever.
async function loadRecentDone(personId: string, today: string): Promise<TaskRow[]> {
  const since = new Date(Date.parse(today) - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, due_date, assignee_id, board_id, board_columns!inner(name, is_done, is_not_doing), boards(slug)")
    .eq("assignee_id", personId)
    .eq("board_columns.is_done", true)
    .gte("completed_at", since)
    .is("archived_at", null)
    .order("completed_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`done tasks: ${error.message}`);
  return (data ?? []) as unknown as TaskRow[];
}

// One row per board member this fiscal year: their goal, its status and their
// open and overdue cards, off track first. Shown on Chair Reports and on the
// President's and chapter manager's home.
async function buildChairReports(seats: BoardSeat[], goals: KrRow[], today: string): Promise<ReportRow[]> {
  const people = [...new Set(seats.map((s) => s.personId))];
  const tasks = await loadOpenTasks(people);
  const rows = people.map((pid) => {
    const held = seats.filter((s) => s.personId === pid);
    const g = goals.find((k) => k.accountable_person_id === pid);
    const open = tasks.filter((t) => t.assignee_id === pid);
    return {
      personId: pid,
      name: held[0].name,
      roles: held.map((s) => s.roleName),
      goal: g ? toGoal(g) : null,
      openCards: open.length,
      overdueCards: open.filter((t) => t.due_date && t.due_date < today).length,
    };
  });
  const rank: Record<string, number> = { off_track: 0, at_risk: 1, on_track: 2, done: 3 };
  return rows.sort((a, b) => (rank[a.goal?.status ?? "x"] ?? 4) - (rank[b.goal?.status ?? "x"] ?? 4));
}

export async function loadChairReports(): Promise<ReportRow[]> {
  const fyStart = currentFyStart();
  const [seats, goals] = await Promise.all([loadBoardSeats(fyStart), loadGoals(fyStart)]);
  return buildChairReports(seats, goals, chapterToday());
}

export type BoardHome = {
  viewer: BoardViewer;
  today: string;
  goal: Goal | null;
  cards: Card[];
  reports: ReportRow[] | null; // President and chapter manager
  accountability: { overdueCards: number; issuesOpen60: number; missingGoalReadings: number } | null; // chapter manager
};

export async function loadBoardHome(
  personId: string | null,
  fallbackName: string | null,
  previewAs: string | null,
): Promise<BoardHome> {
  const fyStart = currentFyStart();
  const today = chapterToday();
  const seats = await loadBoardSeats(fyStart);
  let viewer = await loadBoardViewer(personId, fallbackName, seats);

  // A super admin can preview another role: ?as=president, ?as=manager or a
  // chair key such as ?as=membership. The page shows that seat's data.
  if (previewAs) {
    const seat = seats.find((s) => s.roleKey === previewAs);
    if (previewAs === "manager") {
      viewer = { ...viewer, personId: null, roleKeys: ["manager"], roleNames: ["Chapter manager"], isPresident: false, isManager: true };
    } else if (seat) {
      const held = seats.filter((s) => s.personId === seat.personId);
      viewer = {
        personId: seat.personId,
        firstName: seat.name.split(" ")[0],
        roleKeys: held.map((s) => s.roleKey),
        roleNames: held.map((s) => s.roleName),
        isPresident: held.some((s) => s.roleKey === "president"),
        isManager: false,
      };
    }
  }

  const goals = await loadGoals(fyStart);
  const mine = viewer.personId ? goals.find((g) => g.accountable_person_id === viewer.personId) : undefined;

  const myTasks = viewer.personId ? await loadOpenTasks([viewer.personId]) : [];
  const recentDone = viewer.personId ? await loadRecentDone(viewer.personId, today) : [];
  const toCard = (t: TaskRow, stage: CardStage): Card => ({
    id: t.id,
    title: t.title,
    dueDate: t.due_date,
    overdue: stage !== "done" && Boolean(t.due_date && t.due_date < today),
    column: t.board_columns?.name ?? null,
    boardSlug: t.boards?.slug ?? null,
    boardId: t.board_id,
    stage,
  });
  const cards: Card[] = [
    ...myTasks
      .map((t) => toCard(t, !t.board_columns || t.board_columns.name === "To do" ? "todo" : "doing"))
      .sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")),
    ...recentDone.map((t) => toCard(t, "done")),
  ];

  let reports: ReportRow[] | null = null;
  let accountability: BoardHome["accountability"] = null;
  if (viewer.isPresident || viewer.isManager) reports = await buildChairReports(seats, goals, today);
  if (viewer.isManager && reports) {
    const cutoff = new Date(Date.parse(today) - 60 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("issues")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "solving"])
      .lt("created_at", cutoff);
    accountability = {
      overdueCards: reports.reduce((n, r) => n + r.overdueCards, 0),
      issuesOpen60: count ?? 0,
      missingGoalReadings: reports.filter((r) => !r.goal || !r.goal.measured).length,
    };
  }

  return { viewer, today, goal: mine ? toGoal(mine) : null, cards, reports, accountability };
}
