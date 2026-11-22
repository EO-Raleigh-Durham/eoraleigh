// Year-over-year view for Event Metrics: registrations by month against the
// prior fiscal year, a same-point-last-year comparison, and a few highlights.
// Pure: built from the held-event rows summarizeEventMetrics already returns.

import { CHAPTER_TIME_ZONE } from "../kernel/config/chapter.ts";

type TrendEventRow = {
  id: string;
  title: string;
  startsAt: string;
  registered: number;
  eventValueRating: number | null;
  eventValueResponses: number;
};

export type MonthPoint = {
  month: string; // "Jul"
  thisYear: number | null; // null = month not reached yet
  lastYear: number;
};

export type YtdComparison = {
  label: string;
  thisYear: number;
  lastYear: number;
  pct: number | null; // change vs same point last year, rounded
};

export type EventTrends = {
  months: MonthPoint[];
  ytd: YtdComparison[];
  asOf: string; // "20 Nov"
  biggest: { id: string; title: string; registered: number } | null;
  topRated: { id: string; title: string; rating: number; responses: number } | null;
  busiestMonth: { month: string; registered: number } | null;
};

const MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const TOP_RATED_MIN_RESPONSES = 5;

// Fiscal month index 0 (Jul) .. 11 (Jun) in chapter time (fixed UTC+7 offset).
function fiscalMonth(iso: string): number {
  const d = new Date(new Date(iso).getTime() + VN_OFFSET_MS);
  return (d.getUTCMonth() + 6) % 12;
}

function pctChange(now: number, before: number): number | null {
  if (before === 0) return null;
  return Math.round(((now - before) / before) * 100);
}

export function buildEventTrends(
  thisYear: TrendEventRow[],
  lastYear: TrendEventRow[],
  now: Date,
): EventTrends {
  const currentMonth = fiscalMonth(now.toISOString());
  const months: MonthPoint[] = MONTHS.map((month, index) => ({
    month,
    thisYear: index <= currentMonth ? 0 : null,
    lastYear: 0,
  }));
  for (const row of thisYear) {
    const point = months[fiscalMonth(row.startsAt)];
    point.thisYear = (point.thisYear ?? 0) + row.registered;
  }
  for (const row of lastYear) months[fiscalMonth(row.startsAt)].lastYear += row.registered;

  const oneYearAgo = new Date(now);
  oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);
  const lastYearToDate = lastYear.filter(
    (row) => new Date(row.startsAt).getTime() <= oneYearAgo.getTime(),
  );
  const sum = (rows: TrendEventRow[]) => rows.reduce((total, row) => total + row.registered, 0);
  const perEvent = (rows: TrendEventRow[]) =>
    rows.length ? Math.round(sum(rows) / rows.length) : 0;
  const compare = (label: string, a: number, b: number): YtdComparison => ({
    label,
    thisYear: a,
    lastYear: b,
    pct: pctChange(a, b),
  });

  const biggestRow = [...thisYear].sort((a, b) => b.registered - a.registered)[0];
  const topRatedRow = thisYear
    .filter((row) => row.eventValueRating !== null && row.eventValueResponses >= TOP_RATED_MIN_RESPONSES)
    .sort((a, b) => (b.eventValueRating ?? 0) - (a.eventValueRating ?? 0))[0];
  const busiest = months
    .filter((point) => (point.thisYear ?? 0) > 0)
    .sort((a, b) => (b.thisYear ?? 0) - (a.thisYear ?? 0))[0];

  return {
    months,
    ytd: [
      compare("Events held", thisYear.length, lastYearToDate.length),
      compare("Registrations", sum(thisYear), sum(lastYearToDate)),
      compare("People per event", perEvent(thisYear), perEvent(lastYearToDate)),
    ],
    asOf: new Intl.DateTimeFormat("en-GB", {
      timeZone: CHAPTER_TIME_ZONE,
      day: "numeric",
      month: "short",
    }).format(now),
    biggest: biggestRow && biggestRow.registered > 0
      ? { id: biggestRow.id, title: biggestRow.title, registered: biggestRow.registered }
      : null,
    topRated: topRatedRow
      ? {
          id: topRatedRow.id,
          title: topRatedRow.title,
          rating: topRatedRow.eventValueRating as number,
          responses: topRatedRow.eventValueResponses,
        }
      : null,
    busiestMonth: busiest ? { month: busiest.month, registered: busiest.thisYear ?? 0 } : null,
  };
}
