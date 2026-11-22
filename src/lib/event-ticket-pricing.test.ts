import assert from "node:assert/strict";
import test from "node:test";
// The supported currencies read chapter config at import time, so set a local
// currency before loading the module.
process.env.NEXT_PUBLIC_CHAPTER_LOCAL_CURRENCY = "JPY";
const { parseEventTicketPrice, resolveEventCheckoutCurrency } = await import(
  "./event-ticket-pricing.ts"
);

test("stores USD ticket prices in cents", () => {
  assert.deepEqual(parseEventTicketPrice("12.34", "usd"), {
    ok: true,
    currency: "USD",
    priceAmount: 1234,
  });
});

test("stores JPY ticket prices without multiplying by 100", () => {
  assert.deepEqual(parseEventTicketPrice("1200000", "jpy"), {
    ok: true,
    currency: "JPY",
    priceAmount: 1200000,
  });
});

test("rejects fractional values for zero-decimal currencies", () => {
  assert.deepEqual(parseEventTicketPrice("1200000.5", "JPY"), {
    ok: false,
    error: "Price must be a whole number for JPY",
  });
});

test("rejects missing or malformed currency codes", () => {
  assert.deepEqual(parseEventTicketPrice("100", ""), {
    ok: false,
    error: "Currency must be USD or JPY",
  });
  assert.deepEqual(parseEventTicketPrice("100", "US"), {
    ok: false,
    error: "Currency must be USD or JPY",
  });
});

test("rejects unsupported currencies instead of guessing their decimal scale", () => {
  assert.deepEqual(parseEventTicketPrice("50000", "CLP"), {
    ok: false,
    error: "Currency must be USD or JPY",
  });
});

test("rejects negative and non-numeric prices", () => {
  assert.deepEqual(parseEventTicketPrice("-1", "USD"), {
    ok: false,
    error: "Price must be a non-negative number",
  });
  assert.deepEqual(parseEventTicketPrice("not-a-price", "USD"), {
    ok: false,
    error: "Price must be a non-negative number",
  });
});

test("resolves the currency from the paid checkout items", () => {
  assert.deepEqual(
    resolveEventCheckoutCurrency([
      { amount: 0, currency: "USD" },
      { amount: 1200000, currency: "jpy" },
    ]),
    { ok: true, currency: "JPY" },
  );
});

test("rejects mixed paid currencies", () => {
  assert.deepEqual(
    resolveEventCheckoutCurrency([
      { amount: 1000, currency: "USD" },
      { amount: 1200000, currency: "JPY" },
    ]),
    { ok: false, error: "All paid checkout items must use one currency" },
  );
});
