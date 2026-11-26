// Which board term the public /board-of-directors page shows, and how seats
// become cards. Pure, so it is safe to test and to use anywhere.

export type BoardSeat = {
  personId: string;
  roleKey: string;
  title: string;
  sortOrder: number;
};

export type MergedSeat = {
  personId: string;
  roleKeys: string[];
  title: string; // every seat the person holds, in board order: "Finance Chair, Governance Chair"
  sortOrder: number; // their highest-ranked seat
};

/** One entry per person: someone holding two seats gets one card listing both. */
export function mergeSeatsByPerson(seats: BoardSeat[]): MergedSeat[] {
  const byPerson = new Map<string, BoardSeat[]>();
  for (const s of [...seats].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const list = byPerson.get(s.personId) ?? [];
    list.push(s);
    byPerson.set(s.personId, list);
  }
  return [...byPerson.entries()]
    .map(([personId, list]) => ({
      personId,
      roleKeys: list.map((s) => s.roleKey),
      title: list.map((s) => s.title).join(", "),
      sortOrder: list[0].sortOrder,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * The current fiscal year when it has seats, else the latest past term,
 * else (a new chapter that only has an incoming board) the earliest term on
 * record. Elect seats for next year must not replace the sitting board.
 */
export function pickBoardYear(years: number[], currentFy: number): number | null {
  if (years.length === 0) return null;
  if (years.includes(currentFy)) return currentFy;
  const past = years.filter((y) => y < currentFy);
  if (past.length) return Math.max(...past);
  return Math.min(...years);
}
