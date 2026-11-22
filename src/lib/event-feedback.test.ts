import assert from "node:assert/strict";
import test from "node:test";

import {
  EVENT_VALUE_SCALE,
  buildEventValueFeedbackUpsert,
  getFeedbackRating,
  summarizeFeedbackRatings,
} from "./event-feedback.ts";

test("event value scale uses immediate value language", () => {
  assert.deepEqual(EVENT_VALUE_SCALE, [
    { value: 1, label: "Not valuable" },
    { value: 2, label: "Slightly valuable" },
    { value: 3, label: "Moderately valuable" },
    { value: 4, label: "Very valuable" },
    { value: 5, label: "Extremely valuable" },
  ]);
});

test("event value and historical growth ratings remain separate", () => {
  const summary = summarizeFeedbackRatings([
    { event_value_rating: 5, rating_overall: null },
    { event_value_rating: 5, rating_overall: null },
    { event_value_rating: 4, rating_overall: null },
    { event_value_rating: null, rating_overall: 4 },
  ]);

  assert.deepEqual(summary, {
    eventValue: { average: 4.7, responses: 3 },
    growth: { average: 4, responses: 1 },
  });
});

test("event value upserts preserve an existing historical growth rating", () => {
  const payload = buildEventValueFeedbackUpsert({
    event_id: "event-1",
    person_id: "person-1",
    event_value_rating: 5,
    loved_text: "The practical examples",
    improve_text: null,
  });

  assert.equal("rating_overall" in payload, false);

  const legacyRow = {
    event_id: "event-1",
    person_id: "person-1",
    event_value_rating: null,
    rating_overall: 4,
    loved_text: "The speaker",
    improve_text: "More discussion time",
  };
  const updatedRow = { ...legacyRow, ...payload };

  assert.equal(updatedRow.event_value_rating, 5);
  assert.equal(updatedRow.rating_overall, 4);
});

test("a response displays its event value rating before legacy growth", () => {
  assert.deepEqual(
    getFeedbackRating({ event_value_rating: 4, rating_overall: 2 }),
    { label: "Event value", value: 4 },
  );
  assert.deepEqual(
    getFeedbackRating({ event_value_rating: null, rating_overall: 5 }),
    { label: "Growth", value: 5 },
  );
  assert.equal(
    getFeedbackRating({ event_value_rating: null, rating_overall: null }),
    null,
  );
});
