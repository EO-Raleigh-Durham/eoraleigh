import { supabase } from "./supabase";
import { calendarQuartersFrom } from "@/lib/fiscal-year";

// Server-only data loader for the Transformational Growth Pulse dashboard.
// Reads from surveys / survey_responses / survey_response_topics and computes
// the same shape that PulseDashboard renders (current quarter, all-time, trends).

const SURVEY_SLUG = "transformational-growth-pulse";

// Curated historical response periods; early data was sparse so the second
// half of 2025 is one combined bucket. Quarters from FY2026/27 onward are
// appended programmatically so the dashboard never goes stale. Call
// pulsePeriods() per request (not memoised) so a long-running server rolls
// into the next quarter on its own.
const PERIOD_BASE = [
  { label: "Q2 2025", start: "2025-04-01", end: "2025-07-01" },
  { label: "Q3-Q4 2025", start: "2025-07-01", end: "2026-01-01" },
  { label: "Q1 2026", start: "2026-01-01", end: "2026-04-01" },
  { label: "Q2 2026", start: "2026-04-01", end: "2026-07-01" },
];

function pulsePeriods() {
  return [...PERIOD_BASE, ...calendarQuartersFrom("2026-07-01")];
}

// Date-range scope for the dashboard. EO fiscal year runs Jul 1 -> Jun 30.
export type PulseRange = "all" | "fy" | "last-fy" | "12m";

export function fyStartYear(d: Date): number {
  return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}

export function fyLabel(startYear: number): string {
  return `FY${startYear}/${String(startYear + 1).slice(2)}`;
}

function rangeWindow(
  range: PulseRange,
  now: Date,
): { start: number; end: number; label: string } | null {
  if (range === "all") return null;
  if (range === "12m") {
    const start = new Date(now);
    start.setUTCFullYear(start.getUTCFullYear() - 1);
    return { start: start.getTime(), end: now.getTime(), label: "Rolling 12 months" };
  }
  const fy = fyStartYear(now) - (range === "last-fy" ? 1 : 0);
  return {
    start: Date.UTC(fy, 6, 1),
    end: Date.UTC(fy + 1, 6, 1),
    label: fyLabel(fy),
  };
}

export type PulsePeriodStats = {
  label: string;
  responses: number;
  avgRating: number;
  perfectPct: number;
  highSatPct: number;
  starDist: Record<1 | 2 | 3 | 4 | 5, number>; // counts per star
  starPct: Record<1 | 2 | 3 | 4 | 5, number>;  // percentages per star
  topicPct: Array<{ topic: string; pct: number }>;
};

export type PulseQuote = {
  name: string | null;
  comment: string;
  rating: number;
  submittedAt: string;
  topics: string[];
  featured?: boolean;
};

export type PulseDashboardData = {
  allTime: PulsePeriodStats;
  current: PulsePeriodStats;
  byPeriod: PulsePeriodStats[];
  uniqueRespondents: number;
  currentQuotes: PulseQuote[];
  allTimeQuotes: PulseQuote[];
  range: PulseRange;
  rangeLabel: string;
  loadedAt: string;
};

type ResponseRow = {
  id: string;
  rating: number | null;
  comment: string | null;
  submitted_at: string;
  person_id: string | null;
  people: { name: string | null } | null;
  survey_response_topics: Array<{ topic: string }>;
};

function computeStats(label: string, rows: ResponseRow[]): PulsePeriodStats {
  const n = rows.length;
  const ratings = rows.map((r) => r.rating).filter((r): r is number => r !== null);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  const dist: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) {
    if (r >= 1 && r <= 5) dist[r as 1 | 2 | 3 | 4 | 5]++;
  }
  const pctOf = (count: number) => (n > 0 ? Math.round((count / n) * 1000) / 10 : 0);
  const starPct: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: pctOf(dist[1]),
    2: pctOf(dist[2]),
    3: pctOf(dist[3]),
    4: pctOf(dist[4]),
    5: pctOf(dist[5]),
  };

  const perfect = dist[5];
  const highSat = dist[4] + dist[5];

  // Topic % across the period
  const topicCounts = new Map<string, number>();
  for (const r of rows) {
    const seen = new Set<string>();
    for (const t of r.survey_response_topics ?? []) {
      if (!seen.has(t.topic)) {
        topicCounts.set(t.topic, (topicCounts.get(t.topic) ?? 0) + 1);
        seen.add(t.topic);
      }
    }
  }
  const topicPct = Array.from(topicCounts.entries())
    .map(([topic, count]) => ({ topic, pct: Math.round((count / Math.max(n, 1)) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  return {
    label,
    responses: n,
    avgRating: Math.round(avg * 100) / 100,
    perfectPct: Math.round((perfect / Math.max(n, 1)) * 100),
    highSatPct: Math.round((highSat / Math.max(n, 1)) * 100),
    starDist: dist,
    starPct,
    topicPct,
  };
}

function pickQuotes(rows: ResponseRow[], take: number): PulseQuote[] {
  // Prefer 5★ with meaningful comments, then 4★ with longer comments. Sort by date desc
  // for "current" feel.
  const candidates = rows
    .filter((r) => (r.comment ?? "").trim().length >= 30 && r.rating !== null)
    .sort((a, b) => {
      // Prefer higher rating, then longer comment, then more recent
      if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
      const lenDiff = (b.comment?.length ?? 0) - (a.comment?.length ?? 0);
      if (lenDiff !== 0) return lenDiff;
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
    });

  const picked: PulseQuote[] = [];
  const seenComments = new Set<string>();

  for (const r of candidates) {
    if (picked.length >= take) break;
    const comment = (r.comment ?? "").trim();
    // Avoid near-duplicates from the same person
    const key = comment.slice(0, 60).toLowerCase();
    if (seenComments.has(key)) continue;
    seenComments.add(key);

    picked.push({
      name: r.people?.name ?? null,
      comment,
      rating: r.rating ?? 0,
      submittedAt: r.submitted_at,
      topics: (r.survey_response_topics ?? []).map((t) => t.topic),
    });
  }

  if (picked.length > 0) picked[0].featured = true;
  return picked;
}

export async function loadPulseDashboard(
  range: PulseRange = "all",
): Promise<PulseDashboardData | null> {
  const { data: survey, error: surveyErr } = await supabase
    .from("surveys")
    .select("id")
    .eq("slug", SURVEY_SLUG)
    .maybeSingle();
  if (surveyErr || !survey) {
    console.warn("loadPulseDashboard: survey not found", surveyErr?.message);
    return null;
  }

  const { data, error } = await supabase
    .from("survey_responses")
    .select(
      "id, rating, comment, submitted_at, person_id, people(name), survey_response_topics(topic)",
    )
    .eq("survey_id", survey.id)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.warn("loadPulseDashboard: fetch failed", error.message);
    return null;
  }

  const allRows = (data ?? []) as unknown as ResponseRow[];

  // Scope rows and periods to the selected range (null window = all time)
  const win = rangeWindow(range, new Date());
  const rows = win
    ? allRows.filter((r) => {
        const t = Date.parse(r.submitted_at);
        return t >= win.start && t < win.end;
      })
    : allRows;
  const allPeriods = pulsePeriods();
  const periods = win
    ? allPeriods.filter(
        (p) => Date.parse(p.start) < win.end && Date.parse(p.end) > win.start,
      )
    : allPeriods;

  // Bucket by period
  const byPeriod: PulsePeriodStats[] = periods.map((p) => {
    const startMs = Date.parse(p.start);
    const endMs = Date.parse(p.end);
    const filtered = rows.filter((r) => {
      const t = Date.parse(r.submitted_at);
      return t >= startMs && t < endMs;
    });
    return computeStats(p.label, filtered);
  });

  const rangeLabel = win?.label ?? "All time";
  const allTime = computeStats(rangeLabel, rows);
  const current = byPeriod.length > 0 ? byPeriod[byPeriod.length - 1] : allTime;

  const currentRows =
    byPeriod.length > 0
      ? rows.filter((r) => {
          const t = Date.parse(r.submitted_at);
          return t >= Date.parse(periods[periods.length - 1].start);
        })
      : rows;

  const uniquePeople = new Set(
    rows.map((r) => r.person_id).filter((id): id is string => !!id),
  );

  return {
    allTime,
    current,
    byPeriod,
    uniqueRespondents: uniquePeople.size,
    currentQuotes: pickQuotes(currentRows, 7),
    allTimeQuotes: pickQuotes(rows, 10),
    range,
    rangeLabel,
    loadedAt: new Date().toISOString(),
  };
}
