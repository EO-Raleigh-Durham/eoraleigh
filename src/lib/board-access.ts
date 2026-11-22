// Derive board-tier access from board appointments.
//
// A person who currently holds a Chair or Co-Chair appointment gets board
// access automatically, so we never have to double-enter "title" (an
// appointment) and "access" (user_profiles.role) by hand. This module is
// dependency-free apart from the supabase client passed in, so it is safe to
// call from both the node server (service-role client) and the edge proxy
// (request-scoped anon client).

import { currentFyStart } from "./fiscal-year.ts";

type QueryResult<T> = { data: T | null };
type BoardQuery = PromiseLike<QueryResult<unknown>> & {
  order: (column: string, options: { ascending: boolean }) => BoardQuery;
  eq: (column: string, value: string | number) => BoardQuery;
  lte: (column: string, value: number) => BoardQuery;
  in: (column: string, values: readonly string[]) => BoardQuery;
  limit: (count: number) => BoardQuery;
};
export type BoardAccessClient = {
  from: (table: string) => {
    select: (cols: string) => BoardQuery;
  };
};

const BOARD_POSITIONS = ["Chair", "Co-Chair"] as const;

/**
 * The board term in force today: the latest fiscal_year_start on record that
 * has already begun (EO fiscal year, Jul 1 to Jun 30). Terms dated in the
 * future are ignored, so entering next year's board early (or a mistaken
 * future-dated row) cannot take access away from the sitting chairs. Before a
 * new year's board is entered, the previous term stays in force.
 */
export async function currentBoardTerm(
  client: BoardAccessClient,
  todayFy: number = currentFyStart(),
): Promise<number | null> {
  const { data: latest } = (await client
    .from("board_appointments")
    .select("fiscal_year_start")
    .lte("fiscal_year_start", todayFy)
    .order("fiscal_year_start", { ascending: false })
    .limit(1)) as QueryResult<{ fiscal_year_start: number }[]>;

  return latest?.[0]?.fiscal_year_start ?? null;
}

/**
 * True if the person holds a Chair or Co-Chair appointment in the board term
 * in force today (see currentBoardTerm).
 */
export async function hasCurrentBoardAppointment(
  client: BoardAccessClient,
  personId: string,
  todayFy?: number,
): Promise<boolean> {
  if (!personId) return false;

  const fy = await currentBoardTerm(client, todayFy);
  if (fy == null) return false;

  const { data } = (await client
    .from("board_appointments")
    .select("id")
    .eq("person_id", personId)
    .eq("fiscal_year_start", fy)
    .in("position", BOARD_POSITIONS as unknown as string[])
    .limit(1)) as QueryResult<{ id: string }[]>;

  return Array.isArray(data) && data.length > 0;
}
