import type { EventRatingByType } from "./event-metrics-summary.ts";

export type RecentEventScore = {
  id: string;
  title: string;
  startsAt: string;
  eventValueRating: number | null;
  eventValueResponses: number;
  growthRating: number | null;
  growthResponses: number;
  checkedIn: number;
  registered: number;
};

type EventPulseSource = {
  ratingsByType?: EventRatingByType[];
  avgEventValue: number | null;
  eventValueResponses: number;
  avgGrowthRating: number | null;
  growthResponses: number;
  rows: RecentEventScore[];
};

export function eventPulseSnapshot(events: EventPulseSource) {
  return {
    fyEventValueAvg: events.avgEventValue,
    fyEventValueResponses: events.eventValueResponses,
    fyEventGrowthAvg: events.avgGrowthRating,
    fyEventGrowthResponses: events.growthResponses,
    fyRatingsByType: events.ratingsByType ?? [],
    recentEvents: events.rows.slice(0, 4).map((row) => ({
      id: row.id,
      title: row.title,
      startsAt: row.startsAt,
      eventValueRating: row.eventValueRating,
      eventValueResponses: row.eventValueResponses,
      growthRating: row.growthRating,
      growthResponses: row.growthResponses,
      checkedIn: row.checkedIn,
      registered: row.registered,
    })),
  };
}
