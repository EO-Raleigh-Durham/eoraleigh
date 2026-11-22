import assert from "node:assert/strict";
import test from "node:test";
import { UNPAID_HOLD_MIN_AGE_MINUTES, decideUnpaidHold } from "./unpaid-seat-holds.ts";

const old = UNPAID_HOLD_MIN_AGE_MINUTES + 5;
const expired = { status: "expired", payment_status: "unpaid" };
const open = { status: "open", payment_status: "unpaid" };
const paid = { status: "complete", payment_status: "paid" };

test("a hold younger than the checkout lifetime is never touched", () => {
  for (const session of [null, expired, open, paid]) {
    assert.equal(
      decideUnpaidHold({ ageMinutes: 44, stripeSessionId: session ? "cs_1" : null, session }),
      "leave",
    );
  }
});

test("an old hold with no Stripe session is cancelled", () => {
  assert.equal(
    decideUnpaidHold({ ageMinutes: old, stripeSessionId: null, session: null }),
    "cancel",
  );
});

test("an old hold whose Stripe session expired is cancelled", () => {
  assert.equal(
    decideUnpaidHold({ ageMinutes: old, stripeSessionId: "cs_1", session: expired }),
    "cancel",
  );
});

test("a hold whose Stripe session is still open is left alone", () => {
  assert.equal(
    decideUnpaidHold({ ageMinutes: old, stripeSessionId: "cs_1", session: open }),
    "leave",
  );
});

test("a hold is left alone when Stripe could not be asked about its session", () => {
  assert.equal(
    decideUnpaidHold({ ageMinutes: old, stripeSessionId: "cs_1", session: null }),
    "leave",
  );
});

test("a paid session is never cancelled and staff are alerted while it is recent", () => {
  assert.equal(
    decideUnpaidHold({ ageMinutes: old, stripeSessionId: "cs_1", session: paid }),
    "alert",
  );
  assert.equal(
    decideUnpaidHold({ ageMinutes: 60 * 24, stripeSessionId: "cs_1", session: paid }),
    "leave",
  );
  // Paid wins even if Stripe reports an unexpected session status.
  assert.equal(
    decideUnpaidHold({
      ageMinutes: old,
      stripeSessionId: "cs_1",
      session: { status: "expired", payment_status: "paid" },
    }),
    "alert",
  );
});

test("a completed session that is not paid yet is left for the webhook", () => {
  assert.equal(
    decideUnpaidHold({
      ageMinutes: old,
      stripeSessionId: "cs_1",
      session: { status: "complete", payment_status: "unpaid" },
    }),
    "leave",
  );
});
