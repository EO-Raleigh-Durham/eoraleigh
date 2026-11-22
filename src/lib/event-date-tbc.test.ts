import assert from "node:assert/strict";
import test from "node:test";
import { isEventDateTbc, tbcEventDate } from "./event-date-tbc.ts";

const aiEra = {
  slug: "leadership-ai-era-2026",
  starts_at: "2026-10-12T02:00:00+00:00",
  ends_at: "2026-10-13T10:00:00+00:00",
};

test("Leadership in the AI Era shows 2027, date to be confirmed", () => {
  assert.equal(isEventDateTbc(aiEra), true);
  const date = tbcEventDate(aiEra)!;
  assert.equal(date.full, "2027 · Date to be confirmed");
  assert.equal(date.day, "TBC");
  assert.equal(date.year, "2027");
  assert.doesNotMatch(date.full, /Oct|2026/);
});

test("other events are unaffected", () => {
  const other = { ...aiEra, slug: "some-other-event" };
  assert.equal(isEventDateTbc(other), false);
  assert.equal(tbcEventDate(other), null);
});
