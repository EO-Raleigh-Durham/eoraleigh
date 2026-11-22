// Pure rules for the board tracker's monthly goal update: how a goal's status
// follows from its value, and the Forum goal's average. No I/O, so tests run
// without a database.

export type KrStatus = "on_track" | "at_risk" | "off_track" | "done";

// How a goal moves through the year.
//   cumulative: counts up from zero over the fiscal year (prospects added,
//               revenue, partner cash). Judged against where it should be by now.
//   level:      a standing number judged against the target at any point
//               (engagement %, events per member, Learning rating).
//   growth:     a level that starts the year at a baseline and should reach the
//               target by 30 June (members). Judged against the straight line.
//   ceiling:    lower is better, target is a maximum (forum days).
export type GoalMode =
  | { kind: "cumulative" }
  | { kind: "level" }
  | { kind: "growth"; baseline: number }
  | { kind: "ceiling" };

// Share of the fiscal year (1 Jul to 30 Jun) gone by `today`, 0 to 1.
export function fiscalYearElapsed(today: string, fyStart: number): number {
  const start = Date.UTC(fyStart, 6, 1);
  const end = Date.UTC(fyStart + 1, 6, 1);
  const [y, m, d] = today.split("-").map(Number);
  const now = Date.UTC(y, m - 1, d);
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

export function goalStatus(value: number, target: number, mode: GoalMode, elapsed: number): KrStatus {
  if (mode.kind === "ceiling") {
    if (value <= target) return "on_track";
    return value <= target * 1.2 ? "at_risk" : "off_track";
  }
  if (value >= target) return "done";
  let expected = target;
  if (mode.kind === "cumulative") expected = target * elapsed;
  if (mode.kind === "growth") expected = mode.baseline + (target - mode.baseline) * elapsed;
  if (expected <= 0) return "on_track";
  const ratio = value / expected;
  if (ratio >= 1) return "on_track";
  return ratio >= (mode.kind === "level" ? 0.9 : 0.8) ? "at_risk" : "off_track";
}

export type ForumMember = {
  clockStart: string | null; // forum_clock_start_on, else membership start
  forumStatus: string | null;
  placedOn: string | null;
  primary: boolean;
};

const DAY = 24 * 60 * 60 * 1000;
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);

// Average days from joining to forum placement for members who joined in the
// last 365 days and want a forum. Secondary members, members in another
// chapter's forum and members who chose no forum are left out. A member not
// yet placed counts up to today; a placed member without a date is left out
// (and counted in `undated`) rather than guessed.
export function forumDaysAverage(
  members: ForumMember[],
  today: string,
): { average: number | null; counted: number; undated: number } {
  const since = new Date(Date.parse(today) - 365 * DAY).toISOString().slice(0, 10);
  let total = 0;
  let counted = 0;
  let undated = 0;
  for (const m of members) {
    if (!m.primary || !m.clockStart || m.clockStart < since || m.clockStart > today) continue;
    if (m.forumStatus === "no_forum" || m.forumStatus === "other_chapter") continue;
    if (m.forumStatus === "placed") {
      if (!m.placedOn) {
        undated += 1;
        continue;
      }
      total += Math.max(0, days(m.clockStart, m.placedOn));
    } else {
      total += days(m.clockStart, today);
    }
    counted += 1;
  }
  return { average: counted ? Math.round(total / counted) : null, counted, undated };
}
