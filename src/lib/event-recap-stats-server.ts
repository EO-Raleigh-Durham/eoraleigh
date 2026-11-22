import { supabase } from "./supabase";
import { summarizeEventFeedbackMetrics } from "./event-feedback-metrics.ts";
import {
  computeRecapStats,
  type RecapRegistration,
  type RecapStatsResult,
} from "./event-recap-stats.ts";

// Server-only loader feeding the public recap stat band.
//
// Deliberately narrow: it reads only the columns the four stats need. No
// names, no emails, nothing financial. The public event page renders what
// comes back from here, so anything loaded is one render bug away from being
// public.
//
// Numbers are computed live rather than read from recap_stats_snapshot. A late
// survey response should improve the published rating, not be frozen out. The
// snapshot records what was published at generation time so the marketing
// email can report what was included and what was suppressed.

export async function getEventRecapStats(eventId: string): Promise<RecapStatsResult> {
  const [registrations, feedback] = await Promise.all([
    loadRegistrations(eventId),
    loadFeedbackSummary(eventId),
  ]);
  return computeRecapStats(registrations, feedback);
}

async function loadRegistrations(eventId: string): Promise<RecapRegistration[]> {
  const { data, error } = await supabase
    .from("event_registrations")
    .select(
      "checked_in_at, review_classification, guest_count, attendees:event_registration_attendees(company)",
    )
    .eq("event_id", eventId);

  if (error) {
    console.warn("getEventRecapStats registrations:", error.message);
    return [];
  }
  return (data ?? []) as unknown as RecapRegistration[];
}

async function loadFeedbackSummary(eventId: string) {
  const { data, error } = await supabase
    .from("event_feedback")
    .select("event_id, person_id, event_value_rating, rating_overall")
    .eq("event_id", eventId);

  if (error) {
    console.warn("getEventRecapStats feedback:", error.message);
    return null;
  }

  const feedback = (data ?? []) as {
    event_id: string;
    person_id: string;
    event_value_rating: number | null;
    rating_overall: number | null;
  }[];
  if (feedback.length === 0) return null;

  // Spam-linked feedback is filtered by the shared summarizer, which needs the
  // registration review classifications to know who to drop.
  const { data: reviewData, error: reviewError } = await supabase
    .from("event_registrations")
    .select("event_id, person_id, review_classification")
    .eq("event_id", eventId);

  if (reviewError) {
    console.warn("getEventRecapStats review:", reviewError.message);
    return null;
  }

  const summary = summarizeEventFeedbackMetrics(
    [eventId],
    feedback,
    (reviewData ?? []) as {
      event_id: string;
      person_id: string;
      review_classification: string;
    }[],
  );
  return summary.byEvent[eventId] ?? null;
}
