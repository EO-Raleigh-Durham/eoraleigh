import Stripe from "stripe";
import { formatMoney } from "@/lib/currency";

// Server-only Stripe client. NEVER import from a client component.
// Uses the secret key. Lazy: missing env vars print a warning but
// do not crash, so dev still runs without credentials.

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  console.warn(
    "STRIPE_SECRET_KEY not configured. Paid event checkout will not work.",
  );
}

export const stripe = new Stripe(secretKey || "sk_placeholder", {
  typescript: true,
});

export function isStripeConfigured(): boolean {
  return Boolean(secretKey);
}

// Format a price_amount (smallest currency unit, or the literal amount for
// a zero-decimal currency like JPY) for display.
export function formatPrice(amount: number, currency: string = "USD"): string {
  return formatMoney(amount, currency);
}
