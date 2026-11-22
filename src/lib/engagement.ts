import { supabase } from "@/lib/supabase";
import {
  getEventMetricsForFY,
  currentFyStart,
  fyLabel,
} from "@/lib/event-metrics";
import {
  eventPulseSnapshot,
  type RecentEventScore,
} from "@/lib/event-pulse";
import { calendarQuartersFrom, fyWindow } from "@/lib/fiscal-year";
import { summarizeMemberReach, type MemberReach } from "@/lib/event-metrics-summary";
import { getMemberRoster, type MembershipType } from "@/lib/people";
import { filterSpamLinkedFeedback } from "@/lib/event-registration-review";
import { loadMemberEventAttendance } from "@/lib/member-event-attendance";
import { engagementSignal } from "@/lib/member-signal";

// ============================================================
// Data loader for The Pulse of the Chapter (/board/the-pulse-of-the-chapter).
//
// One screen that puts what members SAY (Transformational Growth Pulse,
// event pulse surveys) next to what they DO (confirmed event attendance), plus a
// per-member engagement ranking over a rolling window. Server-only.
// ============================================================

const PULSE_SLUG = "transformational-growth-pulse";
const ENGAGEMENT_WINDOW_DAYS = 180;
export const NEW_MEMBER_GRACE_DAYS = 30; // never flagged in their first 30 days
const NEW_MEMBER_TRACK_DAYS = 360; // tracked on the new-member list
// Board signal overrides auto-expire after one trend half, so a stale
// opinion cannot mask fresh data. Re-confirm (insert a new row) to extend.
const OVERRIDE_WINDOW_DAYS = 90;
// Activity up to this long before member_since is treated as pre-join guest
// activity (prospects often attend an event before joining); anything older
// marks the join date as an import artifact, not a real start.
const PRE_JOIN_GUEST_DAYS = 90;

type EngagementFeedbackRow = {
  event_id: string;
  person_id: string;
  created_at: string;
  event_value_rating?: number | null;
  person: { email: string } | null;
};

async function excludeSpamLinkedFeedback(
  feedback: EngagementFeedbackRow[],
): Promise<EngagementFeedbackRow[]> {
  const eventIds = [...new Set(feedback.map((row) => row.event_id))];
  if (eventIds.length === 0) return feedback;

  const { data } = await supabase
    .from("event_registrations")
    .select("event_id, person_id, review_classification, person:people!event_registrations_person_id_fkey(email), attendees:event_registration_attendees(email)")
    .in("event_id", eventIds);

  const spamRegistrations = (data ?? []) as unknown as {
    event_id: string;
    person_id: string;
    review_classification: string;
    person: { email: string } | null;
    attendees: { email: string }[];
  }[];

  return filterSpamLinkedFeedback(feedback, spamRegistrations);
}

// Curated historical Pulse survey waves (mirrors src/lib/pulse.ts). Early
// data was sparse, so the second half of 2025 is a single combined bucket.
// Quarters from FY2026/27 onward are appended programmatically so the waves
// never go stale. Call pulseWaves() per request (not memoised at module load)
// so a long-running server rolls into the next quarter on its own.
const PULSE_WAVE_BASE = [
  { label: "Q2 2025", start: "2025-04-01", end: "2025-07-01" },
  { label: "Q3-Q4 2025", start: "2025-07-01", end: "2026-01-01" },
  { label: "Q1 2026", start: "2026-01-01", end: "2026-04-01" },
  { label: "Q2 2026", start: "2026-04-01", end: "2026-07-01" },
];

function pulseWaves() {
  return [...PULSE_WAVE_BASE, ...calendarQuartersFrom("2026-07-01")];
}

export type PulseWaveStat = {
  label: string;
  responses: number;
  avgRating: number | null;
  delta: number | null; // vs previous wave with responses
};

export type MemberEngagement = {
  personId: string;
  name: string;
  eventsAttended: number;
  surveysAnswered: number;
  score: number; // 2 x events attended + 1 x surveys answered
};

export type EngagementTrend = "rising" | "steady" | "falling";

// One renewal signal per member. The rule is in member-signal.ts (Dave,
// 20 Nov 2026): showing up means a chapter event in the last 90 days (forum
// members are healthy by nature and drift without one); sentiment weights the
// Transformational Growth Pulse twice the member's event ratings, and under 4
// is a value risk. New members are never flagged in their first 30 days; their
// first 360 days are tracked on the New Member Engagement list.
export type EngagementSignal =
  | "healthy"
  | "value_risk"
  | "drifting"
  | "at_risk"
  | "new"
  | "quiet";

export const ENGAGEMENT_SIGNAL_LABEL: Record<EngagementSignal, string> = {
  healthy: "Healthy",
  value_risk: "Value risk",
  drifting: "Drifting",
  at_risk: "At risk",
  new: "New",
  quiet: "Quiet",
};

export type MemberEngagementDetail = MemberEngagement & {
  recentScore: number; // newer half of the window
  priorScore: number; // older half of the window
  eventsLast90: number; // chapter events checked in, last 90 days
  trend: EngagementTrend; // vs their own prior half; ±2 (one event) to move
  latestPulse: number | null; // most recent Growth Pulse rating, last 12 months
  pulseDelta: number | null; // latest minus their own previous response
  avgEventRating: number | null; // event feedback they gave in the window
  lastActivityAt: string | null; // most recent check-in or survey in window
  membershipType: MembershipType | null; // secondary members carry a tag
  inForum: boolean;
  isNew: boolean;
  signal: EngagementSignal; // effective signal: board override when one is live
  computedSignal: EngagementSignal; // what the data says, always shown alongside
  overrideNote: string | null; // mandatory note from the board when overridden
  overrideAt: string | null;
};

// Fixed bands so the label means the same thing in every board meeting:
// 4 points is roughly one event plus two surveys.
export type EngagementBand = "inactive" | "low" | "engaged" | "high";

export const ENGAGEMENT_BAND_LABEL: Record<EngagementBand, string> = {
  inactive: "Inactive",
  low: "Low",
  engaged: "Engaged",
  high: "Highly engaged",
};

export function engagementBand(score: number): EngagementBand {
  if (score >= 8) return "high";
  if (score >= 4) return "engaged";
  if (score >= 1) return "low";
  return "inactive";
}

export type ChapterPulse = {
  fyStart: number;
  fyLabel: string;
  // Say: Transformational Growth Pulse
  fyPulseAvg: number | null;
  fyPulseResponses: number;
  waves: PulseWaveStat[];
  // Say: event value and historical growth / Do: check-ins (current FY)
  fyEventValueAvg: number | null;
  fyEventValueResponses: number;
  fyEventGrowthAvg: number | null;
  fyEventGrowthResponses: number;
  fyAttendanceRate: number | null;
  fyAvgEventsPerMember: number | null; // member check-ins at FY events ÷ active members
  fyEventsHeld: number;
  trend: EngagementTrendPoint[]; // monthly per-member engagement, last 12 months
  recentEvents: RecentEventScore[];
  // Do: per-member engagement, rolling window
  windowDays: number;
  activeMemberCount: number;
  members: MemberEngagementDetail[]; // every active member with renewal signal
  graceDays: number; // new-member grace period, for the matrix strips
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) =>
  xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null;

async function loadPulseWaves(fyStart: number): Promise<{
  waves: PulseWaveStat[];
  fyAvg: number | null;
  fyResponses: number;
  fyStart: number;
}> {
  const empty = { waves: [], fyAvg: null, fyResponses: 0, fyStart };

  const { data: survey } = await supabase
    .from("surveys")
    .select("id")
    .eq("slug", PULSE_SLUG)
    .maybeSingle();
  if (!survey) return empty;

  const { data, error } = await supabase
    .from("survey_responses")
    .select("rating, submitted_at")
    .eq("survey_id", survey.id)
    .not("rating", "is", null);
  if (error) {
    console.warn("loadPulseWaves:", error.message);
    return empty;
  }
  const rows = (data ?? []) as { rating: number; submitted_at: string }[];

  const waves: PulseWaveStat[] = [];
  let prevAvg: number | null = null;
  for (const w of pulseWaves()) {
    const inWave = rows.filter(
      (r) => r.submitted_at >= w.start && r.submitted_at < w.end,
    );
    const avg = mean(inWave.map((r) => r.rating));
    waves.push({
      label: w.label,
      responses: inWave.length,
      avgRating: avg,
      delta: avg !== null && prevAvg !== null ? round1(avg - prevAvg) : null,
    });
    if (avg !== null) prevAvg = avg;
  }

  const fyStartIso = `${fyStart}-07-01`;
  const fyEndIso = `${fyStart + 1}-07-01`;
  const fyRows = rows.filter(
    (r) => r.submitted_at >= fyStartIso && r.submitted_at < fyEndIso,
  );
  return {
    waves,
    fyAvg: mean(fyRows.map((r) => r.rating)),
    fyResponses: fyRows.length,
    fyStart,
  };
}

export type MemberEngagementReview = {
  windowDays: number;
  activeMemberCount: number;
  members: MemberEngagementDetail[]; // every active member, sorted by score desc
};

// Per-member engagement over the rolling window: check-ins at events that
// started in the window, plus survey responses (chapter surveys and event
// feedback) submitted in the window. Active members only — on-leave members
// are excluded from every member metric by chapter convention.
//
// Each member also carries the say/do detail: their score split into the
// newer vs older half of the window (the behavior delta), their latest
// Growth Pulse rating with a delta vs their own previous response, the
// average event rating they gave, and the derived renewal signal. New
// members can never read as "falling": an empty prior half makes the delta
// non-negative by construction.
export async function loadMemberEngagementReview(
  windowDays: number = ENGAGEMENT_WINDOW_DAYS,
): Promise<MemberEngagementReview> {
  const now = Date.now();
  const cutoff = new Date(now - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const midCutoff = new Date(now - (windowDays / 2) * 24 * 60 * 60 * 1000).toISOString();

  const roster = (await getMemberRoster()).filter(
    (m) => m.membership_status === "active_member",
  );

  const { data: eventRows } = await supabase
    .from("events")
    .select("id, starts_at")
    .gte("starts_at", cutoff)
    .not("status", "in", '("draft","cancelled")');
  const eventDates = new Map(
    ((eventRows ?? []) as { id: string; starts_at: string }[]).map((e) => [
      e.id,
      e.starts_at,
    ]),
  );
  const eventIds = [...eventDates.keys()];

  const { data: pulseSurvey } = await supabase
    .from("surveys")
    .select("id")
    .eq("slug", PULSE_SLUG)
    .maybeSingle();

  const overrideCutoff = new Date(
    now - OVERRIDE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const [attendanceRows, surveyRes, feedbackRes, pulseRes, overrideRes] =
    await Promise.all([
      eventIds.length
        ? loadMemberEventAttendance({ eventIds })
        : Promise.resolve([]),
      supabase
        .from("survey_responses")
        .select("person_id, submitted_at")
        .gte("submitted_at", cutoff)
        .not("person_id", "is", null),
      supabase
        .from("event_feedback")
        .select("event_id, person_id, created_at, event_value_rating, person:people!event_feedback_person_id_fkey(email)")
        .gte("created_at", cutoff)
        .not("person_id", "is", null),
      pulseSurvey
        ? supabase
            .from("survey_responses")
            .select("person_id, rating, submitted_at")
            .eq("survey_id", (pulseSurvey as { id: string }).id)
            // Only the last 12 months of pulses count toward sentiment.
            .gte("submitted_at", new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString())
            .not("rating", "is", null)
            .not("person_id", "is", null)
            .order("submitted_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase
        .from("member_signal_overrides")
        .select("person_id, signal, note, created_at")
        .gte("created_at", overrideCutoff)
        .order("created_at", { ascending: false }),
    ]);
  const operationalFeedback = await excludeSpamLinkedFeedback(
    (feedbackRes.data ?? []) as unknown as EngagementFeedbackRow[],
  );

  // Latest live override per member (rows expire by the cutoff above).
  const overrides = new Map<
    string,
    { signal: EngagementSignal; note: string; created_at: string }
  >();
  for (const r of (overrideRes.data ?? []) as {
    person_id: string;
    signal: EngagementSignal;
    note: string;
    created_at: string;
  }[]) {
    if (!overrides.has(r.person_id)) overrides.set(r.person_id, r);
  }

  // Per-member tallies, each split at the window midpoint.
  type Halves = { recent: number; prior: number };
  const attended = new Map<string, Halves>();
  const surveys = new Map<string, Halves>();
  const lastActivity = new Map<string, string>();
  const bump = (
    map: Map<string, Halves>,
    personId: string,
    at: string | null,
  ) => {
    if (!at) return;
    const h = map.get(personId) ?? { recent: 0, prior: 0 };
    h[at >= midCutoff ? "recent" : "prior"] += 1;
    map.set(personId, h);
    const seen = lastActivity.get(personId);
    if (!seen || at > seen) lastActivity.set(personId, at);
  };

  for (const r of attendanceRows) {
    bump(attended, r.person_id, r.attended_at);
  }
  for (const r of (surveyRes.data ?? []) as {
    person_id: string;
    submitted_at: string;
  }[]) {
    bump(surveys, r.person_id, r.submitted_at);
  }
  const eventRatings = new Map<string, number[]>();
  for (const r of operationalFeedback) {
    bump(surveys, r.person_id, r.created_at);
    if (r.event_value_rating != null) {
      const xs = eventRatings.get(r.person_id) ?? [];
      xs.push(r.event_value_rating);
      eventRatings.set(r.person_id, xs);
    }
  }

  // Growth Pulse: latest rating + delta vs their own previous response.
  const pulseHistory = new Map<string, number[]>(); // newest first
  for (const r of (pulseRes.data ?? []) as {
    person_id: string;
    rating: number;
  }[]) {
    const xs = pulseHistory.get(r.person_id) ?? [];
    xs.push(r.rating);
    pulseHistory.set(r.person_id, xs);
  }

  const halvesScore = (id: string) => {
    const a = attended.get(id) ?? { recent: 0, prior: 0 };
    const s = surveys.get(id) ?? { recent: 0, prior: 0 };
    return {
      a,
      s,
      recentScore: a.recent * 2 + s.recent,
      priorScore: a.prior * 2 + s.prior,
    };
  };

  // New-member detection: a 30-day grace period during which a member is
  // never flagged. member_since is a bulk-import date for much of the
  // roster, so the join date alone is not trusted: a member is "new" only
  // when they joined within the last 30 days AND nothing was ever recorded
  // for them before the window. The window's prior half is already tallied
  // (priorScore must be 0); anything older needs three existence checks,
  // run only for the few low-score candidates. Beyond 30 days, new members
  // are tracked on the New Member Engagement list for their first 360 days
  // (loadNewMemberEngagement below).
  const graceCutoff = new Date(now - NEW_MEMBER_GRACE_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const candidates = roster.filter((m) => {
    const h = halvesScore(m.id);
    return (
      !!m.member_since &&
      m.member_since >= graceCutoff &&
      h.priorScore === 0 &&
      h.recentScore < 4
    );
  });
  const hasHistory = new Set<string>();
  if (candidates.length) {
    const ids = candidates.map((m) => m.id);
    const [oldSurveys, oldFeedback, oldAttendance] = await Promise.all([
      supabase
        .from("survey_responses")
        .select("person_id")
        .in("person_id", ids)
        .lt("submitted_at", cutoff),
      supabase
        .from("event_feedback")
        .select("event_id, person_id, created_at, person:people!event_feedback_person_id_fkey(email)")
        .in("person_id", ids)
        .lt("created_at", cutoff),
      loadMemberEventAttendance({ personIds: ids, eventStartsBefore: cutoff }),
    ]);
    for (const r of (oldSurveys.data ?? []) as { person_id: string }[]) {
      hasHistory.add(r.person_id);
    }
    const operationalOldFeedback = await excludeSpamLinkedFeedback(
      (oldFeedback.data ?? []) as unknown as EngagementFeedbackRow[],
    );
    for (const r of operationalOldFeedback) {
      hasHistory.add(r.person_id);
    }
    for (const r of oldAttendance) {
      hasHistory.add(r.person_id);
    }
  }
  const newIds = new Set(
    candidates.filter((m) => !hasHistory.has(m.id)).map((m) => m.id),
  );

  const scored: MemberEngagementDetail[] = roster.map((m) => {
    const { a, s, recentScore, priorScore } = halvesScore(m.id);
    const eventsAttended = a.recent + a.prior;
    const surveysAnswered = s.recent + s.prior;
    const score = recentScore + priorScore;
    const delta = recentScore - priorScore;
    const lowScore = score < 4; // under the Engaged band floor
    // Under 4 points the ±2 noise threshold would hide a 2-to-1 collapse,
    // so any decline counts as falling.
    const falling = delta <= -2 || (lowScore && delta < 0);
    const trend: EngagementTrend = falling
      ? "falling"
      : delta >= 2
        ? "rising"
        : "steady";

    const pulses = pulseHistory.get(m.id) ?? [];
    const latestPulse = pulses[0] ?? null;
    const pulseDelta =
      pulses.length >= 2 ? pulses[0] - pulses[1] : null;
    const avgEventRating = mean(eventRatings.get(m.id) ?? []);

    const inForum = !!m.forum_id;
    const isNew = newIds.has(m.id);
    // The rule lives in member-signal.ts (Dave, 20 Nov 2026): an event
    // in the last 90 days, and the pulse (weighted 2x) with event ratings.
    const computedSignal: EngagementSignal = engagementSignal({
      isNew,
      inForum,
      eventsLast90: a.recent, // the newer half of the 180-day window
      eventsLast180: eventsAttended,
      responses: surveysAnswered,
      latestPulse,
      avgEventRating,
    });

    // A live board override wins, but never hides the computed value.
    const override = overrides.get(m.id);

    return {
      personId: m.id,
      name: m.name ?? "Unknown",
      eventsAttended,
      eventsLast90: a.recent,
      surveysAnswered,
      score,
      recentScore,
      priorScore,
      trend,
      latestPulse,
      pulseDelta,
      avgEventRating,
      lastActivityAt: lastActivity.get(m.id) ?? null,
      membershipType: m.membership_type,
      inForum,
      isNew,
      signal: override ? override.signal : computedSignal,
      computedSignal,
      overrideNote: override?.note ?? null,
      overrideAt: override?.created_at ?? null,
    };
  });

  const byScoreDesc = [...scored].sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name),
  );

  return {
    windowDays,
    activeMemberCount: roster.length,
    members: byScoreDesc,
  };
}

export type UpcomingRegistration = {
  id: string;
  title: string;
  startsAt: string;
};

export type PersonEngagement = {
  windowDays: number;
  activeMemberCount: number;
  rank: number | null; // 1-based position in the score ranking; null off-roster
  band: EngagementBand;
  detail: MemberEngagementDetail | null; // null when not an active member
  attendedAllTime: number;
  noShowsAllTime: number;
  earliestAttendedAt: string | null; // first recorded check-in, all time
  upcoming: UpcomingRegistration[];
};

// One member's engagement, derived from the same loadMemberEngagementReview
// call the review page renders, so the two views cannot disagree. Adds the
// member's all-time attendance behavior and upcoming registrations.
export async function loadMemberEngagementForPerson(
  personId: string,
): Promise<PersonEngagement> {
  const review = await loadMemberEngagementReview();
  const idx = review.members.findIndex((m) => m.personId === personId);
  const detail = idx >= 0 ? review.members[idx] : null;

  const [attendance, { data }] = await Promise.all([
    loadMemberEventAttendance({ personIds: [personId] }),
    supabase
      .from("event_registrations")
      .select("status, checked_in_at, events(id, title, starts_at, status)")
      .eq("person_id", personId)
      .neq("review_classification", "spam"),
  ]);
  const regs = (data ?? []) as unknown as {
    status: string;
    checked_in_at: string | null;
    events: { id: string; title: string; starts_at: string; status: string } | null;
  }[];

  const nowIso = new Date().toISOString();
  const attendedAllTime = attendance.length;
  let noShowsAllTime = 0;
  const earliestAttendedAt: string | null = attendance.reduce<string | null>(
    (earliest, row) => !earliest || row.attended_at < earliest ? row.attended_at : earliest,
    null,
  );
  const upcoming: UpcomingRegistration[] = [];
  for (const r of regs) {
    if (r.status === "no_show") {
      noShowsAllTime += 1;
    }
    if (
      r.events &&
      r.events.starts_at > nowIso &&
      r.events.status !== "draft" &&
      r.events.status !== "cancelled" &&
      r.status !== "cancelled"
    ) {
      upcoming.push({
        id: r.events.id,
        title: r.events.title,
        startsAt: r.events.starts_at,
      });
    }
  }
  upcoming.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return {
    windowDays: review.windowDays,
    activeMemberCount: review.activeMemberCount,
    rank: idx >= 0 ? idx + 1 : null,
    band: engagementBand(detail?.score ?? 0),
    detail,
    attendedAllTime,
    noShowsAllTime,
    earliestAttendedAt,
    upcoming,
  };
}

// Confirmed member attendance at this FY's events. Counts only roster members (guests
// excluded), so dividing by the active member count gives a true
// events-per-member average.
async function fyMemberCheckins(
  fyStart: number,
  memberIds: Set<string>,
): Promise<number> {
  const { data: evRows } = await supabase
    .from("events")
    .select("id")
    .gte("starts_at", `${fyStart}-07-01`)
    .lt("starts_at", `${fyStart + 1}-07-01`)
    .not("status", "in", '("draft","cancelled")');
  const eventIds = ((evRows ?? []) as { id: string }[]).map((e) => e.id);
  if (eventIds.length === 0) return 0;

  const attendance = await loadMemberEventAttendance({ eventIds });
  let n = 0;
  for (const r of attendance) {
    if (memberIds.has(r.person_id)) n += 1;
  }
  return n;
}

export type EngagementTrendPoint = {
  month: string; // YYYY-MM
  label: string; // "Jul"
  perMember: number; // engagement points (2x check-ins + 1x surveys) per active member
};

const TREND_MONTHS = 12;

// Monthly chapter engagement per active member: confirmed member attendance (x2) plus
// member survey responses (x1), bucketed by month. Members only — guests are
// excluded so the line is comparable with the per-member score everywhere
// else. The last bucket is the current month to date. Spikes follow the
// event calendar by design.
async function loadEngagementTrend(
  memberIds: Set<string>,
  memberCount: number,
): Promise<EngagementTrendPoint[]> {
  if (memberCount === 0) return [];
  const now = new Date();
  const startDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (TREND_MONTHS - 1), 1),
  );
  const start = startDate.toISOString();

  const { data: evRows } = await supabase
    .from("events")
    .select("id, starts_at")
    .gte("starts_at", start)
    .lte("starts_at", now.toISOString())
    .not("status", "in", '("draft","cancelled")');
  const eventDates = new Map(
    ((evRows ?? []) as { id: string; starts_at: string }[]).map((e) => [
      e.id,
      e.starts_at,
    ]),
  );
  const eventIds = [...eventDates.keys()];

  const [attendanceRows, surveyRes, feedbackRes] = await Promise.all([
    eventIds.length
      ? loadMemberEventAttendance({ eventIds })
      : Promise.resolve([]),
    supabase
      .from("survey_responses")
      .select("person_id, submitted_at")
      .gte("submitted_at", start)
      .not("person_id", "is", null),
    supabase
      .from("event_feedback")
      .select("event_id, person_id, created_at, person:people!event_feedback_person_id_fkey(email)")
      .gte("created_at", start)
      .not("person_id", "is", null),
  ]);
  const operationalFeedback = await excludeSpamLinkedFeedback(
    (feedbackRes.data ?? []) as unknown as EngagementFeedbackRow[],
  );

  const buckets = new Map<string, number>();
  const add = (personId: string, at: string | null | undefined, pts: number) => {
    if (!at || !memberIds.has(personId)) return;
    const key = at.slice(0, 7);
    buckets.set(key, (buckets.get(key) ?? 0) + pts);
  };
  for (const r of attendanceRows) {
    add(r.person_id, r.attended_at, 2);
  }
  for (const r of (surveyRes.data ?? []) as {
    person_id: string;
    submitted_at: string;
  }[]) {
    add(r.person_id, r.submitted_at, 1);
  }
  for (const r of operationalFeedback) {
    add(r.person_id, r.created_at, 1);
  }

  const points: EngagementTrendPoint[] = [];
  for (let i = 0; i < TREND_MONTHS; i++) {
    const d = new Date(
      Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + i, 1),
    );
    const month = d.toISOString().slice(0, 7);
    points.push({
      month,
      label: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      perMember: round1((buckets.get(month) ?? 0) / memberCount),
    });
  }
  return points;
}

export async function loadChapterPulse(
  fyStart: number = currentFyStart(),
): Promise<ChapterPulse> {
  const [pulse, events, engagement] = await Promise.all([
    loadPulseWaves(fyStart),
    getEventMetricsForFY(fyStart),
    loadMemberEngagementReview(),
  ]);

  const memberIds = new Set(engagement.members.map((m) => m.personId));
  const [memberCheckins, trend] = await Promise.all([
    fyMemberCheckins(fyStart, memberIds),
    loadEngagementTrend(memberIds, engagement.activeMemberCount),
  ]);
  const fyAvgEventsPerMember =
    engagement.activeMemberCount > 0
      ? round1(memberCheckins / engagement.activeMemberCount)
      : null;

  const eventPulse = eventPulseSnapshot(events);

  return {
    fyStart,
    fyLabel: fyLabel(fyStart),
    fyPulseAvg: pulse.fyAvg,
    fyPulseResponses: pulse.fyResponses,
    waves: pulse.waves,
    ...eventPulse,
    fyAttendanceRate: events.attendanceRate,
    fyAvgEventsPerMember,
    fyEventsHeld: events.held,
    trend,
    windowDays: engagement.windowDays,
    activeMemberCount: engagement.activeMemberCount,
    members: engagement.members,
    graceDays: NEW_MEMBER_GRACE_DAYS,
  };
}

export type NewMemberStatus = "settling_in" | "no_engagement" | "engaging";

export const NEW_MEMBER_STATUS_LABEL: Record<NewMemberStatus, string> = {
  settling_in: "Settling in",
  no_engagement: "No engagement yet",
  engaging: "Engaging",
};

export type NewMemberRow = {
  personId: string;
  name: string;
  memberSince: string;
  daysAsMember: number;
  eventsAttended: number; // since joining, including pre-join guest window (90 days before)
  surveysAnswered: number; // since joining, including pre-join guest window
  firstActivityAt: string | null; // earliest activity in the guest window or after
  inForum: boolean;
  status: NewMemberStatus;
};

export type NewMemberEngagement = {
  graceDays: number;
  trackDays: number;
  members: NewMemberRow[]; // worst first: no_engagement, settling_in, engaging
};

// Everyone in their first 360 days of membership, with their activity since
// joining. A new member is never flagged in their first 30 days ("settling
// in"); past 30 days with no event attended and no survey answered they are
// called out ("no engagement yet"). member_since is a bulk-import date for
// much of the roster, so members whose recorded activity starts more than
// 90 days before their join date (i.e. long-standing members wearing an
// import date) are excluded; activity within 90 days before joining is
// treated as normal pre-join guest activity.
export async function loadNewMemberEngagement(): Promise<NewMemberEngagement> {
  const now = Date.now();
  const trackCutoff = new Date(now - NEW_MEMBER_TRACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const roster = (await getMemberRoster()).filter(
    (m) => m.membership_status === "active_member",
  );
  const cohort = roster.filter(
    (m) => !!m.member_since && m.member_since >= trackCutoff,
  );
  if (cohort.length === 0) {
    return {
      graceDays: NEW_MEMBER_GRACE_DAYS,
      trackDays: NEW_MEMBER_TRACK_DAYS,
      members: [],
    };
  }

  const ids = cohort.map((m) => m.id);
  const [attendanceRows, surveyRes, feedbackRes] = await Promise.all([
    loadMemberEventAttendance({ personIds: ids }),
    supabase
      .from("survey_responses")
      .select("person_id, submitted_at")
      .in("person_id", ids),
    supabase
      .from("event_feedback")
      .select("event_id, person_id, created_at, person:people!event_feedback_person_id_fkey(email)")
      .in("person_id", ids),
  ]);
  const operationalFeedback = await excludeSpamLinkedFeedback(
    (feedbackRes.data ?? []) as unknown as EngagementFeedbackRow[],
  );

  // Per person: attended event dates + survey dates, all time.
  const eventDates = new Map<string, string[]>();
  for (const r of attendanceRows) {
    const at = r.attended_at;
    const xs = eventDates.get(r.person_id) ?? [];
    xs.push(at);
    eventDates.set(r.person_id, xs);
  }
  const surveyDates = new Map<string, string[]>();
  const bumpSurvey = (pid: string, at: string) => {
    const xs = surveyDates.get(pid) ?? [];
    xs.push(at);
    surveyDates.set(pid, xs);
  };
  for (const r of (surveyRes.data ?? []) as {
    person_id: string;
    submitted_at: string;
  }[]) {
    bumpSurvey(r.person_id, r.submitted_at);
  }
  for (const r of operationalFeedback) {
    bumpSurvey(r.person_id, r.created_at);
  }

  const members: NewMemberRow[] = [];
  for (const m of cohort) {
    const since = m.member_since as string;
    const allDates = [
      ...(eventDates.get(m.id) ?? []),
      ...(surveyDates.get(m.id) ?? []),
    ].sort();
    const guestCutoff = new Date(
      new Date(since).getTime() - PRE_JOIN_GUEST_DAYS * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .slice(0, 10);
    // Recorded life long before the join date = import artifact, not new.
    if (allDates.length && allDates[0].slice(0, 10) < guestCutoff) continue;

    const sinceGuest = (xs: string[]) => xs.filter((d) => d.slice(0, 10) >= guestCutoff);
    const eventsAttended = sinceGuest(eventDates.get(m.id) ?? []).length;
    const surveysAnswered = sinceGuest(surveyDates.get(m.id) ?? []).length;
    const firstActivityAt = sinceGuest(allDates)[0] ?? null;
    const daysAsMember = Math.floor(
      (now - new Date(since).getTime()) / (24 * 60 * 60 * 1000),
    );
    const status: NewMemberStatus =
      eventsAttended + surveysAnswered > 0
        ? "engaging"
        : daysAsMember < NEW_MEMBER_GRACE_DAYS
          ? "settling_in"
          : "no_engagement";
    members.push({
      personId: m.id,
      name: m.name ?? "Unknown",
      memberSince: since,
      daysAsMember,
      eventsAttended,
      surveysAnswered,
      firstActivityAt,
      inForum: !!m.forum_id,
      status,
    });
  }

  const order: Record<NewMemberStatus, number> = {
    no_engagement: 0,
    settling_in: 1,
    engaging: 2,
  };
  members.sort(
    (a, b) =>
      order[a.status] - order[b.status] ||
      b.memberSince.localeCompare(a.memberSince) ||
      a.name.localeCompare(b.name),
  );

  return {
    graceDays: NEW_MEMBER_GRACE_DAYS,
    trackDays: NEW_MEMBER_TRACK_DAYS,
    members,
  };
}

// % of active members who attended 3+ EO events (chapter or global) this FY.
// Attendance comes from the member_event_attendance view (check-in or
// attended status, plus global cohort attendance), same as Member Engagement.
export async function getMemberReachForFY(startYear: number): Promise<MemberReach> {
  const { start, end } = fyWindow(startYear);
  const [membersResult, attendance] = await Promise.all([
    supabase.from("chapter_memberships").select("person_id").eq("status", "active"),
    loadMemberEventAttendance({ eventStartsFrom: start, eventStartsBefore: end }),
  ]);
  if (membersResult.error) {
    throw new Error(`Active members query failed: ${membersResult.error.message}`);
  }
  const members = membersResult.data;
  return summarizeMemberReach(
    ((members ?? []) as { person_id: string }[]).map((m) => m.person_id),
    attendance.filter(
      (row) => row.event_status !== "draft" && row.event_status !== "cancelled",
    ),
  );
}
