import assert from "node:assert/strict";
import test from "node:test";

import { formatMoney } from "./currency.ts";
import { summarizeEventMetrics, summarizeMemberReach, type EventMetricsSourceEvent, type EventMetricsRegistration } from "./event-metrics-summary.ts";

const NOW = new Date("2026-09-01T00:00:00.000Z");

function event(
  id: string,
  startsAt: string,
  currency: string,
  priceAmount: number,
  endsAt: string | null = null,
): EventMetricsSourceEvent {
  return {
    id,
    title: id,
    starts_at: startsAt,
    ends_at: endsAt,
    type: "learning" as const,
    status: "published",
    price_amount: priceAmount,
    currency,
    survey_enabled: true,
  };
}

function registration(
  eventId: string,
  amountPaid: number,
  priceCurrency: string | null,
  ticketCurrency?: string,
): EventMetricsRegistration {
  return {
    event_id: eventId,
    person_id: `${eventId}-person`,
    status: "registered",
    guest_count: 0,
    amount_paid: amountPaid,
    price_currency: priceCurrency,
    ticket_type: ticketCurrency ? { currency: ticketCurrency } : null,
    review_classification: "approved",
    person: { email: `${eventId}@example.com` },
    attendees: [],
  };
}

test("keeps USD and JPY event revenue in separate currency totals", () => {
  const metrics = summarizeEventMetrics({
    fyStart: 2026,
    now: NOW,
    events: [
      event("usd-event", "2026-07-10T00:00:00.000Z", "USD", 12_345),
      event("jpy-event", "2026-08-10T00:00:00.000Z", "JPY", 2_500_000),
    ],
    registrations: [
      registration("usd-event", 12_345, "USD"),
      registration("jpy-event", 2_500_000, "JPY"),
    ],
    feedback: [],
  });

  assert.deepEqual(metrics.revenueTotals, [
    { currency: "JPY", amount: 2_500_000 },
    { currency: "USD", amount: 12_345 },
  ]);
  assert.deepEqual(metrics.rows.map((row) => row.revenueTotals), [
    [{ currency: "JPY", amount: 2_500_000 }],
    [{ currency: "USD", amount: 12_345 }],
  ]);
  assert.equal(formatMoney(metrics.revenueTotals[0].amount, "JPY"), "¥2,500,000");
});

test("uses the ticket currency for existing payments without a stored price currency", () => {
  const metrics = summarizeEventMetrics({
    fyStart: 2026,
    now: NOW,
    events: [
      event("family-day", "2026-08-10T00:00:00.000Z", "USD", 0),
    ],
    registrations: [
      registration("family-day", 2_500_000, null, "jpy"),
    ],
    feedback: [],
  });

  assert.deepEqual(metrics.revenueTotals, [
    { currency: "JPY", amount: 2_500_000 },
  ]);
  assert.deepEqual(metrics.rows[0].revenueTotals, [
    { currency: "JPY", amount: 2_500_000 },
  ]);
});

test("falls back to the event currency when payment and ticket currencies are absent", () => {
  const metrics = summarizeEventMetrics({
    fyStart: 2026,
    now: NOW,
    events: [event("legacy-jpy-event", "2026-08-10T00:00:00.000Z", "JPY", 0)],
    registrations: [registration("legacy-jpy-event", 2_500_000, null)],
    feedback: [],
  });

  assert.deepEqual(metrics.revenueTotals, [
    { currency: "JPY", amount: 2_500_000 },
  ]);
  assert.deepEqual(metrics.rows[0].revenueTotals, [
    { currency: "JPY", amount: 2_500_000 },
  ]);
});

test("falls back to the event currency when the ticket embed has no currency", () => {
  const legacyRegistration = registration("legacy-jpy-event", 2_500_000, null);
  legacyRegistration.ticket_type = {};
  const metrics = summarizeEventMetrics({
    fyStart: 2026,
    now: NOW,
    events: [event("legacy-jpy-event", "2026-08-10T00:00:00.000Z", "JPY", 0)],
    registrations: [legacyRegistration],
    feedback: [],
  });

  assert.deepEqual(metrics.revenueTotals, [
    { currency: "JPY", amount: 2_500_000 },
  ]);
});

test("keeps future events in the upcoming pipeline and out of held results", () => {
  const metrics = summarizeEventMetrics({
    fyStart: 2026,
    now: NOW,
    events: [
      event("past-event", "2026-08-10T00:00:00.000Z", "USD", 10_000),
      event("future-event", "2026-10-10T00:00:00.000Z", "JPY", 3_000_000),
    ],
    registrations: [
      registration("past-event", 10_000, "USD"),
      registration("future-event", 3_000_000, "JPY"),
    ],
    feedback: [],
  });

  assert.equal(metrics.held, 1);
  assert.equal(metrics.upcoming, 1);
  assert.equal(metrics.registrations, 1);
  assert.deepEqual(metrics.revenueTotals, [{ currency: "USD", amount: 10_000 }]);
  assert.deepEqual(metrics.rows.map((row) => row.id), ["past-event"]);
  assert.deepEqual(metrics.upcomingRows.map((row) => row.id), ["future-event"]);
});

test("reports an event that has started but not ended as ongoing", () => {
  const metrics = summarizeEventMetrics({
    fyStart: 2026,
    now: NOW,
    events: [
      event(
        "ongoing-event",
        "2026-08-31T23:00:00.000Z",
        "JPY",
        2_500_000,
        "2026-09-01T01:00:00.000Z",
      ),
    ],
    registrations: [registration("ongoing-event", 2_500_000, "JPY")],
    feedback: [],
  });

  assert.equal(metrics.held, 0);
  assert.equal(metrics.ongoing, 1);
  assert.equal(metrics.upcoming, 0);
  assert.equal(metrics.registrations, 0);
  assert.deepEqual(metrics.revenueTotals, []);
  assert.deepEqual(metrics.rows, []);
  assert.deepEqual(metrics.ongoingRows.map((row) => row.id), ["ongoing-event"]);
  assert.deepEqual(metrics.upcomingRows, []);
});

test("rates each event type over held chapter events, each event weighted equally", () => {
  const event = (id: string, type: EventMetricsSourceEvent["type"], scope = "local") => ({
    id,
    title: id,
    starts_at: "2026-08-01T10:00:00.000Z",
    ends_at: "2026-08-01T12:00:00.000Z",
    type,
    status: "closed" as const,
    price_amount: 0,
    currency: "JPY",
    survey_enabled: true,
    scope,
  });
  const fb = (eventId: string, person: string, rating: number) => ({
    event_id: eventId,
    person_id: person,
    event_value_rating: rating,
    rating_overall: null,
  });
  const metrics = summarizeEventMetrics({
    fyStart: 2026,
    now: new Date("2026-09-01T00:00:00.000Z"),
    events: [
      event("big", "learning"),
      event("small", "learning"),
      event("unrated", "learning"),
      event("apac", "learning", "global"),
      event("dinner", "my_eo"),
    ],
    registrations: [],
    feedback: [
      fb("big", "p1", 5),
      fb("big", "p2", 5),
      fb("big", "p3", 5),
      fb("small", "p4", 3),
      fb("apac", "p5", 1),
    ],
  });
  assert.deepEqual(metrics.ratingsByType, [
    { type: "learning", label: "Learning", chapterEvents: 3, ratedEvents: 2, avgRating: 4, responses: 4 },
    { type: "my_eo", label: "myEO", chapterEvents: 1, ratedEvents: 0, avgRating: null, responses: 0 },
  ]);
});

test("member reach counts active members at 3+ distinct events", () => {
  const reach = summarizeMemberReach(
    ["a", "b", "c", "d"],
    [
      { person_id: "a", event_id: "e1" },
      { person_id: "a", event_id: "e2" },
      { person_id: "a", event_id: "e3" },
      { person_id: "b", event_id: "e1" },
      { person_id: "b", event_id: "e1" },
      { person_id: "b", event_id: "e2" },
      { person_id: "guest", event_id: "e1" },
      { person_id: "guest", event_id: "e2" },
      { person_id: "guest", event_id: "e3" },
    ],
  );
  assert.deepEqual(reach, { activeMembers: 4, reached: 1, pct: 25, threshold: 3 });
});
