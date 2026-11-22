// The chapter app's version of edge8-web's entities/team/lib/company-goals.ts
// (EO-owned): the chapter goals roll-up. The fiscal year's objectives (the
// chapter priorities) and key results come through org's door; what ladders up
// to them is each chair seat's goals (board_priorities, keyed to the board
// appointment), not edge8's personal coaching goals. There is no personal goal
// layer in the chapter: a goal belongs to a seat, and staff work rolls up to a
// chair's goal as cards (Dave, 2026-10-12).
//
// The pure roll-up below is edge8's unchanged: a board appointment plays the
// part of a team member holding one "profile", and the board role plays the
// department, so the groupings and their tests carry over as they are.
import { companyOs } from "@/kernel/data/supabase";
import {
  KR_SELECT,
  OBJECTIVE_SELECT,
  BRAND_LABELS,
  currentQuarter,
  objectiveCode,
  personInitials,
  type KrRow,
  type ObjectiveGroup,
  type ObjectiveWithKrs,
  type LadderedPerson,
  type ObjectiveRow,
  type PersonGroup,
  fiscalYearPacePct,
  getNeverMeasuredKeyResults,
  selectKeyResults,
  selectObjectives,
} from "@/entities/org";
import { one } from "@/kernel/config/embedded";
import { NAME_COLUMNS, type NamedPerson, personName } from "@/kernel/config/people-name";

// Shared derivation for the Company Goals view (/team/company-goals and the
// admin Company section). Same data as /admin/edges/goals but flattened: the
// company-level objectives with their key results, plus every active employee's
// FAST goals laddered back to the company objective each ultimately serves.
export type { ObjectiveWithKrs, LadderedPerson };

export type CompanyGoals = {
  quarter: ReturnType<typeof currentQuarter>;
  tree: ObjectiveWithKrs[];
  initialsById: Record<string, string>;
  ladderedByKr: Record<string, LadderedPerson[]>;
  // Company key results nobody has measured yet (K.78): they read "Not measured
  // yet" and stay out of their objective's percent (G.14).
  unmeasuredKrIds: string[];
  // Share of the goal year gone, 0-100: the pace marker on each bar.
  pacePct: number;
  byPerson: PersonGroup[];
  byObjective: ObjectiveGroup[];
  withGoal: number;
  // The board roles the roster spans (edge8's "departments"), for the filter.
  departments: { id: string; name: string }[];
  // Every seat's goals in display order, for the chair goals editor.
  chairGoals: ChairGoal[];
};

// One chair goal as the editor lists it: the seat it belongs to and the rung
// it ladders to, if any.
export type ChairGoal = {
  id: string;
  appointmentId: string;
  roleKey: string;
  roleName: string;
  roleSort: number;
  personName: string;
  position: number;
  title: string;
  detail: string | null;
  objectiveId: string | null;
  keyResultId: string | null;
};

// The two row shapes the rollup below works over. They are the selects in
// getCompanyGoals, named here so the pure functions can be exercised without a
// database.
type PersonEmbed = NamedPerson & { avatar_url?: string | null };
type ProfileEmbed = { id: string };
type DepartmentEmbed = { id: string; name: string };
export type RosterRow = {
  id: string;
  people: PersonEmbed | PersonEmbed[] | null;
  coaching_profiles: ProfileEmbed | ProfileEmbed[] | null;
  departments?: DepartmentEmbed | DepartmentEmbed[] | null;
};
export type TeamGoalRow = {
  coaching_profile_id: string;
  title: string;
  objective_id: string | null;
  key_result_id: string | null;
};

// A goal already attached to its owner and its company objective. Both
// groupings below derive from a list of these.
export type ResolvedGoal = LadderedPerson & {
  goalTitle: string;
  ladder: string | null;
  objId: string | null;
};

// The lookup tables the ladder walk needs, built once from the quarter's rows.
export type LadderIndex = {
  objById: Map<string, Pick<ObjectiveRow, "id" | "level" | "parent_kr_id">>;
  krObjective: Map<string, string>;
  companyObjectiveIds: Set<string>;
};

// PostgREST embeds arrive as an object or a one-element array; `one` handles the
// to-one case, and this is the to-many counterpart (no kernel equivalent).
const many = <T,>(e: T | T[] | null): T[] => (Array.isArray(e) ? e : e ? [e] : []);

export function buildLadderIndex(
  objectives: Pick<ObjectiveRow, "id" | "level" | "parent_kr_id">[],
  allKrs: Pick<KrRow, "id" | "objective_id">[],
  companyObjectiveIds: Set<string>,
): LadderIndex {
  return {
    objById: new Map(objectives.map((o) => [o.id, o] as const)),
    krObjective: new Map(allKrs.map((kr) => [kr.id, kr.objective_id] as const)),
    companyObjectiveIds,
  };
}

// Resolve a goal to the COMPANY objective it ultimately ladders to, or null.
// A KR resolves to its objective; a lower-level objective rolls up through its
// parent KR. Anything that doesn't land on a company objective (no ladder, or
// an orphan) returns null. The guard bounds a parent_kr_id cycle: a malformed
// tree would otherwise spin here forever, and 10 is far deeper than any real
// objective hierarchy.
export function resolveCompanyObjectiveId(g: TeamGoalRow, idx: LadderIndex): string | null {
  let objId: string | null = null;
  if (g.key_result_id) objId = idx.krObjective.get(g.key_result_id) ?? null;
  else if (g.objective_id) objId = g.objective_id;
  for (let guard = 0; objId && guard < 10; guard++) {
    const obj = idx.objById.get(objId);
    if (!obj || obj.level === "company") break;
    objId = obj.parent_kr_id ? idx.krObjective.get(obj.parent_kr_id) ?? null : null;
  }
  return objId && idx.companyObjectiveIds.has(objId) ? objId : null;
}

// profile -> the member who owns it (a member may hold more than one profile).
export function profileToMember(roster: RosterRow[]): Map<string, LadderedPerson> {
  const out = new Map<string, LadderedPerson>();
  for (const tm of roster) {
    const person = one(tm.people);
    const name = personName(one(tm.people), "Unknown");
    for (const p of many(tm.coaching_profiles))
      out.set(p.id, { teamMemberId: tm.id, name, avatarUrl: person?.avatar_url ?? null, departmentId: one(tm.departments ?? null)?.id ?? null });
  }
  return out;
}

// One row per roster member, alphabetical, carrying only that member's goals.
export function groupByPerson(roster: RosterRow[], resolved: ResolvedGoal[]): PersonGroup[] {
  return roster
    .map((tm) => ({
      teamMemberId: tm.id,
      name: personName(one(tm.people), "Unknown"),
      departmentId: one(tm.departments ?? null)?.id ?? null,
      goals: resolved
        .filter((r) => r.teamMemberId === tm.id)
        .map((r) => ({ title: r.goalTitle, ladder: r.ladder })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// One card per company objective, plus a trailing catch-all for the goals that
// never resolved to one (only when there are any).
export function groupByObjective(tree: ObjectiveWithKrs[], resolved: ResolvedGoal[]): ObjectiveGroup[] {
  const out: ObjectiveGroup[] = tree.map((o, oi) => ({
    objectiveId: o.id,
    label: `${objectiveCode(oi)} · ${o.title}`,
    lineTag: o.brand ?? "company",
    lineLabel: BRAND_LABELS[o.brand ?? "company"],
    items: resolved
      .filter((r) => r.objId === o.id)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((r) => ({ teamMemberId: r.teamMemberId, name: r.name, departmentId: r.departmentId, goalTitle: r.goalTitle, ladder: r.ladder })),
  }));
  const unaligned = resolved.filter((r) => r.objId === null).sort((a, b) => a.name.localeCompare(b.name));
  if (unaligned.length) {
    out.push({
      objectiveId: null,
      label: "Not yet aligned to a company objective",
      lineTag: "company",
      lineLabel: "",
      items: unaligned.map((r) => ({
        teamMemberId: r.teamMemberId,
        name: r.name,
        departmentId: r.departmentId,
        goalTitle: r.goalTitle,
        ladder: r.ladder,
      })),
    });
  }
  return out;
}

// The chapter's goal tree for a fiscal year with every chair seat's goals
// laddered into it. The current fiscal year by default; a past one shows what
// that board set itself.
export async function getCompanyGoals(fiscalYear?: number): Promise<CompanyGoals> {
  const q = currentQuarter();
  const fy = fiscalYear ?? q.fiscalYearStart;

  const [objRes, krRes, rosterRes, goalsRes] = await Promise.all([
    selectObjectives(OBJECTIVE_SELECT).eq("year", fy).neq("status", "dropped").order("sort_order").order("id"),
    selectKeyResults(KR_SELECT).order("sort_order").order("id"),
    // The seats of the year: every local Chair, with the person holding it
    // and the role it is.
    companyOs
      .from("board_appointments")
      .select(`id, person_id, people:people!person_id(${NAME_COLUMNS}), role:board_roles!board_role_id(key, name, sort_order)`)
      .eq("fiscal_year_start", fy)
      .eq("position", "Chair"),
    companyOs
      .from("board_priorities")
      .select("id, board_appointment_id, position, title, detail, objective_id, key_result_id")
      .order("position"),
  ]);

  const objectives = (objRes.data ?? []) as ObjectiveRow[];
  const allKrs = (krRes.data ?? []) as KrRow[];
  const objectiveIds = new Set(objectives.map((o) => o.id));
  const krs = allKrs.filter((kr) => objectiveIds.has(kr.objective_id));
  const companyObjectives = objectives.filter((o) => o.level === "company");
  const companyObjectiveIds = new Set(companyObjectives.map((o) => o.id));
  const krsByObjective = new Map<string, KrRow[]>();
  for (const kr of krs) {
    krsByObjective.set(kr.objective_id, [...(krsByObjective.get(kr.objective_id) ?? []), kr]);
  }
  const tree: ObjectiveWithKrs[] = companyObjectives.map((o) => ({ ...o, krs: krsByObjective.get(o.id) ?? [] }));
  const unmeasured = await getNeverMeasuredKeyResults(tree.flatMap((o) => o.krs));

  const personIds = Array.from(new Set(tree.flatMap((o) => o.krs.map((kr) => kr.accountable_person_id))));
  const peopleRes = personIds.length
    ? await companyOs.from("people").select(`id, ${NAME_COLUMNS}`).in("id", personIds)
    : { data: [] };
  const initialsById: Record<string, string> = {};
  for (const p of (peopleRes.data ?? []) as ({ id: string } & NamedPerson)[]) {
    initialsById[p.id] = personInitials(personName(p));
  }

  type SeatRow = {
    id: string;
    person_id: string;
    people: PersonEmbed | PersonEmbed[] | null;
    role: { key: string; name: string; sort_order: number } | { key: string; name: string; sort_order: number }[] | null;
  };
  type GoalRow = {
    id: string;
    board_appointment_id: string;
    position: number;
    title: string;
    detail: string | null;
    objective_id: string | null;
    key_result_id: string | null;
  };
  const seats = ((rosterRes.data ?? []) as unknown as SeatRow[])
    .map((s) => ({ ...s, roleOne: one(s.role) }))
    .sort((a, b) => (a.roleOne?.sort_order ?? 0) - (b.roleOne?.sort_order ?? 0));
  const seatIds = new Set(seats.map((s) => s.id));
  const goalRows = ((goalsRes.data ?? []) as GoalRow[]).filter((g) => seatIds.has(g.board_appointment_id));

  // Edge8's shapes: a seat is a roster member holding one profile (the
  // appointment itself), and its role is the department.
  const roster: RosterRow[] = seats.map((s) => ({
    id: s.id,
    people: s.people,
    coaching_profiles: [{ id: s.id }],
    departments: s.roleOne ? { id: s.roleOne.key, name: s.roleOne.name } : null,
  }));
  const teamGoals: TeamGoalRow[] = goalRows.map((g) => ({
    coaching_profile_id: g.board_appointment_id,
    title: g.title,
    objective_id: g.objective_id,
    key_result_id: g.key_result_id,
  }));

  const krLabel = new Map(krs.map((kr) => [kr.id, kr.title] as const));
  const objLabel = new Map(objectives.map((o) => [o.id, o.title] as const));

  const ladderIndex = buildLadderIndex(objectives, allKrs, companyObjectiveIds);
  const memberByProfile = profileToMember(roster);

  // Seats whose goals ladder to each KR, for the avatar stack on the KR row.
  const ladderedByKr: Record<string, LadderedPerson[]> = {};
  for (const g of teamGoals) {
    const krId = g.key_result_id;
    const m = krId ? memberByProfile.get(g.coaching_profile_id) : null;
    if (!krId || !m) continue;
    const list = (ladderedByKr[krId] ??= []);
    if (!list.some((x) => x.teamMemberId === m.teamMemberId)) list.push(m);
  }
  for (const list of Object.values(ladderedByKr)) list.sort((a, b) => a.name.localeCompare(b.name));

  const resolved: ResolvedGoal[] = teamGoals.flatMap((g) => {
    const m = memberByProfile.get(g.coaching_profile_id);
    if (!m) return [];
    const ladder = g.key_result_id
      ? krLabel.get(g.key_result_id) ?? null
      : g.objective_id
        ? objLabel.get(g.objective_id) ?? null
        : null;
    return [{ ...m, goalTitle: g.title, ladder, objId: resolveCompanyObjectiveId(g, ladderIndex) }];
  });

  const byPerson = groupByPerson(roster, resolved);
  const withGoal = byPerson.filter((p) => p.goals.length > 0).length;
  const byObjective = groupByObjective(tree, resolved);
  const departments = seats
    .flatMap((s) => (s.roleOne ? [{ id: s.roleOne.key, name: s.roleOne.name }] : []))
    .filter((d, i, all) => all.findIndex((x) => x.id === d.id) === i);

  const seatById = new Map(seats.map((s) => [s.id, s] as const));
  const chairGoals: ChairGoal[] = goalRows
    .map((g) => {
      const seat = seatById.get(g.board_appointment_id)!;
      return {
        id: g.id,
        appointmentId: seat.id,
        roleKey: seat.roleOne?.key ?? "",
        roleName: seat.roleOne?.name ?? "Board",
        roleSort: seat.roleOne?.sort_order ?? 0,
        personName: personName(one(seat.people), "Unknown"),
        position: g.position,
        title: g.title,
        detail: g.detail,
        objectiveId: g.objective_id,
        keyResultId: g.key_result_id,
      };
    })
    .sort((a, b) => a.roleSort - b.roleSort || a.position - b.position);

  return {
    quarter: q,
    tree,
    initialsById,
    ladderedByKr,
    unmeasuredKrIds: [...unmeasured],
    pacePct: fiscalYearPacePct(fy),
    byPerson,
    byObjective,
    withGoal,
    departments,
    chairGoals,
  };
}
