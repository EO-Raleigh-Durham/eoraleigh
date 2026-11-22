"use server";

import { stripe, isStripeConfigured } from "@/lib/stripe";
import { duesYearLabel, duesYearDash, duesWindow } from "@/lib/dues";
import { CHAPTER_NAME, CHAPTER_SITE_URL } from "@/kernel/config/chapter";

const DUES_AMOUNT = 220000; // $2,200.00 in cents — net amount the chapter receives
const DUES_CURRENCY = "usd";
const DUES_LABEL = `${CHAPTER_NAME} Local Chapter Dues ${duesYearLabel()}`;

// Gross-up so the chapter nets DUES_AMOUNT after Stripe takes their cut.
// Using 3.5% to cover 2.9% standard + 0.6% buffer for international cards.
// Formula: gross = (dues + fixed_fee_cents) / (1 - rate), rounded up to nearest dollar.
const STRIPE_RATE = 0.035;
const STRIPE_FIXED_CENTS = 30; // $0.30
const GROSS_AMOUNT =
  Math.ceil((DUES_AMOUNT + STRIPE_FIXED_CENTS) / (1 - STRIPE_RATE) / 100) * 100;
const PROCESSING_FEE = GROSS_AMOUNT - DUES_AMOUNT; // shown as a separate line item

type Result = { ok: true; checkoutUrl: string } | { ok: false; error: string };

export async function createDuesCheckout(formData: FormData): Promise<Result> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Payment is not configured. Please contact the chapter." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();

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
            currency: DUES_CURRENCY,
            product_data: {
              name: DUES_LABEL,
              description: `Membership year: ${duesWindow()}`,
            },
            unit_amount: DUES_AMOUNT,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: DUES_CURRENCY,
            product_data: {
              name: "Payment processing fee",
              description: "Card processing fee passed to member",
            },
            unit_amount: PROCESSING_FEE,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/chapter-dues?paid=1`,
      cancel_url: `${origin}/chapter-dues?cancelled=1`,
      metadata: {
        type: "dues",
        dues_year: duesYearDash(),
        member_name: name,
        company: company || "",
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
