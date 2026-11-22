import assert from "node:assert/strict";
import test from "node:test";
import {
  finalizeStandardEventCheckout,
  requireRegistrationReload,
} from "./stripe-webhook-finalization.ts";

const checkout = {
  registrationId: "registration-1",
  sessionId: "cs_test_standard",
  paymentIntentId: "pi_test_standard",
  amountTotal: 25000,
  currency: "usd",
};

test("standard webhook replay repeats the same exact verification and finalization", async () => {
  const snapshots: unknown[] = [];
  const finalizations: unknown[] = [];
  const persistence = {
    verifySnapshot: async (input: unknown) => {
      snapshots.push(input);
      return { data: true, error: null };
    },
    finalize: async (input: unknown) => {
      finalizations.push(input);
      return { data: true, error: null };
    },
  };

  await finalizeStandardEventCheckout(checkout, persistence);
  await finalizeStandardEventCheckout(checkout, persistence);

  const expectedSnapshot = {
    p_registration_id: "registration-1",
    p_amount: 25000,
    p_currency: "USD",
    p_stripe_session_id: "cs_test_standard",
  };
  const expectedFinalization = {
    p_registration_id: "registration-1",
    p_stripe_session_id: "cs_test_standard",
    p_stripe_payment_intent_id: "pi_test_standard",
    p_amount_paid: 25000,
    p_currency: "USD",
  };
  assert.deepEqual(snapshots, [expectedSnapshot, expectedSnapshot]);
  assert.deepEqual(finalizations, [expectedFinalization, expectedFinalization]);
});

test("standard webhook rejects incomplete or mismatched payment facts", async () => {
  let finalizations = 0;
  const persistence = {
    verifySnapshot: async () => ({ data: true, error: null }),
    finalize: async () => {
      finalizations += 1;
      return { data: true, error: null };
    },
  };

  await assert.rejects(
    finalizeStandardEventCheckout({ ...checkout, amountTotal: null }, persistence),
    /missing amount or currency/i,
  );
  await assert.rejects(
    finalizeStandardEventCheckout({ ...checkout, currency: null }, persistence),
    /missing amount or currency/i,
  );
  await assert.rejects(
    finalizeStandardEventCheckout({ ...checkout, paymentIntentId: null }, persistence),
    /missing payment intent/i,
  );
  await assert.rejects(
    finalizeStandardEventCheckout(checkout, {
      ...persistence,
      verifySnapshot: async () => ({
        data: null,
        error: { message: "checkout amount or currency mismatch" },
      }),
    }),
    /checkout amount or currency mismatch/i,
  );
  await assert.rejects(
    finalizeStandardEventCheckout(checkout, {
      ...persistence,
      verifySnapshot: async () => ({ data: false, error: null }),
    }),
    /price could not be verified/i,
  );
  await assert.rejects(
    finalizeStandardEventCheckout(checkout, {
      verifySnapshot: async () => ({ data: true, error: null }),
      finalize: async () => ({
        data: null,
        error: { message: "checkout does not match active registration" },
      }),
    }),
    /checkout does not match active registration/i,
  );
  await assert.rejects(
    finalizeStandardEventCheckout(checkout, {
      verifySnapshot: async () => ({ data: true, error: null }),
      finalize: async () => ({ data: false, error: null }),
    }),
    /could not be finalized/i,
  );
  assert.equal(finalizations, 0);
});

test("registration reload failures remain retryable webhook errors", () => {
  assert.throws(
    () => requireRegistrationReload({ data: null, error: { message: "database unavailable" } }),
    /database unavailable/i,
  );
  assert.throws(
    () => requireRegistrationReload({ data: null, error: null }),
    /registration not found/i,
  );
  assert.deepEqual(
    requireRegistrationReload({ data: { id: "registration-1" }, error: null }),
    { id: "registration-1" },
  );
});
