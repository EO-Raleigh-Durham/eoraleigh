import assert from "node:assert/strict";
import test from "node:test";

import {
  stripeProcessingFeeFor,
  ticketAmountFromStripeTotal,
} from "./stripe-processing-fee.ts";

test("grosses a USD ticket total up to a whole dollar", () => {
  // (5000 + 30) / 0.965 = 5212.4 -> $53.00
  assert.equal(stripeProcessingFeeFor(5000, "USD"), 300);
  assert.equal(stripeProcessingFeeFor(10000, "usd"), 400);
  for (const net of [100, 2500, 5000, 10000, 999999]) {
    const fee = stripeProcessingFeeFor(net, "USD");
    assert.equal((net + fee) % 100, 0);
    assert.ok(fee >= 30);
  }
});

test("charges no fee for JPY, free, or invalid totals", () => {
  assert.equal(stripeProcessingFeeFor(1200000, "JPY"), 0);
  assert.equal(stripeProcessingFeeFor(0, "USD"), 0);
  assert.equal(stripeProcessingFeeFor(-100, "USD"), 0);
  assert.equal(stripeProcessingFeeFor(50.5, "USD"), 0);
});

test("maps an exact fee-inclusive Stripe total back to the ticket amount", () => {
  assert.equal(ticketAmountFromStripeTotal(5300, 5000, "usd"), 5000);
});

test("passes other Stripe totals through so amount checks still reject them", () => {
  // Pre-fee session: total already equals the snapshot.
  assert.equal(ticketAmountFromStripeTotal(5000, 5000, "USD"), 5000);
  // Wrong amount stays wrong.
  assert.equal(ticketAmountFromStripeTotal(5200, 5000, "USD"), 5200);
  // No snapshot to compare against.
  assert.equal(ticketAmountFromStripeTotal(5300, null, "USD"), 5300);
  // JPY has no fee.
  assert.equal(ticketAmountFromStripeTotal(1200000, 1200000, "JPY"), 1200000);
});
