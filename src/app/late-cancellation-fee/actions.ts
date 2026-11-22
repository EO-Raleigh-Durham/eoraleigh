"use server";

import { stripe, isStripeConfigured } from "@/lib/stripe";
import { CHAPTER_NAME, CHAPTER_SITE_URL } from "@/kernel/config/chapter";

const FEE_AMOUNT = 10000; // $100.00 in cents — net amount the chapter receives
const FEE_CURRENCY = "usd";
const FEE_LABEL = `${CHAPTER_NAME} Event Late Cancellation Fee`;

// Gross-up so the chapter nets FEE_AMOUNT after Stripe takes their cut.
// The member pays the card fee, the chapter does not.
// Using 3.5% to cover 2.9% standard + 0.6% buffer for international cards.
// Formula: gross = (fee + fixed_fee_cents) / (1 - rate), rounded up to nearest dollar.
const STRIPE_RATE = 0.035;
const STRIPE_FIXED_CENTS = 30; // $0.30
const GROSS_AMOUNT =
  Math.ceil((FEE_AMOUNT + STRIPE_FIXED_CENTS) / (1 - STRIPE_RATE) / 100) * 100;
const PROCESSING_FEE = GROSS_AMOUNT - FEE_AMOUNT; // shown as a separate line item

type Result = { ok: true; checkoutUrl: string } | { ok: false; error: string };

export async function createLateCancellationCheckout(
  formData: FormData,
): Promise<Result> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Payment is not configured. Please contact the chapter." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const eventName = String(formData.get("event") ?? "").trim();

  if (!name || !email) {
    return { ok: false, error: "Please enter your name and email." };
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || CHAPTER_SITE_URL;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: FEE_CURRENCY,
            product_data: {
              name: FEE_LABEL,
              description: "Cancellation within 48 hours of the event",
            },
            unit_amount: FEE_AMOUNT,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: FEE_CURRENCY,
            product_data: {
              name: "Payment processing fee",
              description: "Card processing fee paid by the member",
            },
            unit_amount: PROCESSING_FEE,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/late-cancellation-fee?paid=1`,
      cancel_url: `${origin}/late-cancellation-fee?cancelled=1`,
      metadata: {
        type: "late_cancellation",
        member_name: name,
        event: eventName || "",
      },
    });

    if (!session.url) {
      return { ok: false, error: "Checkout session URL missing. Please try again." };
    }

    return { ok: true, checkoutUrl: session.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return { ok: false, error: `Could not start checkout: ${message}` };
  }
}
