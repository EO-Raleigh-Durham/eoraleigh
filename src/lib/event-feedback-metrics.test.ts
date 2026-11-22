import assert from "node:assert/strict";
import test from "node:test";

import { summarizeEventFeedbackMetrics } from "./event-feedback-metrics.ts";

test("FY event metrics separate legacy, event-value, and dual-rating rows", () => {
  const summary = summarizeEventFeedbackMetrics(
    ["legacy", "current"],
    [
      {
        event_id: "legacy",
        person_id: "person-1",
        event_value_rating: null,
        rating_overall: 4,
      },
      {
        event_id: "current",
        person_id: "person-2",
        event_value_rating: 5,
        rating_overall: null,
      },
      {
        event_id: "current",
        person_id: "person-3",
        event_value_rating: 4,
        rating_overall: 3,
      },
    ],
    [],
  );

  assert.deepEqual(summary, {
    avgEventValue: 4.5,
    avgGrowthRating: 3.5,
    eventValueResponses: 2,
    growthResponses: 2,
    byEvent: {
      legacy: {
        responses: 1,
        eventValueRating: null,
        growthRating: 4,
        eventValueResponses: 0,
        eventValueTotal: 0,
        growthResponses: 1,
      },
      current: {
        responses: 2,
        eventValueRating: 4.5,
        growthRating: 3,
        eventValueResponses: 2,
        eventValueTotal: 9,
        growthResponses: 1,
      },
    },
  });
});
