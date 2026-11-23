"use server";

import { stripe, isStripeConfigured } from "@/lib/stripe";
import { duesYearLabel, duesYearDash, duesWindow, grossUpForCard } from "@/lib/dues";
import { getOpenDuesYear } from "@/lib/dues-server";
import { CHAPTER_NAME, CHAPTER_SITE_URL } from "@/kernel/config/chapter";

const DUES_CURRENCY = "usd";

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

  // Year and amount come from the board's open dues year, never the browser.
  const dues = await getOpenDuesYear();
  if (!dues) return { ok: false, error: "Dues for the new membership year are not open yet. Please contact the chapter." };
  const DUES_AMOUNT = dues.primaryCents;
  const PROCESSING_FEE = grossUpForCard(DUES_AMOUNT).feeCents;
  const DUES_LABEL = `${CHAPTER_NAME} Local Chapter Dues ${duesYearLabel(dues.fyStart)}`;

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
              description: `Membership year: ${duesWindow(dues.fyStart)}`,
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
        dues_year: duesYearDash(dues.fyStart),
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
