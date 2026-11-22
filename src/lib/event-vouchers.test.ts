import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateVoucherPrice,
  isVoucherPercentage,
  normalizeVoucherCode,
  requirePaidVoucherPaymentIntent,
  resolveSingleActiveVoucherTicketId,
  summarizeVoucherRedemptions,
  voucherErrorMessage,
} from "./event-vouchers.ts";

test("normalizes voucher codes without changing their internal characters", () => {
  assert.equal(normalizeVoucherCode("  eoFriend  "), "EOFRIEND");
  assert.equal(normalizeVoucherCode(" yale-2026 "), "YALE-2026");
});

test("resolves only one unique active ticket for automatic voucher links", () => {
  assert.equal(
    resolveSingleActiveVoucherTicketId(["guest-ticket"], ["member-ticket", "guest-ticket"]),
    "guest-ticket",
  );
  assert.equal(
    resolveSingleActiveVoucherTicketId(
      ["guest-ticket", "guest-ticket"],
      ["member-ticket", "guest-ticket"],
    ),
    "guest-ticket",
  );
  assert.equal(
    resolveSingleActiveVoucherTicketId(
      ["member-ticket", "guest-ticket"],
      ["member-ticket", "guest-ticket"],
    ),
    null,
  );
  assert.equal(
    resolveSingleActiveVoucherTicketId(["inactive-ticket"], ["guest-ticket"]),
    null,
  );
});

test("accepts only integer percentages from 1 through 100", () => {
  assert.equal(isVoucherPercentage(1), true);
  assert.equal(isVoucherPercentage(50), true);
  assert.equal(isVoucherPercentage(100), true);
  assert.equal(isVoucherPercentage(0), false);
  assert.equal(isVoucherPercentage(101), false);
  assert.equal(isVoucherPercentage(50.5), false);
  assert.equal(isVoucherPercentage(Number.NaN), false);
});

test("requires a real payment intent for paid voucher fulfillment", () => {
  assert.equal(requirePaidVoucherPaymentIntent(" pi_123 "), "pi_123");
  assert.throws(() => requirePaidVoucherPaymentIntent(null), /payment intent/i);
  assert.throws(() => requirePaidVoucherPaymentIntent("  "), /payment intent/i);
});

test("rounds once on the full registration total", () => {
  const result = calculateVoucherPrice({
    code: " odd ",
    percentOff: 50,
    ticketTypeId: "ticket-1",
    unitPrice: 101,
    quantity: 3,
    currency: "usd",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    {
      baseTotal: result.baseTotal,
      discountTotal: result.discountTotal,
      finalTotal: result.finalTotal,
    },
    { baseTotal: 303, discountTotal: 152, finalTotal: 151 },
  );
});

test("calculates 1, 50, and 100 percent discounts", () => {
  const common = {
    code: "YALE",
    ticketTypeId: "ticket-1",
    unitPrice: 10_001,
    quantity: 1,
    currency: "USD",
  } as const;

  const one = calculateVoucherPrice({ ...common, percentOff: 1 });
  const fifty = calculateVoucherPrice({ ...common, percentOff: 50 });
  const full = calculateVoucherPrice({ ...common, percentOff: 100 });

  assert.equal(one.ok && one.discountTotal, 100);
  assert.equal(one.ok && one.finalTotal, 9_901);
  assert.equal(fifty.ok && fifty.discountTotal, 5_001);
  assert.equal(fifty.ok && fifty.finalTotal, 5_000);
  assert.equal(full.ok && full.discountTotal, 10_001);
  assert.equal(full.ok && full.finalTotal, 0);
  assert.equal(full.ok && full.requiresPayment, false);
});

test("prices group tickets as unit price times attendee quantity", () => {
  const result = calculateVoucherPrice({
    code: "EOFRIEND",
    percentOff: 50,
    ticketTypeId: "guest-ticket",
    unitPrice: 10_000,
    quantity: 2,
    currency: "usd",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.quantity, 2);
  assert.equal(result.baseTotal, 20_000);
  assert.equal(result.discountTotal, 10_000);
  assert.equal(result.finalTotal, 10_000);
  assert.equal(result.currency, "USD");
  assert.equal(result.snapshot.code, "EOFRIEND");
  assert.equal(Object.isFrozen(result.snapshot), true);
});

test("rejects invalid calculation inputs with public-safe errors", () => {
  const cases = [
    [{ code: "", percentOff: 50, ticketTypeId: "ticket", unitPrice: 100, quantity: 1, currency: "USD" }, "invalid_code"],
    [{ code: "X", percentOff: 0, ticketTypeId: "ticket", unitPrice: 100, quantity: 1, currency: "USD" }, "invalid_discount"],
    [{ code: "X", percentOff: 50, ticketTypeId: "", unitPrice: 100, quantity: 1, currency: "USD" }, "invalid_request"],
    [{ code: "X", percentOff: 50, ticketTypeId: "ticket", unitPrice: -1, quantity: 1, currency: "USD" }, "invalid_price"],
    [{ code: "X", percentOff: 50, ticketTypeId: "ticket", unitPrice: 100, quantity: 0, currency: "USD" }, "invalid_quantity"],
    [{ code: "X", percentOff: 50, ticketTypeId: "ticket", unitPrice: 100, quantity: 1, currency: "" }, "invalid_request"],
  ] as const;

  for (const [input, error] of cases) {
    assert.deepEqual(calculateVoucherPrice(input), { ok: false, error });
    assert.equal(typeof voucherErrorMessage(error), "string");
  }
});

test("rejects totals that cannot be represented safely in integer cents", () => {
  assert.deepEqual(
    calculateVoucherPrice({
      code: "X",
      percentOff: 50,
      ticketTypeId: "ticket",
      unitPrice: Number.MAX_SAFE_INTEGER,
      quantity: 2,
      currency: "USD",
    }),
    { ok: false, error: "invalid_price" },
  );
});

test("provides safe messages for availability and eligibility failures", () => {
  assert.match(voucherErrorMessage("unavailable"), /available/i);
  assert.match(voucherErrorMessage("ineligible_ticket"), /ticket/i);
  assert.match(voucherErrorMessage("limit_reached"), /limit/i);
  assert.match(voucherErrorMessage("email_limit_reached"), /email/i);
});

test("campaign metrics exclude spam and only treat redemptions as financial value", () => {
  assert.deepEqual(
    summarizeVoucherRedemptions([
      { state: "reserved", discountedSeatQuantity: 2, baseTotal: 20_000, discountTotal: 10_000, finalTotal: 10_000, reviewClassification: "normal" },
      { state: "redeemed", discountedSeatQuantity: 1, baseTotal: 10_000, discountTotal: 5_000, finalTotal: 5_000, reviewClassification: "normal" },
      { state: "released", discountedSeatQuantity: 1, baseTotal: 10_000, discountTotal: 5_000, finalTotal: 5_000, reviewClassification: "normal" },
      { state: "redeemed", discountedSeatQuantity: 3, baseTotal: 30_000, discountTotal: 15_000, finalTotal: 15_000, reviewClassification: "spam" },
    ]),
    {
      reservedSeats: 2,
      redeemedSeats: 1,
      releasedSeats: 1,
      baseTotal: 10_000,
      discountTotal: 5_000,
      netTotal: 5_000,
    },
  );
});
