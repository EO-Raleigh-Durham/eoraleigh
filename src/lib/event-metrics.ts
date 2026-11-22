import { supabase } from "@/lib/supabase";
import { getAllChapterMetrics } from "@/lib/chapter-metrics";
import { summarizeEventFeedbackMetrics } from "@/lib/event-feedback-metrics";
import {
  summarizeEventMetrics,
  type EventMetricsFY,
  type EventMetricsRegistration,
  type EventMetricsSourceEvent,
} from "@/lib/event-metrics-summary";
import { requireQueryData } from "@/lib/query-result";
import {
  fyWindow,
  fyStartForDate,
  currentFyStart,
  fyLabel,
  fyWindowText,
} from "@/lib/fiscal-year";

// ============================================================
// Live event performance, bucketed by fiscal year, for the
// Chapter Metrics > Event Performance dashboard.
//
// Fiscal-year math lives in @/lib/fiscal-year. The helpers below
// are re-exported so existing import sites (@/lib/event-metrics)
// keep working unchanged. Server-only from here down (Supabase).
// ============================================================

export { fyStartForDate, currentFyStart, fyLabel, fyWindowText };
export type {
  CurrencyTotal,
  EventMetricRow,
  EventMetricsFY,
  UpcomingEventMetricRow,
} from "@/lib/event-metrics-summary";

// Distinct fiscal years that have events, unioned with the years the board has
// recorded under Chapter Metrics, plus the current FY. Newest first.
export async function listFiscalYears(): Promise<number[]> {
  const set = new Set<number>([currentFyStart()]);

  const { data: evs, error } = await supabase
    .from("events")
    .select("starts_at")
    .neq("status", "draft");
  if (error) console.warn("listFiscalYears events:", error.message);
  for (const e of (evs ?? []) as { starts_at: string }[]) {
    set.add(fyStartForDate(e.starts_at));
  }

  const metrics = await getAllChapterMetrics();
  for (const m of metrics) set.add(m.fiscal_year_start);

  return Array.from(set).sort((a, b) => b - a);
}

export async function getEventMetricsForFY(
  startYear: number,
): Promise<EventMetricsFY> {
  const { start, end } = fyWindow(startYear);
  const now = new Date();
  const eventResult = await supabase
    .from("events")
    .select(
      "id, title, starts_at, ends_at, type, status, price_amount, currency, survey_enabled, scope",
    )
    .gte("starts_at", start)
    .lt("starts_at", end)
    .neq("status", "draft")
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true });
  const eventData = requireQueryData(eventResult, "Events query failed");
  const events = (eventData ?? []) as EventMetricsSourceEvent[];
  const heldIds = events
    .filter(
      (event) =>
        new Date(event.ends_at ?? event.starts_at).getTime() <= now.getTime(),
    )
    .map((event) => event.id);

  if (heldIds.length === 0) {
    return summarizeEventMetrics({
      fyStart: startYear,
      now,
      events,
      registrations: [],
      feedback: [],
    });
  }

  const [registrationResult, feedbackResult] = await Promise.all([
    supabase
      .from("event_registrations")
      .select("event_id, person_id, status, guest_count, amount_paid, price_currency, review_classification, person:people!event_registrations_person_id_fkey(email), attendees:event_registration_attendees(email), ticket_type:event_ticket_types!event_registrations_ticket_type_id_fkey(currency)")
      .in("event_id", heldIds),
    supabase
      .from("event_feedback")
      .select("event_id, person_id, event_value_rating, rating_overall, person:people!event_feedback_person_id_fkey(email)")
      .in("event_id", heldIds),
  ]);
  const regData = requireQueryData(registrationResult, "Event registrations query failed");
  const fbData = requireQueryData(feedbackResult, "Event feedback query failed");

  const regs = (regData ?? []) as unknown as EventMetricsRegistration[];
  const fbs = (fbData ?? []) as unknown as {
    event_id: string;
    person_id: string;
    event_value_rating: number | null;
    rating_overall: number | null;
    person: { email: string } | null;
  }[];

  return summarizeEventMetrics({
    fyStart: startYear,
    now,
    events,
    registrations: regs,
    feedback: fbs,
  });
}

// ── Feedback trend for one event's survey tab ───────────────────────────────

export type FeedbackTrendPoint = {
  id: string;
  title: string;
  startsAt: string;
  rating: number; // avg event value rating (event_feedback.event_value_rating)
  responses: number;
};

// The last `limit` events up to and including the given one that have at
// least one survey rating, oldest first. Feeds the trend chart on the
// event's Feedback tab. Looks back over the 24 most recent events so a
// stretch of unsurveyed events doesn't empty the chart.
export async function getEventFeedbackTrend(
  startsAt: string,
  limit = 6,
): Promise<FeedbackTrendPoint[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, starts_at")
    .neq("status", "draft")
    .neq("status", "cancelled")
    .lte("starts_at", startsAt)
    .order("starts_at", { ascending: false })
    .limit(24);
  if (error) {
    console.warn("getEventFeedbackTrend events:", error.message);
    return [];
  }
  const events = (data ?? []) as { id: string; title: string; starts_at: string }[];
  if (events.length === 0) return [];
  const ids = events.map((e) => e.id);

  const [registrationResult, feedbackResult] = await Promise.all([
    supabase
      .from("event_registrations")
      .select(
        "event_id, person_id, review_classification, person:people!event_registrations_person_id_fkey(email), attendees:event_registration_attendees(email)",
      )
      .in("event_id", ids),
    supabase
      .from("event_feedback")
      .select(
        "event_id, person_id, event_value_rating, rating_overall, person:people!event_feedback_person_id_fkey(email)",
      )
      .in("event_id", ids),
  ]);
  if (registrationResult.error || feedbackResult.error) {
    console.warn(
      "getEventFeedbackTrend rows:",
      registrationResult.error?.message ?? feedbackResult.error?.message,
    );
    return [];
  }

  const metrics = summarizeEventFeedbackMetrics(
    ids,
    (feedbackResult.data ?? []) as unknown as Parameters<
      typeof summarizeEventFeedbackMetrics
    >[1],
    (registrationResult.data ?? []) as unknown as Parameters<
      typeof summarizeEventFeedbackMetrics
    >[2],
  );

  return events
    .flatMap((e) => {
      const f = metrics.byEvent[e.id];
      const rating = f.eventValueRating;
      if (rating === null) return [];
      return [
        {
          id: e.id,
          title: e.title,
          startsAt: e.starts_at,
          rating,
          responses: f.eventValueResponses,
        },
      ];
    })
    .slice(0, limit)
    .reverse();
}
