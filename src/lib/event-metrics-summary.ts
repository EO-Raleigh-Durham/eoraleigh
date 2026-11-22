import {
  summarizeEventFeedbackMetrics,
  type FeedbackMetricRow,
  type FeedbackRegistrationRow,
} from "./event-feedback-metrics.ts";
import type { EventStatus, EventType } from "./events.ts";

export type EventMetricsSourceEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  type: EventType;
  status: EventStatus;
  price_amount: number;
  currency: string;
  survey_enabled: boolean;
  scope?: string; // "local" chapter event or "global" listing; missing = local
};

export type EventMetricsRegistration = FeedbackRegistrationRow & {
  status: string;
  guest_count: number | null;
  amount_paid: number | null;
  price_currency: string | null;
  ticket_type?: { currency?: string } | null;
};

export type CurrencyTotal = {
  currency: string;
  amount: number;
};

export type EventMetricRow = {
  id: string;
  title: string;
  startsAt: string;
  type: EventType;
  registered: number;
  checkedIn: number;
  revenueTotals: CurrencyTotal[];
  eventValueRating: number | null;
  growthRating: number | null;
  eventValueResponses: number;
  growthResponses: number;
  responses: number;
  surveyEnabled: boolean;
};

export type UpcomingEventMetricRow = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  type: EventType;
};

// One chair's scorecard: held chapter events of one type, how many were
// rated, and the average 1-5 event rating with every rated event weighted
// equally (a big event does not drown out a small one).
export type EventRatingByType = {
  type: EventType;
  label: string;
  chapterEvents: number;
  ratedEvents: number;
  avgRating: number | null;
  responses: number;
};

export type EventMetricsFY = {
  fyStart: number;
  held: number;
  ongoing: number;
  upcoming: number;
  registrations: number;
  checkedIn: number;
  noShows: number;
  attendanceRate: number | null;
  revenueTotals: CurrencyTotal[];
  paidEvents: number;
  freeEvents: number;
  avgEventValue: number | null;
  avgGrowthRating: number | null;
  eventValueResponses: number;
  growthResponses: number;
  byType: { type: EventType; label: string; count: number }[];
  ratingsByType: EventRatingByType[];
  rows: EventMetricRow[];
  ongoingRows: UpcomingEventMetricRow[];
  upcomingRows: UpcomingEventMetricRow[];
};

type SummarizeEventMetricsInput = {
  fyStart: number;
  now: Date;
  events: EventMetricsSourceEvent[];
  registrations: EventMetricsRegistration[];
  feedback: FeedbackMetricRow[];
};

function currencyCode(value: string): string {
  return value.trim().toUpperCase();
}

const EVENT_TYPE_ORDER: EventType[] = [
  "learning",
  "membership",
  "social",
  "my_eo",
  "forum",
];

const EVENT_TYPE_LABEL: Record<EventType, string> = {
  learning: "Learning",
  membership: "Membership",
  social: "Social",
  my_eo: "myEO",
  forum: "Forum",
};

function addCurrencyAmount(
  totals: Map<string, number>,
  currency: string,
  amount: number,
) {
  const code = currencyCode(currency);
  totals.set(code, (totals.get(code) ?? 0) + amount);
}

function currencyTotals(totals: Map<string, number>): CurrencyTotal[] {
  return [...totals]
    .filter(([, amount]) => amount > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amount]) => ({ currency, amount }));
}

export function summarizeEventMetrics({
  fyStart,
  now,
  events,
  registrations: allRegistrations,
  feedback,
}: SummarizeEventMetricsInput): EventMetricsFY {
  const reportable = events.filter(
    (event) => event.status !== "draft" && event.status !== "cancelled",
  );
  const nowTime = now.getTime();
  const heldEvents = reportable.filter(
    (event) => new Date(event.ends_at ?? event.starts_at).getTime() <= nowTime,
  );
  const ongoingEvents = reportable.filter(
    (event) =>
      new Date(event.starts_at).getTime() <= nowTime &&
      new Date(event.ends_at ?? event.starts_at).getTime() > nowTime,
  );
  const upcomingEvents = reportable.filter(
    (event) => new Date(event.starts_at).getTime() > nowTime,
  );
  const heldIds = new Set(heldEvents.map((event) => event.id));
  const eventById = new Map(heldEvents.map((event) => [event.id, event]));
  const registrations = allRegistrations.filter((registration) =>
    heldIds.has(registration.event_id),
  );
  const feedbackRows = feedback.filter((row) => heldIds.has(row.event_id));

  const byEvent = new Map<
    string,
    {
      registered: number;
      checkedIn: number;
      revenue: Map<string, number>;
    }
  >();
  for (const event of heldEvents) {
    byEvent.set(event.id, {
      registered: 0,
      checkedIn: 0,
      revenue: new Map(),
    });
  }

  let registrationCount = 0;
  let checkedIn = 0;
  let noShows = 0;
  const revenue = new Map<string, number>();
  const operationalRegistrations = registrations.filter(
    (registration) => registration.review_classification !== "spam",
  );

  for (const registration of operationalRegistrations) {
    const event = eventById.get(registration.event_id);
    const eventSummary = byEvent.get(registration.event_id);
    if (!event || !eventSummary) continue;

    const attendees = 1 + (registration.guest_count ?? 0);
    if (
      registration.status === "registered" ||
      registration.status === "attended"
    ) {
      registrationCount += attendees;
      eventSummary.registered += attendees;
    }
    if (registration.status === "attended") {
      checkedIn += attendees;
      eventSummary.checkedIn += attendees;
    }
    if (registration.status === "no_show") noShows += attendees;

    if (registration.amount_paid && registration.amount_paid > 0) {
      const registrationCurrency =
        registration.price_currency?.trim() ||
        registration.ticket_type?.currency?.trim() ||
        event.currency;
      addCurrencyAmount(revenue, registrationCurrency, registration.amount_paid);
      addCurrencyAmount(
        eventSummary.revenue,
        registrationCurrency,
        registration.amount_paid,
      );
    }
  }

  const feedbackMetrics = summarizeEventFeedbackMetrics(
    [...heldIds],
    feedbackRows,
    registrations,
  );

  const rows = heldEvents
    .map((event) => {
      const summary = byEvent.get(event.id)!;
      const eventFeedback = feedbackMetrics.byEvent[event.id];
      return {
        id: event.id,
        title: event.title,
        startsAt: event.starts_at,
        type: event.type,
        registered: summary.registered,
        checkedIn: summary.checkedIn,
        revenueTotals: currencyTotals(summary.revenue),
        eventValueRating: eventFeedback.eventValueRating,
        growthRating: eventFeedback.growthRating,
        eventValueResponses: eventFeedback.eventValueResponses,
        growthResponses: eventFeedback.growthResponses,
        responses: eventFeedback.responses,
        surveyEnabled: event.survey_enabled,
      };
    })
    .sort(
      (left, right) =>
        new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime(),
    );

  const timelineRow = (event: EventMetricsSourceEvent) => ({
    id: event.id,
    title: event.title,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    type: event.type,
  });
  const ongoingRows = ongoingEvents.map(timelineRow).sort(
    (left, right) =>
      new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
  );
  const upcomingRows = upcomingEvents
    .map(timelineRow)
    .sort(
      (left, right) =>
        new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
    );

  const paidEvents = heldEvents.filter((event) => {
    const eventRevenue = byEvent.get(event.id)?.revenue;
    return event.price_amount > 0 || (eventRevenue?.size ?? 0) > 0;
  }).length;

  const byType = EVENT_TYPE_ORDER.map((type) => ({
    type,
    label: EVENT_TYPE_LABEL[type],
    count: heldEvents.filter((event) => event.type === type).length,
  })).filter((entry) => entry.count > 0);

  const ratingsByType: EventRatingByType[] = EVENT_TYPE_ORDER.map((type) => {
    const chapterEvents = heldEvents.filter(
      (event) => event.type === type && (event.scope ?? "local") === "local",
    );
    const eventMeans = chapterEvents
      .map((event) => feedbackMetrics.byEvent[event.id])
      .filter((summary) => summary.eventValueResponses > 0)
      .map((summary) => ({
        mean: summary.eventValueTotal / summary.eventValueResponses,
        responses: summary.eventValueResponses,
      }));
    return {
      type,
      label: EVENT_TYPE_LABEL[type],
      chapterEvents: chapterEvents.length,
      ratedEvents: eventMeans.length,
      avgRating: eventMeans.length
        ? Math.round(
            (eventMeans.reduce((total, row) => total + row.mean, 0) /
              eventMeans.length) *
              100,
          ) / 100
        : null,
      responses: eventMeans.reduce((total, row) => total + row.responses, 0),
    };
  }).filter((entry) => entry.chapterEvents > 0);

  return {
    fyStart,
    held: heldEvents.length,
    ongoing: ongoingEvents.length,
    upcoming: upcomingEvents.length,
    registrations: registrationCount,
    checkedIn,
    noShows,
    attendanceRate:
      registrationCount > 0
        ? Math.round((checkedIn / registrationCount) * 100)
        : null,
    revenueTotals: currencyTotals(revenue),
    paidEvents,
    freeEvents: heldEvents.length - paidEvents,
    avgEventValue: feedbackMetrics.avgEventValue,
    avgGrowthRating: feedbackMetrics.avgGrowthRating,
    eventValueResponses: feedbackMetrics.eventValueResponses,
    growthResponses: feedbackMetrics.growthResponses,
    byType,
    ratingsByType,
    rows,
    ongoingRows,
    upcomingRows,
  };
}

// Key chapter metric: share of active members who attended at least
// `threshold` EO events (chapter or global) in the fiscal year.
export type MemberReach = {
  activeMembers: number;
  reached: number;
  pct: number | null;
  threshold: number;
};

export function summarizeMemberReach(
  activeMemberIds: Iterable<string>,
  attendance: { person_id: string; event_id: string }[],
  threshold = 3,
): MemberReach {
  const members = new Set(activeMemberIds);
  const events = new Map<string, Set<string>>();
  for (const row of attendance) {
    if (!members.has(row.person_id)) continue;
    const set = events.get(row.person_id) ?? new Set<string>();
    set.add(row.event_id);
    events.set(row.person_id, set);
  }
  const reached = [...events.values()].filter((set) => set.size >= threshold).length;
  return {
    activeMembers: members.size,
    reached,
    pct: members.size ? Math.round((reached / members.size) * 100) : null,
    threshold,
  };
}
