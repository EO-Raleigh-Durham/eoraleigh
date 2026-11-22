import assert from "node:assert/strict";
import test from "node:test";

import { buildEventTrends } from "./event-trends.ts";

const row = (id: string, startsAt: string, registered: number, rating: number | null = null, responses = 0) => ({
  id,
  title: id,
  startsAt,
  registered,
  eventValueRating: rating,
  eventValueResponses: responses,
});

test("buckets registrations by fiscal month against last year, same point to date", () => {
  const now = new Date("2026-11-20T05:00:00Z");
  const trends = buildEventTrends(
    [
      row("jul", "2026-07-23T06:30:00Z", 40, 4.5, 17),
      row("nov", "2026-11-13T07:00:00Z", 80, 4.6, 27),
      row("tiny", "2026-11-13T09:00:00Z", 10, 5, 2),
    ],
    [
      row("ly-aug", "2025-08-10T06:00:00Z", 30),
      row("ly-nov-early", "2025-11-15T06:00:00Z", 20),
      row("ly-nov-late", "2025-11-28T06:00:00Z", 50),
      row("ly-jun", "2026-06-20T06:00:00Z", 100),
    ],
    now,
  );
  assert.deepEqual(trends.months.slice(0, 6), [
    { month: "Jul", thisYear: 40, lastYear: 0 },
    { month: "Aug", thisYear: 0, lastYear: 30 },
    { month: "Sep", thisYear: 0, lastYear: 0 },
    { month: "Oct", thisYear: 0, lastYear: 0 },
    { month: "Nov", thisYear: 90, lastYear: 70 },
    { month: "Dec", thisYear: null, lastYear: 0 },
  ]);
  assert.equal(trends.months[11].lastYear, 100);
  assert.deepEqual(trends.ytd, [
    { label: "Events held", thisYear: 3, lastYear: 2, pct: 50 },
    { label: "Registrations", thisYear: 130, lastYear: 50, pct: 160 },
    { label: "People per event", thisYear: 43, lastYear: 25, pct: 72 },
  ]);
  assert.equal(trends.asOf, "20 Nov");
  assert.equal(trends.biggest?.id, "nov");
  assert.equal(trends.topRated?.id, "nov"); // "tiny" has too few responses
  assert.deepEqual(trends.busiestMonth, { month: "Nov", registered: 90 });
});

test("no prior year gives no percentage and empty highlights stay null", () => {
  const trends = buildEventTrends([], [], new Date("2026-08-01T00:00:00Z"));
  assert.equal(trends.ytd[0].pct, null);
  assert.equal(trends.biggest, null);
  assert.equal(trends.topRated, null);
  assert.equal(trends.busiestMonth, null);
});
