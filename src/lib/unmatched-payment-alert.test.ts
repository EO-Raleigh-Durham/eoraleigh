import assert from "node:assert/strict";
import test from "node:test";
import { reportUnmatchedPayment, unmatchedPaymentMessage } from "./unmatched-payment-alert.ts";

const payment = {
  sessionId: "cs_test_unmatched",
  paymentIntentId: "pi_test_unmatched",
  registrationId: "registration-1",
  amountTotal: 25750,
  currency: "usd",
  reason: "registration is not an active standard checkout",
};

async function captureErrors(run: () => Promise<void>): Promise<unknown[][]> {
  const original = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };
  try {
    await run();
  } finally {
    console.error = original;
  }
  return logged;
}

test("the alert names the Stripe session, payment, registration, amount and reason", () => {
  const message = unmatchedPaymentMessage(payment);

  assert.match(message, /cs_test_unmatched/);
  assert.match(message, /pi_test_unmatched/);
  assert.match(message, /registration-1/);
  assert.match(message, /257\.5 USD/);
  assert.match(message, /registration is not an active standard checkout/);
  assert.match(message, /Nothing is refunded automatically/);
});

test("the alert still reads clearly when Stripe sent no ids or amount", () => {
  const message = unmatchedPaymentMessage({
    ...payment,
    paymentIntentId: null,
    registrationId: null,
    amountTotal: null,
    currency: null,
  });

  assert.match(message, /Payment intent: none/);
  assert.match(message, /Registration: none/);
  assert.match(message, /Amount: unknown/);
});

test("an unmatched payment is logged as an error and sent to staff", async () => {
  const sent: string[] = [];

  const logged = await captureErrors(() =>
    reportUnmatchedPayment(payment, async (message) => {
      sent.push(message);
      return true;
    }),
  );

  assert.equal(sent.length, 1);
  assert.match(sent[0], /cs_test_unmatched/);
  assert.equal(logged.length, 1);
  assert.match(String(logged[0][0]), /pi_test_unmatched/);
});

test("a failed staff alert is logged and never changes the webhook outcome", async () => {
  const logged = await captureErrors(() =>
    reportUnmatchedPayment(payment, async () => {
      throw new Error("Lark is down");
    }),
  );

  assert.equal(logged.length, 2);
  assert.match(String(logged[1][0]), /alert could not be sent/);
});
