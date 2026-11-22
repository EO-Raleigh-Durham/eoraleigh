import { supabase } from "@/lib/supabase";
import { getAllChapterMetrics, type ChapterMetric } from "@/lib/chapter-metrics";
import { eventSalesUsd, liveRevenue, type EventPayment, type RevenueBreakdown } from "@/lib/chapter-revenue";
import { cashOf } from "@/lib/sap-pipeline";
import { getActiveMemberCount } from "@/lib/people";
import {
  getAllSapPartners,
  computeSapStats,
  type SapStats,
  type SapDealType,
} from "@/lib/sap";
import {
  getEvents,
  getRsvpCounts,
  eventTypeLabel,
  eventScope,
  EVENT_TYPE_ORDER,
  type EventType,
} from "@/lib/events";
import { listForums } from "@/lib/forums";
import {
  fyWindow,
  currentFyStart,
  delta,
  type KpiDelta,
} from "@/lib/fiscal-year";
import {
  summarizeFeedbackRatings,
  type FeedbackRatings,
} from "@/lib/event-feedback";

// KpiDelta is re-exported so existing importers (@/lib/chapter-overview) work.
export type { KpiDelta };

// ============================================================
// Chapter overview ("State of the Chapter") data loader.
//
// Assembles the board-level fiscal-year dashboard from three
// existing sources:
//   chapter_metrics   -> the KPI spine + 9-year history
//   sap_deals         -> the SAP pipeline (new in FY25/26)
//   survey_responses  -> Transformational Growth Pulse sentiment
//                        + renewal intent for the current FY
//
// EO's fiscal year runs Jul 1 -> Jun 30. fiscal_year_start is the
// calendar year the FY begins (2025 => FY25/26 => Jul 2025-Jun 2026),
// and is the canonical sort key. The "current" FY is simply the row
// with the highest fiscal_year_start.
//
// Server-only: imports the secret-key Supabase client. Never import
// from a client component.
// ============================================================

const PULSE_SURVEY_SLUG = "transformational-growth-pulse";

// The numeric KPI fields we compute a year-over-year delta for.
export const KPI_FIELDS = [
  "members",
  "revenue_usd",
  "revenue_per_member_usd",
  "retention_pct",
  "forum_count",
  "eo_grants_usd",
  "sap_usd",
] as const;

export type KpiField = (typeof KPI_FIELDS)[number];

export type RenewalIntent = {
  answered: number; // responses with a non-null will_renew in the FY window
  willRenew: number;
  pct: number | null; // % who plan to renew
};

export type PulseSummary = {
  responses: number;
  avgRating: number | null; // mean of the 1-5 transformational-growth rating
  highSatPct: number | null; // % rated 4 or 5
};

export type WonPartner = {
  name: string;
  tier: SapDealType | null;
  amountUsd: number;
  discountNote: string | null;
};

export type EventTypeCount = { type: EventType; label: string; count: number };

export type TopEvent = {
  title: string;
  startsAt: string;
  type: EventType;
  attendees: number;
};

export type EventsSummary = {
  held: number; // chapter (local) events in the FY window, excluding draft/cancelled
  attendance: number; // sum of registered + attended across those events
  avgAttendance: number | null;
  byType: EventTypeCount[];
  eventValue: {
    average: number | null; // current event-value question, 1-5
    responses: number;
  };
  growth: {
    average: number | null; // historical transformational-growth question, 1-5
    responses: number;
  };
  topEvents: TopEvent[];
};

export type ChapterOverview = {
  current: ChapterMetric | null;
  prior: ChapterMetric | null;
  history: ChapterMetric[]; // ascending by fiscal_year_start
  deltas: Partial<Record<KpiField, KpiDelta>>;
  sap: SapStats;
  wonPartners: WonPartner[];
  renewal: RenewalIntent | null;
  pulse: PulseSummary | null;
  events: EventsSummary | null;
  /** How the live fiscal year's revenue adds up; null for recorded years. */
  revenue: RevenueBreakdown | null;
  loadedAt: string;
};

function computeDeltas(
  current: ChapterMetric | null,
  prior: ChapterMetric | null,
): Partial<Record<KpiField, KpiDelta>> {
  const out: Partial<Record<KpiField, KpiDelta>> = {};
  if (!current) return out;
  for (const field of KPI_FIELDS) {
    out[field] = delta(current[field], prior ? prior[field] : null);
  }
  return out;
}

type PulseRow = {
  rating: number | null;
  will_renew: boolean | null;
  submitted_at: string;
};

// One focused read of the Pulse responses inside the FY window. Returns
// null if the survey is not seeded so the page can hide the panel.
async function loadPulseWindow(
  start: string,
  end: string,
): Promise<{ pulse: PulseSummary; renewal: RenewalIntent } | null> {
  const { data: survey, error: surveyErr } = await supabase
    .from("surveys")
    .select("id")
    .eq("slug", PULSE_SURVEY_SLUG)
    .maybeSingle();
  if (surveyErr || !survey) {
    if (surveyErr) console.warn("loadPulseWindow survey:", surveyErr.message);
    return null;
  }

  const { data, error } = await supabase
    .from("survey_responses")
    .select("rating, will_renew, submitted_at")
    .eq("survey_id", (survey as { id: string }).id)
    .gte("submitted_at", start)
    .lt("submitted_at", end);
  if (error) {
    console.warn("loadPulseWindow responses:", error.message);
    return null;
  }

  const rows = (data ?? []) as PulseRow[];

  const ratings = rows
    .map((r) => r.rating)
    .filter((r): r is number => r !== null);
  const high = ratings.filter((r) => r >= 4).length;
  const avg = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) /
      100
    : null;

  const answered = rows.filter((r) => r.will_renew !== null);
  const willRenew = answered.filter((r) => r.will_renew === true).length;

  return {
    pulse: {
      responses: rows.length,
      avgRating: avg,
      highSatPct: ratings.length
        ? Math.round((high / ratings.length) * 100)
        : null,
    },
    renewal: {
      answered: answered.length,
      willRenew,
      pct: answered.length
        ? Math.round((willRenew / answered.length) * 100)
        : null,
    },
  };
}

// Live operational view of the events held this fiscal year. Returns null
// if no non-draft events fall in the window so the page can hide the panel.
async function loadEventsSummary(
  start: string,
  end: string,
): Promise<EventsSummary | null> {
  const events = await getEvents({
    after: new Date(start),
    before: new Date(end),
  });
  // EO Global and regional events (scope 'global') are listed for members
  // but are not chapter events, so they never count toward the KPI.
  const held = events.filter(
    (e) =>
      e.status !== "draft" &&
      e.status !== "cancelled" &&
      eventScope(e) === "local",
  );
  if (held.length === 0) return null;

  const ids = held.map((e) => e.id);
  const rsvp = await getRsvpCounts(ids);
  const attendance = Object.values(rsvp).reduce((a, b) => a + b, 0);

  // Keep the current event-value question separate from the historical
  // transformational-growth question. Combining the two would make the
  // chapter KPI look continuous even though the underlying question changed.
  let feedbackRatings = summarizeFeedbackRatings([]);
  const { data: fb, error: fbErr } = await supabase
    .from("event_feedback")
    .select("event_value_rating, rating_overall")
    .in("event_id", ids);
  if (fbErr) {
    console.warn("loadEventsSummary feedback:", fbErr.message);
  } else {
    feedbackRatings = summarizeFeedbackRatings((fb ?? []) as FeedbackRatings[]);
  }

  const byType: EventTypeCount[] = EVENT_TYPE_ORDER.map((type) => ({
    type,
    label: eventTypeLabel(type),
    count: held.filter((e) => e.type === type).length,
  })).filter((t) => t.count > 0);

  const topEvents: TopEvent[] = held
    .map((e) => ({
      title: e.title,
      startsAt: e.starts_at,
      type: e.type,
      attendees: rsvp[e.id] ?? 0,
    }))
    .sort((a, b) => b.attendees - a.attendees)
    .slice(0, 6);

  return {
    held: held.length,
    attendance,
    avgAttendance: held.length ? Math.round(attendance / held.length) : null,
    byType,
    eventValue: feedbackRatings.eventValue,
    growth: feedbackRatings.growth,
    topEvents,
  };
}

// Each active member's start date: dues prorate from it, and joins this year
// owe an initiation fee.
async function loadActiveMemberStartDates(): Promise<(string | null)[]> {
  const { data, error } = await supabase.from("chapter_memberships").select("start_date").eq("status", "active");
  if (error) {
    console.warn("loadActiveMemberStartDates:", error.message);
    return [];
  }
  return ((data ?? []) as { start_date: string | null }[]).map((r) => r.start_date);
}

// Website ticket payments made inside a window, for live event revenue.
async function loadEventPayments(start: string, end: string): Promise<EventPayment[]> {
  const { data, error } = await supabase
    .from("event_registrations")
    .select("amount_paid, price_currency, status, event:events(currency)")
    .gt("amount_paid", 0)
    .gte("paid_at", start)
    .lt("paid_at", end);
  if (error) {
    console.warn("loadEventPayments:", error.message);
    return [];
  }
  type Row = { amount_paid: number; price_currency: string | null; status: string; event: { currency: string | null } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    amountPaid: r.amount_paid,
    currency: r.price_currency ?? r.event?.currency ?? "USD",
    status: r.status,
  }));
}

export async function loadChapterOverview(
  fyStart?: number,
): Promise<ChapterOverview> {
  const [history, partners, liveMembers, forums] = await Promise.all([
    getAllChapterMetrics(),
    getAllSapPartners(),
    getActiveMemberCount(),
    listForums(),
  ]);

  // getAllChapterMetrics returns newest-first; we want oldest-first for charts.
  const sorted = [...history].sort(
    (a, b) => a.fiscal_year_start - b.fiscal_year_start,
  );

  const sap = computeSapStats(partners);

  // Which fiscal year to render: the requested one if it has a recorded row,
  // otherwise the live FY, otherwise the newest year on record. liveFy is the
  // only year whose KPIs get overridden with live relational data (it is the
  // in-progress shell row); recorded prior years show their entered figures.
  const liveFy = currentFyStart();
  const newestFy = sorted.length
    ? sorted[sorted.length - 1].fiscal_year_start
    : null;
  let targetFy = fyStart ?? liveFy;
  if (!sorted.some((m) => m.fiscal_year_start === targetFy)) {
    targetFy = newestFy ?? targetFy;
  }
  const curIdx = sorted.findIndex((m) => m.fiscal_year_start === targetFy);

  // Won partners scoped to the selected fiscal year: active deals whose
  // close-won date falls inside the FY window. Deals with no close-won date
  // recorded belong to no year, so a still-active deal won in a prior year
  // cannot bleed into another year's list or cash total. The funnel (sap)
  // stays a live pipeline snapshot.
  const fyWin = fyWindow(targetFy);
  const wonPartners: WonPartner[] = partners
    .filter(
      (p) =>
        p.deal.status === "active" &&
        p.deal.closed_won_at !== null &&
        p.deal.closed_won_at >= fyWin.start &&
        p.deal.closed_won_at < fyWin.end,
    )
    .map((p) => ({
      name: p.company.name,
      tier: p.deal.deal_type,
      amountUsd: p.deal.amount_usd ?? 0,
      discountNote: p.deal.discount_note,
    }))
    .sort((a, b) => b.amountUsd - a.amountUsd);

  // Load the selected year's window data (pulse + events) before applying KPI
  // overrides, since the events count feeds chapter_events.
  let pulse: PulseSummary | null = null;
  let renewal: RenewalIntent | null = null;
  let events: EventsSummary | null = null;
  if (curIdx >= 0) {
    const { start, end } = fyWindow(sorted[curIdx].fiscal_year_start);
    const [windowData, eventsSummary] = await Promise.all([
      loadPulseWindow(start, end),
      loadEventsSummary(start, end),
    ]);
    if (windowData) {
      pulse = windowData.pulse;
      renewal = windowData.renewal;
    }
    events = eventsSummary;
  }

  // Override the current fiscal year's KPIs that have a relational source of
  // truth, so the KPI strip, hero, deltas, and trend charts reflect live data
  // instead of the hand-entered chapter_metrics figures:
  //   members        -> chapter_memberships (active count)
  //   chapter_events -> local events this FY (non-draft / non-cancelled)
  //   sap_usd        -> sap_deals closed-won inside this FY window
  //   revenue_usd, revenue_per_member_usd -> chapter-revenue.ts (dues prorated
  //                     from join month, initiation fees, grants, SAP cash, tickets)
  //   forum_count    -> forums table (current peer groups)
  // Only the live, in-progress FY is overridden. Prior years keep their
  // recorded figures. Revenue and revenue/member are calculated (below); KPIs
  // with no relational source (reserves, EO grants, retention, the dues rate)
  // stay exactly as the board entered them.
  let revenue: RevenueBreakdown | null = null;
  if (curIdx >= 0 && targetFy === liveFy) {
    const overrides: Partial<ChapterMetric> = {};
    if (liveMembers !== null) overrides.members = liveMembers;
    if (events) overrides.chapter_events = events.held;
    if (forums.length > 0) overrides.forum_count = forums.length;
    // SAP secured this FY: wonPartners is already scoped to the target FY by
    // close-won date (and targetFy === liveFy inside this branch).
    overrides.sap_usd = wonPartners.reduce((s, p) => s + p.amountUsd, 0);
    // Revenue is live too: dues (members x the board's dues rate) + EO grants
    // + SAP cash won this FY (in-kind is not revenue) + website ticket sales.
    const sapCash = partners
      .filter(
        (p) =>
          p.deal.status === "active" &&
          p.deal.closed_won_at !== null &&
          p.deal.closed_won_at >= fyWin.start &&
          p.deal.closed_won_at < fyWin.end,
      )
      .reduce(
        (sum, p) =>
          sum + cashOf({ amount_usd: p.deal.amount_usd ?? 0, cash_usd: p.deal.cash_usd ?? null, in_kind_usd: p.deal.in_kind_usd ?? null }),
        0,
      );
    // Without a dues rate the live total would leave out dues entirely, so the
    // recorded figures stand until the board sets one.
    if (sorted[curIdx].dues_per_member_usd !== null) revenue = liveRevenue({
      fyStart: targetFy,
      memberStartDates: await loadActiveMemberStartDates(),
      duesRate: sorted[curIdx].dues_per_member_usd,
      initiationFee: sorted[curIdx].initiation_fee_usd,
      grants: sorted[curIdx].eo_grants_usd,
      sapCash,
      events: eventSalesUsd(await loadEventPayments(fyWin.start, fyWin.end)),
    });
    if (revenue) {
      overrides.revenue_usd = revenue.total;
      overrides.revenue_per_member_usd = revenue.perMember;
    }
    sorted[curIdx] = { ...sorted[curIdx], ...overrides };
  }

  const current = curIdx >= 0 ? sorted[curIdx] : null;
  const prior = curIdx > 0 ? sorted[curIdx - 1] : null;

  return {
    current,
    prior,
    history: sorted,
    deltas: computeDeltas(current, prior),
    sap,
    wonPartners,
    renewal,
    pulse,
    events,
    revenue,
    loadedAt: new Date().toISOString(),
  };
}
