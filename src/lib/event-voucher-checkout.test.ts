import assert from "node:assert/strict";
import test from "node:test";
import {
  canReleaseUnattachedVoucherCheckout,
  secureStandardCheckoutSession,
} from "./event-voucher-checkout.ts";

test("preserves reservations when Stripe checkout state is uncertain", () => {
  assert.equal(canReleaseUnattachedVoucherCheckout(null, false), false);
  assert.equal(canReleaseUnattachedVoucherCheckout("open", false), false);
  assert.equal(canReleaseUnattachedVoucherCheckout("complete", false), false);
});

test("releases only after Stripe confirms an unattached checkout cannot be paid", () => {
  assert.equal(canReleaseUnattachedVoucherCheckout("expired", false), true);
  assert.equal(canReleaseUnattachedVoucherCheckout("open", true), true);
});

test("accepts a standard checkout only after its session id is persisted", async () => {
  let expired = 0;
  let released = 0;

  const secured = await secureStandardCheckoutSession("open", {
    attach: async () => true,
    expire: async () => {
      expired += 1;
      return "expired";
    },
    release: async () => {
      released += 1;
    },
  });

  assert.equal(secured, true);
  assert.equal(expired, 0);
  assert.equal(released, 0);
});

test("expires and releases a standard checkout when session persistence fails", async () => {
  let released = 0;

  const secured = await secureStandardCheckoutSession("open", {
    attach: async () => false,
    expire: async () => "expired",
    release: async () => {
      released += 1;
    },
  });

  assert.equal(secured, false);
  assert.equal(released, 1);
});

test("preserves the registration when Stripe expiration is uncertain", async () => {
  let released = 0;

  const secured = await secureStandardCheckoutSession("open", {
    attach: async () => false,
    expire: async () => {
      throw new Error("Stripe unavailable");
    },
    release: async () => {
      released += 1;
    },
  });

  assert.equal(secured, false);
  assert.equal(released, 0);
});
