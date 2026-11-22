import assert from "node:assert/strict";
import test from "node:test";
import { engagementSignal, sentimentScore, type SignalInput } from "./member-signal.ts";

const base: SignalInput = { isNew: false, inForum: true, eventsLast90: 1, eventsLast180: 1, responses: 1, latestPulse: null, avgEventRating: null };

test("sentiment weights the pulse twice the event rating", () => {
  assert.equal(sentimentScore(4, 5), (4 * 2 + 5) / 3);
  assert.equal(sentimentScore(3, 5), (3 * 2 + 5) / 3); // 3.67, under 4
  assert.equal(sentimentScore(null, 3.5), 3.5);
  assert.equal(sentimentScore(5, null), 5);
  assert.equal(sentimentScore(null, null), null);
});

test("Dave: forum, an event in 90 days, pulse 4 and RISE 4 rated 5 is healthy", () => {
  assert.equal(engagementSignal({ ...base, eventsLast90: 1, latestPulse: 4, avgEventRating: 5 }), "healthy");
});

test("a forum member with no event in 90 days drifts", () => {
  assert.equal(engagementSignal({ ...base, eventsLast90: 0, eventsLast180: 2, latestPulse: 5 }), "drifting");
});

test("showing up with a score under 4 is a value risk", () => {
  assert.equal(engagementSignal({ ...base, latestPulse: 3, avgEventRating: 5 }), "value_risk");
  assert.equal(engagementSignal({ ...base, avgEventRating: 3.5 }), "value_risk");
});

test("not showing up and scoring under 4 is at risk", () => {
  assert.equal(engagementSignal({ ...base, eventsLast90: 0, latestPulse: 2 }), "at_risk");
});

test("outside a forum, no event in 90 days is at risk even with a good pulse, including no activity at all", () => {
  assert.equal(engagementSignal({ ...base, inForum: false, eventsLast90: 0, eventsLast180: 1, responses: 0 }), "at_risk");
  assert.equal(engagementSignal({ ...base, inForum: false, eventsLast90: 0, eventsLast180: 1, responses: 2, latestPulse: 5 }), "at_risk");
  assert.equal(engagementSignal({ ...base, inForum: false, eventsLast90: 0, eventsLast180: 0, responses: 0 }), "at_risk");
});

test("a forum member with no ratings who shows up is healthy", () => {
  assert.equal(engagementSignal(base), "healthy");
});

test("new members are never flagged", () => {
  assert.equal(engagementSignal({ ...base, isNew: true, eventsLast90: 0 }), "new");
});

test("why line and suggested step read plainly", async () => {
  const { whyLine, suggestedStep } = await import("./member-signal.ts");
  const gaby = { eventsLast90: 6, inForum: true, secondary: false, latestPulse: 3, avgEventRating: 4.5 };
  assert.equal(whyLine(gaby), "6 events in 90 days, in a forum, Growth Pulse 3, rates events 4.5, score 3.5");
  assert.equal(suggestedStep("value_risk", gaby), "Coffee: what would make this year transformative?");
  assert.equal(suggestedStep("value_risk", { ...gaby, latestPulse: 1, avgEventRating: null }), "Ask the President to call: what isn't working?");
  assert.equal(suggestedStep("at_risk", { eventsLast90: 0, inForum: false, secondary: true, latestPulse: null, avgEventRating: null }), "Confirm they still want their secondary membership");
  assert.equal(suggestedStep("healthy", gaby), null);
});
