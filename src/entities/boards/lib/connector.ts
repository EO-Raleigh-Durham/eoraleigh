// Server-only. Board access for the chapter connector (src/lib/mcp/
// workboard-tools.ts), which has a bearer token's person rather than a
// website session. The rule is boardActorFor's (./access.ts): a super admin
// may use any board; anyone else only the boards they are a member of
// (isBoardMember: a board_members row, a client staff assignment, or the
// Contractors board), through their team_members row.

import { companyOs } from "@/kernel/data/supabase";
import { mustRows } from "@/kernel/data/read";
import { PORTAL_STATUSES } from "@/kernel/identity/team-statuses";
import { isBoardMember, memberBoardIds, type BoardActor } from "./access";

export type ConnectorPerson = { personId: string; label: string; isAdmin: boolean };

export type ConnectorBoard = { id: string; name: string; slug: string; columns: { id: string; name: string; isDone: boolean }[] };

async function teamMemberIdOf(personId: string): Promise<string | null> {
  const rows = mustRows(
    await companyOs.from("team_members").select("id, status").eq("person_id", personId).in("status", PORTAL_STATUSES),
    "[boards/connector] team_members",
  ) as { id: string; status: string }[];
  return (rows.find((r) => r.status === "active") ?? rows[0])?.id ?? null;
}

/** The person's actor on this board, or null when they may not write it. */
export async function connectorActorFor(boardId: string, person: ConnectorPerson): Promise<BoardActor | null> {
  if (person.isAdmin) return { label: person.label, personId: person.personId, isAdmin: true };
  const teamMemberId = await teamMemberIdOf(person.personId);
  if (!teamMemberId) return null;
  if (!(await isBoardMember(boardId, person.personId, teamMemberId))) return null;
  return { label: person.label, personId: person.personId, isAdmin: false };
}

/** The active boards the person may add cards to, each with its columns in order. */
export async function connectorBoards(person: ConnectorPerson): Promise<ConnectorBoard[]> {
  let qb = companyOs.from("boards").select("id, name, slug").eq("status", "active").is("archived_at", null);
  if (!person.isAdmin) {
    const teamMemberId = await teamMemberIdOf(person.personId);
    if (!teamMemberId) return [];
    const ids = await memberBoardIds(person.personId, teamMemberId);
    if (ids.length === 0) return [];
    qb = qb.in("id", ids);
  }
  const boards = mustRows(await qb.order("sort_order"), "[boards/connector] boards") as { id: string; name: string; slug: string }[];
  if (boards.length === 0) return [];
  const columns = mustRows(
    await companyOs
      .from("board_columns")
      .select("id, board_id, name, is_done, is_not_doing")
      .in("board_id", boards.map((b) => b.id))
      .order("position"),
    "[boards/connector] board_columns",
  ) as { id: string; board_id: string; name: string; is_done: boolean; is_not_doing: boolean }[];
  return boards.map((b) => ({
    ...b,
    columns: columns
      .filter((c) => c.board_id === b.id && !c.is_not_doing)
      .map((c) => ({ id: c.id, name: c.name, isDone: c.is_done })),
  }));
}
