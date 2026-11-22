import { toMajorUnits } from "./currency.ts";

// A Stripe payment the webhook could not record against a registration. The
// buyer may have been charged without a ticket, so staff must hear about it.

export type UnmatchedPayment = {
  sessionId: string;
  paymentIntentId: string | null;
  registrationId: string | null;
  amountTotal: number | null;
  currency: string | null;
  reason: string;
};

export function unmatchedPaymentMessage(payment: UnmatchedPayment): string {
  const amount =
    payment.amountTotal != null && payment.currency
      ? `${toMajorUnits(payment.amountTotal, payment.currency)} ${payment.currency.toUpperCase()}`
      : "unknown";
  return [
    "Stripe payment could not be matched to an event registration. The buyer may have paid without getting a ticket.",
    `Stripe session: ${payment.sessionId}`,
    `Payment intent: ${payment.paymentIntentId ?? "none"}`,
    `Registration: ${payment.registrationId ?? "none"}`,
    `Amount: ${amount}`,
    `Reason: ${payment.reason}`,
    "Check the payment in Stripe, then fix the registration or refund by hand. Nothing is refunded automatically. Stripe may send this again while it retries.",
  ].join("\n");
}

/**
 * Log the unmatched payment and tell staff. Never throws: a failed alert must
 * not change how the webhook answers Stripe.
 */
export async function reportUnmatchedPayment(
  payment: UnmatchedPayment,
  notify: (message: string) => Promise<unknown>,
): Promise<void> {
  const message = unmatchedPaymentMessage(payment);
  console.error(message);
  try {
    await notify(message);
  } catch (err) {
    console.error("Unmatched payment alert could not be sent:", err);
  }
}
