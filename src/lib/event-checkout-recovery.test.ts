import assert from "node:assert/strict";
import test from "node:test";
import {
  changedCheckoutStep,
  isAbandonedUnpaidRegistration,
  isSameCheckoutOrder,
  shouldCancelUnpaidCheckout,
  stableCheckoutExpiry,
} from "./event-checkout-recovery.ts";

// 2026-11-21T03:01:10Z, seventy seconds into a five-minute bucket.
const NOW = Date.UTC(2026, 10, 21, 3, 1, 10);

test("a retry moments after a Stripe timeout sends the same expiry", () => {
  assert.equal(stableCheckoutExpiry(NOW + 45_000), stableCheckoutExpiry(NOW));
});

test("a later retry gets a new expiry, and so a new idempotency key", () => {
  assert.notEqual(stableCheckoutExpiry(NOW + 10 * 60_000), stableCheckoutExpiry(NOW));
});

test("the checkout always stays open between 30 and 35 minutes", () => {
  for (let offsetSeconds = 0; offsetSeconds < 600; offsetSeconds += 1) {
    const nowMs = NOW + offsetSeconds * 1000 + 999;
    const lifetime = stableCheckoutExpiry(nowMs) - Math.floor(nowMs / 1000);

    assert.ok(lifetime > 30 * 60, `lifetime ${lifetime}s at offset ${offsetSeconds}s`);
    assert.ok(lifetime <= 35 * 60, `lifetime ${lifetime}s at offset ${offsetSeconds}s`);
  }
});

const abandoned = {
  status: "cancelled",
  cancellation_reason: "payment_not_completed",
  amount_paid: null,
  paid_at: null,
  stripe_payment_intent_id: null,
};

test("an expired, never-paid checkout no longer blocks a new attempt", () => {
  assert.equal(isAbandonedUnpaidRegistration(abandoned), true);
});

test("a registration with any sign of payment is never treated as abandoned", () => {
  assert.equal(isAbandonedUnpaidRegistration({ ...abandoned, amount_paid: 25000 }), false);
  assert.equal(isAbandonedUnpaidRegistration({ ...abandoned, amount_paid: 0 }), false);
  assert.equal(
    isAbandonedUnpaidRegistration({ ...abandoned, paid_at: "2026-11-21T03:00:00Z" }),
    false,
  );
  assert.equal(
    isAbandonedUnpaidRegistration({ ...abandoned, stripe_payment_intent_id: "pi_test" }),
    false,
  );
});

test("active registrations and other cancellations still block a duplicate", () => {
  for (const status of ["registered", "attended", "waitlisted", "pending_payment", "no_show"]) {
    assert.equal(isAbandonedUnpaidRegistration({ ...abandoned, status }), false, status);
  }
  assert.equal(
    isAbandonedUnpaidRegistration({ ...abandoned, cancellation_reason: null }),
    false,
  );
  assert.equal(
    isAbandonedUnpaidRegistration({ ...abandoned, cancellation_reason: "member_request" }),
    false,
  );
});

test("an expired session cancels its own unpaid registration", () => {
  assert.equal(
    shouldCancelUnpaidCheckout({ status: "pending_payment", stripe_session_id: "cs_1" }, "cs_1"),
    true,
  );
  assert.equal(
    shouldCancelUnpaidCheckout({ status: "pending_payment", stripe_session_id: null }, "cs_1"),
    true,
  );
});

test("an earlier session expiring does not cancel a later open checkout", () => {
  assert.equal(
    shouldCancelUnpaidCheckout({ status: "pending_payment", stripe_session_id: "cs_2" }, "cs_1"),
    false,
  );
});

test("an expired session never touches a paid or missing registration", () => {
  assert.equal(
    shouldCancelUnpaidCheckout({ status: "registered", stripe_session_id: "cs_1" }, "cs_1"),
    false,
  );
  assert.equal(
    shouldCancelUnpaidCheckout({ status: "attended", stripe_session_id: "cs_1" }, "cs_1"),
    false,
  );
  assert.equal(shouldCancelUnpaidCheckout(null, "cs_1"), false);
});

const storedOrder = { ticket_type_id: "ticket-guest", guest_count: 0, price_final_total: 2500000 };
const sameOrder = { ticketTypeId: "ticket-guest", guestCount: 0, total: 2500000 };

test("the same ticket, guests and total resumes the existing checkout", () => {
  assert.equal(isSameCheckoutOrder(storedOrder, sameOrder), true);
  assert.equal(
    isSameCheckoutOrder({ ...storedOrder, guest_count: null }, sameOrder),
    true,
  );
  assert.equal(
    isSameCheckoutOrder(
      { ticket_type_id: null, guest_count: 2, price_final_total: 300 },
      { ticketTypeId: null, guestCount: 2, total: 300 },
    ),
    true,
  );
});

test("a different ticket, guest count or total is a changed order", () => {
  assert.equal(isSameCheckoutOrder(storedOrder, { ...sameOrder, ticketTypeId: "ticket-member" }), false);
  assert.equal(isSameCheckoutOrder(storedOrder, { ...sameOrder, ticketTypeId: null }), false);
  assert.equal(isSameCheckoutOrder(storedOrder, { ...sameOrder, guestCount: 2 }), false);
  assert.equal(isSameCheckoutOrder(storedOrder, { ...sameOrder, total: 7500000 }), false);
});

test("a stored order with no recorded total is never resumed as the same order", () => {
  assert.equal(
    isSameCheckoutOrder({ ...storedOrder, price_final_total: null }, sameOrder),
    false,
  );
});

test("a changed order replaces the registration only when the old checkout cannot be paid", () => {
  assert.equal(changedCheckoutStep(null), "replace");
  assert.equal(changedCheckoutStep({ status: "expired", payment_status: "unpaid" }), "replace");
  assert.equal(changedCheckoutStep({ status: "open", payment_status: "unpaid" }), "expire");
});

test("a changed order never replaces a checkout that was paid or completed", () => {
  assert.equal(changedCheckoutStep({ status: "complete", payment_status: "paid" }), "already_paid");
  assert.equal(changedCheckoutStep({ status: "complete", payment_status: "unpaid" }), "already_paid");
  assert.equal(changedCheckoutStep({ status: "expired", payment_status: "paid" }), "already_paid");
});

test("an unknown Stripe answer changes nothing", () => {
  assert.equal(changedCheckoutStep({ status: null, payment_status: null }), "retry");
});
