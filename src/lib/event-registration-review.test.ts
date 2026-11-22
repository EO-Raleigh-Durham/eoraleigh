import assert from "node:assert/strict";
import test from "node:test";
// Node's built-in type stripping requires the explicit extension here.
import * as review from "./event-registration-review.ts";

const {
  canCheckInRegistration,
  filterSpamLinkedFeedback,
  isActiveRegistration,
  isCommunicationEligible,
  isConfirmedRegistration,
  isPaymentDueRegistration,
  occupiedSeats,
  registrationAttendeeCount,
} = review;

test("existing registrations default to normal behavior", () => {
  const legacy = { status: "registered", guest_count: 1 };
  assert.equal(isActiveRegistration(legacy), true);
  assert.equal(isConfirmedRegistration(legacy), true);
  assert.equal(canCheckInRegistration(legacy), true);
});

test("spam remains lifecycle-independent and excluded from operational counts", () => {
  const rows = [
    { status: "registered", guest_count: 2, review_classification: "normal" as const },
    { status: "pending_payment", guest_count: 0, review_classification: "needs_review" as const },
    { status: "attended", guest_count: 4, review_classification: "spam" as const },
    { status: "cancelled", guest_count: 1, review_classification: "normal" as const },
  ];

  assert.equal(occupiedSeats(rows), 4);
  assert.equal(isActiveRegistration(rows[2]), false);
  assert.equal(isConfirmedRegistration(rows[2]), false);
});

test("attendee totals always include the primary registrant and guests", () => {
  assert.equal(registrationAttendeeCount({ guest_count: 0 }), 1);
  assert.equal(registrationAttendeeCount({ guest_count: 1 }), 2);
  assert.equal(registrationAttendeeCount({ guest_count: null }), 1);
});

test("spam cannot check in or enter any communication audience", () => {
  const spam = {
    status: "registered",
    review_classification: "spam" as const,
  };
  assert.equal(canCheckInRegistration(spam), false);
  assert.equal(isCommunicationEligible(spam, ["registered", "attended"]), false);
  assert.equal(
    isCommunicationEligible(
      { ...spam, review_classification: "normal" },
      ["registered", "attended"],
    ),
    true,
  );
});

test("payment due respects stored final price and legacy registrations", () => {
  assert.equal(
    isPaymentDueRegistration({
      status: "registered",
      amount_paid: 0,
      price_final_total: 0,
    }),
    false,
  );
  assert.equal(
    isPaymentDueRegistration({
      status: "registered",
      amount_paid: 0,
      price_final_total: 5000,
    }),
    true,
  );
  assert.equal(
    isPaymentDueRegistration({ status: "registered", amount_paid: 0 }),
    true,
  );
  assert.equal(
    isPaymentDueRegistration({
      status: "registered",
      amount_paid: 0,
      price_final_total: 5000,
      review_classification: "spam",
    }),
    false,
  );
});

test("spam-linked feedback is excluded for primary and group attendees", () => {
  const feedback = [
    { event_id: "event-1", person_id: "primary", person: { email: "primary@example.com" } },
    { event_id: "event-1", person_id: "guest", person: { email: "GUEST@example.com" } },
    { event_id: "event-1", person_id: "walk-in", person: { email: "walk-in@example.com" } },
    { event_id: "event-1", person_id: "blocked", person: { email: "blocked@example.com" } },
    { event_id: "event-2", person_id: "guest", person: { email: "guest@example.com" } },
  ];
  const registrations = [
    {
      event_id: "event-1",
      person_id: "primary",
      review_classification: "spam",
      person: { email: "primary@example.com" },
      attendees: [{ email: "guest@example.com" }],
    },
    {
      event_id: "event-1",
      person_id: "primary",
      review_classification: "normal",
      person: { email: "primary@example.com" },
      attendees: [{ email: "guest@example.com" }],
    },
    {
      event_id: "event-1",
      person_id: "blocked",
      review_classification: "spam",
      person: { email: "blocked@example.com" },
      attendees: [],
    },
  ];

  assert.deepEqual(
    filterSpamLinkedFeedback(feedback, registrations).map((row) => row.person_id),
    ["primary", "guest", "walk-in", "guest"],
  );
});
