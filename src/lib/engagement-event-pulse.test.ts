import assert from "node:assert/strict";
import test from "node:test";

import { eventPulseSnapshot } from "./event-pulse.ts";

test("chapter pulse keeps event value and historical growth separate", () => {
  const events = {
    avgEventValue: 4.8,
    eventValueResponses: 12,
    avgGrowthRating: 4.2,
    growthResponses: 7,
    rows: [
      {
        id: "event-1",
        title: "Current event",
        startsAt: "2026-07-23T06:30:00Z",
        eventValueRating: 4.8,
        eventValueResponses: 12,
        growthRating: null,
        growthResponses: 0,
        checkedIn: 42,
        registered: 50,
      },
    ],
  };

  assert.deepEqual(eventPulseSnapshot(events), {
    fyEventValueAvg: 4.8,
    fyEventValueResponses: 12,
    fyEventGrowthAvg: 4.2,
    fyEventGrowthResponses: 7,
    fyRatingsByType: [],
    recentEvents: [
      {
        id: "event-1",
        title: "Current event",
        startsAt: "2026-07-23T06:30:00Z",
        eventValueRating: 4.8,
        eventValueResponses: 12,
        growthRating: null,
        growthResponses: 0,
        checkedIn: 42,
        registered: 50,
      },
    ],
  });
});
