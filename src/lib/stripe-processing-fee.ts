// The payer covers the card processing fee on paid event checkouts. Same
// gross-up as chapter-dues-2025/dues-config.ts: 3.5% (2.9% standard + 0.6%
// buffer for international cards) + $0.30 fixed, rounded up to the dollar.
// USD only; local-currency checkouts carry no fee until a rate is agreed.
const STRIPE_RATE = 0.035;
const STRIPE_FIXED_CENTS = 30;

export function stripeProcessingFeeFor(ticketTotal: number, currency: string): number {
  if (
    currency.toUpperCase() !== "USD" ||
    !Number.isSafeInteger(ticketTotal) ||
    ticketTotal <= 0
  ) {
    return 0;
  }
  const gross =
    Math.ceil((ticketTotal + STRIPE_FIXED_CENTS) / (1 - STRIPE_RATE) / 100) * 100;
  return gross - ticketTotal;
}

// The database price snapshot and amount_paid hold ticket revenue only. Map a
// Stripe total back to that ticket amount when it is exactly the snapshot plus
// the server-computed fee. Anything else passes through unchanged, so the
// existing amount checks still reject mismatches (and pre-fee sessions, whose
// total equals the snapshot, keep working).
export function ticketAmountFromStripeTotal(
  stripeTotal: number,
  ticketTotal: number | null,
  currency: string,
): number {
  if (ticketTotal == null) return stripeTotal;
  const fee = stripeProcessingFeeFor(ticketTotal, currency);
  return fee > 0 && stripeTotal === ticketTotal + fee ? ticketTotal : stripeTotal;
}
