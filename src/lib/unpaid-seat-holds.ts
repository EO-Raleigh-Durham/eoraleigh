// What the hourly sweep does with a paid event seat that is still held as
// pending_payment long after its checkout should have ended. Stripe is the
// source of truth, so a seat is only released when Stripe says nobody can
// still pay for it. Pure, so the rule is unit tested.

/** A hold is only looked at once its checkout (30 to 35 minutes) must be over. */
export const UNPAID_HOLD_MIN_AGE_MINUTES = 45;

/** How many holds one run checks, oldest first. */
export const UNPAID_HOLD_BATCH_LIMIT = 25;

// Staff are told about a paid but unrecorded checkout on the first few hourly
// runs only, so a payment nobody has fixed yet does not email every hour.
const PAID_HOLD_ALERT_WINDOW_MINUTES = UNPAID_HOLD_MIN_AGE_MINUTES + 3 * 60;

export type UnpaidHoldAction = "cancel" | "alert" | "leave";

/**
 * - No Stripe session was ever attached, or the session expired: cancel.
 * - The session was paid: never cancel. Alert staff while the hold is recent.
 * - The session is still open, or Stripe gave any other answer: leave it.
 */
export function decideUnpaidHold(input: {
  ageMinutes: number;
  stripeSessionId: string | null;
  session: { status: string | null; payment_status: string | null } | null;
}): UnpaidHoldAction {
  if (input.ageMinutes < UNPAID_HOLD_MIN_AGE_MINUTES) return "leave";
  if (!input.stripeSessionId) return "cancel";
  if (!input.session) return "leave";
  if (input.session.payment_status === "paid") {
    return input.ageMinutes < PAID_HOLD_ALERT_WINDOW_MINUTES ? "alert" : "leave";
  }
  return input.session.status === "expired" ? "cancel" : "leave";
}
