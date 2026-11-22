export const EVENT_VALUE_SCALE = [
  { value: 1, label: "Not valuable" },
  { value: 2, label: "Slightly valuable" },
  { value: 3, label: "Moderately valuable" },
  { value: 4, label: "Very valuable" },
  { value: 5, label: "Extremely valuable" },
] as const;

export type FeedbackRatings = {
  event_value_rating: number | null;
  rating_overall: number | null;
};

export type EventValueFeedbackUpsert = {
  event_id: string;
  person_id: string;
  event_value_rating: number;
  loved_text: string | null;
  improve_text: string | null;
};

export function buildEventValueFeedbackUpsert(
  values: EventValueFeedbackUpsert,
): EventValueFeedbackUpsert {
  return {
    event_id: values.event_id,
    person_id: values.person_id,
    event_value_rating: values.event_value_rating,
    loved_text: values.loved_text,
    improve_text: values.improve_text,
  };
}

type RatingSummary = {
  average: number | null;
  responses: number;
};

function summarize(values: Array<number | null>): RatingSummary {
  const ratings = values.filter((value): value is number => value !== null);
  if (ratings.length === 0) return { average: null, responses: 0 };

  return {
    average:
      Math.round(
        (ratings.reduce((total, value) => total + value, 0) / ratings.length) *
          10,
      ) / 10,
    responses: ratings.length,
  };
}

export function summarizeFeedbackRatings(rows: FeedbackRatings[]) {
  return {
    eventValue: summarize(rows.map((row) => row.event_value_rating)),
    growth: summarize(rows.map((row) => row.rating_overall)),
  };
}

export function getFeedbackRating(row: FeedbackRatings): {
  label: "Event value" | "Growth";
  value: number;
} | null {
  if (row.event_value_rating !== null) {
    return { label: "Event value", value: row.event_value_rating };
  }
  if (row.rating_overall !== null) {
    return { label: "Growth", value: row.rating_overall };
  }
  return null;
}
