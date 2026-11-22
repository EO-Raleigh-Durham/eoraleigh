// Recovery rules for a Stripe event checkout that expired, was abandoned, or
// timed out while it was being created. Pure, so each rule is unit tested.

const CHECKOUT_MIN_LIFETIME_SECONDS = 30 * 60;
const CHECKOUT_BUCKET_SECONDS = 5 * 60;

/**
 * The Stripe expiry time (in seconds) for a checkout created now.
 *
 * Stripe replays an idempotent request only when the key and the request body
 * both match, and rejects the same key with a different body. The expiry is
 * part of the body, so it is rounded up to a five-minute boundary (30 to 35
 * minutes from now) and the caller adds it to the idempotency key. A retry
 * moments after a timeout sends the same key and body and gets the original
 * session back; a later retry sends a new key with its new expiry instead of
 * being rejected.
 */
export function stableCheckoutExpiry(nowMs: number): number {
  const nowSeconds = Math.floor(nowMs / 1000);
  return (
    (Math.floor(nowSeconds / CHECKOUT_BUCKET_SECONDS) + 1) * CHECKOUT_BUCKET_SECONDS +
    CHECKOUT_MIN_LIFETIME_SECONDS
  );
}

/**
 * Whether a registration is the leftover of a checkout that was never paid.
 * Only such a row may be removed so the same person can register again.
 */
export function isAbandonedUnpaidRegistration(registration: {
  status: string;
  cancellation_reason: string | null;
  amount_paid: number | null;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
}): boolean {
  return (
    registration.status === "cancelled" &&
    registration.cancellation_reason === "payment_not_completed" &&
    registration.amount_paid == null &&
    registration.paid_at == null &&
    registration.stripe_payment_intent_id == null
  );
}

/**
 * Whether a new submission asks for the same order as the unpaid checkout the
 * buyer already has. Only then may the open Stripe checkout be resumed: it
 * charges the stored order, so resuming it for a changed order would charge
 * one thing and record another.
 */
export function isSameCheckoutOrder(
  stored: {
    ticket_type_id: string | null;
    guest_count: number | null;
    price_final_total: number | null;
  },
  submitted: { ticketTypeId: string | null; guestCount: number; total: number },
): boolean {
  return (
    stored.ticket_type_id === submitted.ticketTypeId &&
    (stored.guest_count ?? 0) === submitted.guestCount &&
    stored.price_final_total === submitted.total
  );
}

export type ChangedCheckoutStep = "already_paid" | "expire" | "replace" | "retry";

/**
 * What to do with the old Stripe checkout when the buyer changed their order.
 * The pending registration may only be replaced once nobody can pay the old
 * checkout any more: it was never created, or Stripe confirms it is expired.
 */
export function changedCheckoutStep(
  session: { status: string | null; payment_status: string | null } | null,
): ChangedCheckoutStep {
  if (!session) return "replace";
  if (session.payment_status === "paid" || session.status === "complete") return "already_paid";
  if (session.status === "expired") return "replace";
  if (session.status === "open") return "expire";
  return "retry";
}

/**
 * Whether an expired or failed Stripe session may cancel a registration. The
 * registration must still be unpaid, and must not be attached to a different
 * session: a later attempt may be open while an earlier session expires.
 */
export function shouldCancelUnpaidCheckout(
  registration: { status: string; stripe_session_id: string | null } | null,
  sessionId: string,
): boolean {
  return (
    !!registration &&
    registration.status === "pending_payment" &&
    (registration.stripe_session_id == null || registration.stripe_session_id === sessionId)
  );
}
