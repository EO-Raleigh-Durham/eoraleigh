import { filterSpamLinkedFeedback } from "./event-registration-review.ts";

export type FeedbackMetricRow = {
  event_id: string;
  person_id: string;
  event_value_rating: number | null;
  rating_overall: number | null;
  person?: { email: string } | null;
};

export type FeedbackRegistrationRow = {
  event_id: string;
  person_id: string;
  review_classification: string;
  person?: { email: string } | null;
  attendees?: { email: string }[];
};

type EventFeedbackSummary = {
  responses: number;
  eventValueRating: number | null;
  growthRating: number | null;
  eventValueResponses: number;
  eventValueTotal: number; // unrounded sum, for event-weighted averages
  growthResponses: number;
};

function mean(values: number[]): number | null {
  return values.length
    ? Math.round(
        (values.reduce((total, value) => total + value, 0) / values.length) * 10,
      ) / 10
    : null;
}

export function summarizeEventFeedbackMetrics(
  eventIds: string[],
  feedback: FeedbackMetricRow[],
  registrations: FeedbackRegistrationRow[],
) {
  const ratings = new Map<
    string,
    { responses: number; eventValue: number[]; growth: number[] }
  >(
    eventIds.map((eventId) => [
      eventId,
      { responses: 0, eventValue: [], growth: [] },
    ]),
  );

  for (const row of filterSpamLinkedFeedback(feedback, registrations)) {
    const event = ratings.get(row.event_id);
    if (!event) continue;
    event.responses += 1;
    if (row.event_value_rating !== null) {
      event.eventValue.push(row.event_value_rating);
    }
    if (row.rating_overall !== null) event.growth.push(row.rating_overall);
  }

  const allEventValue = [...ratings.values()].flatMap((row) => row.eventValue);
  const allGrowth = [...ratings.values()].flatMap((row) => row.growth);
  const byEvent: Record<string, EventFeedbackSummary> = {};
  for (const [eventId, row] of ratings) {
    byEvent[eventId] = {
      responses: row.responses,
      eventValueRating: mean(row.eventValue),
      growthRating: mean(row.growth),
      eventValueResponses: row.eventValue.length,
      eventValueTotal: row.eventValue.reduce((total, value) => total + value, 0),
      growthResponses: row.growth.length,
    };
  }

  return {
    avgEventValue: mean(allEventValue),
    avgGrowthRating: mean(allGrowth),
    eventValueResponses: allEventValue.length,
    growthResponses: allGrowth.length,
    byEvent,
  };
}
