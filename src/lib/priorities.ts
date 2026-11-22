import { supabase } from "./supabase";
import { requireMemberOrAbove } from "./auth";

// Server-only loaders for chapter + board-member priorities (/member/priorities).
// Two levels, one fiscal-year convention (fiscal_year_start int, Jul-Jun, same
// as board_appointments). Since migration 106 a chapter priority is an
// `objectives` row (level company, year = fiscal year start) edited at
// /board/goals, and a chair goal (board_priorities) ladders to it directly or
// through one of its key results. The "active" year is the most recent one
// that has priorities, so the page rolls forward automatically each planning
// cycle without depending on today's date. Resilient: missing tables -> empty.

export type Priority = {
  id: string;
  position: number;
  title: string;
  detail: string | null;
};

// A board goal laddered up to a chapter priority (pillar), with its owner.
export type LadderGoal = {
  id: string;
  title: string;
  detail: string | null;
  personName: string;
  roleName: string;
  roleSort: number;
  position: number;
};

// A chapter priority plus the board goals assigned to it (migration 057).
export type ChapterPillar = Priority & { boardGoals: LadderGoal[] };

export type BoardMemberPriorities = {
  personName: string;
  roleName: string;
  roleSort: number;
  priorities: Priority[];
};

export type PrioritySet = {
  fiscalYearStart: number | null;
  fyLabel: string | null;
  pillars: ChapterPillar[]; // the 3, each with its laddered board goals
  board: BoardMemberPriorities[]; // the same goals grouped per board member
};

export function fyLabel(start: number): string {
  const a = String(start).slice(-2);
  const b = String(start + 1).slice(-2);
  return `FY${a}/${b}`;
}

async function activeFiscalYear(): Promise<number | null> {
  const { data, error } = await supabase
    .from("objectives")
    .select("year")
    .eq("level", "company")
    .neq("status", "dropped")
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { year: number }).year;
}

type BoardRow = {
  id: string;
  position: number;
  title: string;
  detail: string | null;
  objective_id: string | null;
  key_result_id: string | null;
  board_appointments: {
    person: { name: string | null; preferred_name: string | null } | null;
    role: { name: string; short_name: string | null; sort_order: number } | null;
  } | null;
};

export async function getPrioritySet(): Promise<PrioritySet> {
  await requireMemberOrAbove();
  const fy = await activeFiscalYear();
  if (fy == null) {
    return { fiscalYearStart: null, fyLabel: null, pillars: [], board: [] };
  }

  const [chapterRes, krRes, boardRes] = await Promise.all([
    supabase
      .from("objectives")
      .select("id, sort_order, title")
      .eq("level", "company")
      .eq("year", fy)
      .neq("status", "dropped")
      .order("sort_order", { ascending: true }),
    supabase.from("key_results").select("id, objective_id"),
    supabase
      .from("board_priorities")
      .select(
        "id, position, title, detail, objective_id, key_result_id, " +
          "board_appointments!inner(fiscal_year_start, " +
          "person:people!inner(name, preferred_name), " +
          "role:board_roles!inner(name, short_name, sort_order))",
      )
      .eq("board_appointments.fiscal_year_start", fy)
      .order("position", { ascending: true }),
  ]);

  const chapterRows: Priority[] = ((chapterRes.data ?? []) as { id: string; sort_order: number; title: string }[]).map((o, i) => ({
    id: o.id,
    position: i + 1,
    title: o.title,
    detail: null,
  }));
  // A goal laddered to a key result belongs to that key result's priority.
  const objectiveOfKr = new Map(
    ((krRes.data ?? []) as { id: string; objective_id: string }[]).map((kr) => [kr.id, kr.objective_id] as const),
  );
  const boardRows = (boardRes.data ?? []) as unknown as BoardRow[];
  const pillarOf = (r: BoardRow) => (r.key_result_id ? objectiveOfKr.get(r.key_result_id) ?? null : r.objective_id);

  const ownerOf = (r: BoardRow) =>
    r.board_appointments?.person?.preferred_name ??
    r.board_appointments?.person?.name ??
    "Board member";

  // Per-chair grouping (one card per board member).
  const groups = new Map<string, BoardMemberPriorities>();
  for (const r of boardRows) {
    const appt = r.board_appointments;
    if (!appt?.person || !appt.role) continue;
    const personName = ownerOf(r);
    const key = `${appt.role.name}::${personName}`;
    let g = groups.get(key);
    if (!g) {
      g = { personName, roleName: appt.role.name, roleSort: appt.role.sort_order, priorities: [] };
      groups.set(key, g);
    }
    g.priorities.push({ id: r.id, position: r.position, title: r.title, detail: r.detail });
  }
  const board = Array.from(groups.values())
    .map((g) => ({ ...g, priorities: g.priorities.sort((a, b) => a.position - b.position) }))
    .sort((a, b) => a.roleSort - b.roleSort || a.personName.localeCompare(b.personName));

  // Pillar grouping (each chapter priority + the board goals laddered to it).
  const pillars: ChapterPillar[] = chapterRows.map((cp) => {
    const boardGoals: LadderGoal[] = boardRows
      .filter((r) => pillarOf(r) === cp.id && r.board_appointments?.role)
      .map((r) => ({
        id: r.id,
        title: r.title,
        detail: r.detail,
        personName: ownerOf(r),
        roleName: r.board_appointments!.role!.name,
        roleSort: r.board_appointments!.role!.sort_order,
        position: r.position,
      }))
      .sort((a, b) => a.roleSort - b.roleSort || a.position - b.position);
    return { ...cp, boardGoals };
  });

  return { fiscalYearStart: fy, fyLabel: fyLabel(fy), pillars, board };
}
