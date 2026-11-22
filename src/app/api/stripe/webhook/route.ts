import { NextRequest, NextResponse, after } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import {
  sendTicketEmail,
  isEmailConfigured,
  sendUnmatchedPaymentAlertEmail,
} from "@/lib/email";
import { ticketUrl } from "@/lib/tickets";
import { reportUnmatchedPayment } from "@/lib/unmatched-payment-alert";
import { requirePaidVoucherPaymentIntent } from "@/lib/event-vouchers";
import { getTeamRegistrationOffer } from "@/lib/event-team-invite-server";
import { eventPath } from "@/lib/events";
import { syncRegistrationToGuestSheet } from "@/lib/event-guest-sheet";
import { shouldSendEventTicketEmail } from "@/lib/event-ticket-email";
import {
  finalizeStandardEventCheckout,
  requireRegistrationReload,
} from "@/lib/stripe-webhook-finalization";
import { ticketAmountFromStripeTotal } from "@/lib/stripe-processing-fee";
import { isNonRefundableEvent, noShowFeeForEvent } from "@/lib/event-fee-overrides";
import { shouldCancelUnpaidCheckout } from "@/lib/event-checkout-recovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.error(
      "Stripe webhook called but STRIPE_WEBHOOK_SECRET is not set",
    );
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe signature verification failed:", message);
    return NextResponse.json(
      { error: `Invalid signature: ${message}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        try {
          await handleCheckoutSuccess(session);
        } catch (err) {
          // Stripe retries a failed webhook for a few days and then stops. Tell
          // staff now, so a buyer who paid is not left without a ticket.
          if (session.payment_status === "paid") {
            await reportUnmatchedPayment(
              unmatchedPayment(session, err instanceof Error ? err.message : String(err)),
              sendUnmatchedPaymentAlertEmail,
            );
          }
          throw err;
        }
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        await handleCheckoutFailure(event.data.object as Stripe.Checkout.Session);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function unmatchedPayment(session: Stripe.Checkout.Session, reason: string) {
  return {
    sessionId: session.id,
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null),
    registrationId: session.metadata?.registration_id ?? null,
    amountTotal: session.amount_total,
    currency: session.currency,
    reason,
  };
}

async function handleCheckoutSuccess(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") {
    console.log(
      `Stripe session ${session.id} not paid (status=${session.payment_status}); skipping`,
    );
    return;
  }

  // Chapter dues checkout: standalone payment, no registration row to update.
  // Stripe sends its own receipt; nothing more to do here.
  if (session.metadata?.type === "dues") {
    console.log(`Stripe dues payment received (session ${session.id})`);
    return;
  }

  // Late cancellation fee: standalone payment, no registration row to update.
  if (session.metadata?.type === "late_cancellation") {
    console.log(`Stripe late cancellation fee received (session ${session.id})`);
    return;
  }

  const registrationId = session.metadata?.registration_id;
  if (!registrationId) {
    await reportUnmatchedPayment(
      unmatchedPayment(session, "Stripe session is missing registration_id in metadata"),
      sendUnmatchedPaymentAlertEmail,
    );
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  if (session.metadata?.type === "event_voucher") {
    if (session.amount_total == null || !session.currency) {
      throw new Error("Voucher checkout is missing amount or currency");
    }
    const { data: voucherRegistration, error: voucherRegistrationError } = await supabase
      .from("event_registrations")
      .select("stripe_session_id, price_final_total, price_currency")
      .eq("id", registrationId)
      .maybeSingle();
    // Stripe charged the ticket plus the card processing fee; the snapshot and
    // amount_paid hold the ticket amount only.
    const voucherTicketAmount = ticketAmountFromStripeTotal(
      session.amount_total,
      voucherRegistration?.price_final_total ?? null,
      session.currency,
    );
    if (
      voucherRegistrationError ||
      !voucherRegistration ||
      voucherRegistration.stripe_session_id !== session.id ||
      voucherRegistration.price_final_total !== voucherTicketAmount ||
      voucherRegistration.price_currency !== session.currency.toUpperCase()
    ) {
      throw new Error("Voucher checkout session, amount, or currency mismatch");
    }
    const paidVoucherPaymentIntentId = requirePaidVoucherPaymentIntent(paymentIntentId);
    const { data: finalized, error: finalizeError } = await supabase.rpc(
      "finalize_voucher_registration",
      {
        p_registration_id: registrationId,
        p_stripe_session_id: session.id,
        p_stripe_payment_intent_id: paidVoucherPaymentIntentId,
        p_amount_paid: voucherTicketAmount,
        p_currency: session.currency,
      },
    );
    if (finalizeError || finalized !== true) {
      throw new Error(finalizeError?.message ?? "Voucher checkout could not be finalized");
    }
  } else {
    const { data: standardRegistration, error: standardRegistrationError } = await supabase
      .from("event_registrations")
      .select("price_final_total")
      .eq("id", registrationId)
      .maybeSingle();
    if (standardRegistrationError) {
      throw new Error(standardRegistrationError.message);
    }
    await finalizeStandardEventCheckout(
      {
        registrationId,
        sessionId: session.id,
        paymentIntentId,
        amountTotal: session.amount_total == null || !session.currency
          ? session.amount_total
          : ticketAmountFromStripeTotal(
              session.amount_total,
              standardRegistration?.price_final_total ?? null,
              session.currency,
            ),
        currency: session.currency,
      },
      {
        verifySnapshot: async (params) =>
          supabase.rpc("snapshot_standard_registration_price", params),
        finalize: async (params) =>
          supabase.rpc("finalize_standard_event_registration", params),
      },
    );
  }

  // Mirror the paid registration to the organiser guest-list sheet (dormant until the script URL is set,
  // never throws; the sheet sync de-duplicates by email so retries are safe).
  after(() => syncRegistrationToGuestSheet(registrationId));

  // Send the ticket email once (best-effort, env-flagged). Guarded by
  // confirmation_sent_at so Stripe webhook retries never double-send.
  if (!isEmailConfigured()) return;

  const { data: reg, error: registrationError } = await supabase
    .from("event_registrations")
    .select(
      "ticket_code, confirmation_sent_at, review_classification, status, voucher_id, ticket_type:event_ticket_types!event_registrations_ticket_type_id_fkey(name, price_amount), person:people!event_registrations_person_id_fkey(name, email), event:events!event_registrations_event_id_fkey(id, slug, title, type, starts_at, ends_at, location)",
    )
    .eq("id", registrationId)
    .maybeSingle();

  const r = requireRegistrationReload({
    data: reg as unknown as {
      ticket_code: string | null;
      confirmation_sent_at: string | null;
      review_classification: string;
      status: string;
      voucher_id: string | null;
      ticket_type: { name: string; price_amount: number } | null;
      person: { name: string | null; email: string } | null;
      event: {
        id: string;
        slug: string | null;
        title: string;
        type: string | null;
        starts_at: string;
        ends_at: string | null;
        location: string | null;
      } | null;
    } | null,
    error: registrationError,
  });

  if (
    r.review_classification === "spam" ||
    !shouldSendEventTicketEmail({
      status: r.status,
      confirmationSentAt: r.confirmation_sent_at,
    }) ||
    !r.ticket_code ||
    !r.person?.email ||
    !r.event
  ) {
    return;
  }

  let origin = process.env.NEXT_PUBLIC_SITE_URL || "";
  if (!origin && session.success_url) {
    try {
      origin = new URL(session.success_url).origin;
    } catch {
      /* ignore — fall back to a relative link */
    }
  }

  const teamRegistration = await getTeamRegistrationOffer({
    eventId: r.event.id,
    eventPublicPath: eventPath(r.event),
    inviterTicketCode: r.ticket_code,
    source: {
      status: r.status,
      reviewClassification: r.review_classification,
      voucherId: r.voucher_id,
      ticketName: r.ticket_type?.name ?? null,
      amountPaid: session.amount_total ?? 0,
    },
    origin,
  });

  const sent = await sendTicketEmail({
    to: r.person.email,
    name: r.person.name,
    eventTitle: r.event.title,
    startsAt: r.event.starts_at,
    endsAt: r.event.ends_at,
    location: r.event.location,
    ticketUrl: ticketUrl(r.ticket_code, origin),
    ticketCode: r.ticket_code,
    teamRegistration: teamRegistration ?? undefined,
    noShowFeeUsd: noShowFeeForEvent(r.event),
    nonRefundable: isNonRefundableEvent(r.event),
  });

  if (sent) {
    await supabase
      .from("event_registrations")
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("id", registrationId);
  }
}

async function handleCheckoutFailure(session: Stripe.Checkout.Session) {
  const registrationId = session.metadata?.registration_id;
  if (!registrationId) return;

  if (session.metadata?.type === "event_voucher") {
    const { error } = await supabase.rpc("release_voucher_registration", {
      p_registration_id: registrationId,
      p_stripe_session_id: session.id,
      p_reason: session.status === "expired" ? "checkout_expired" : "payment_failed",
    });
    if (error) throw new Error(error.message);
    return;
  }

  // An earlier checkout session can expire while a later attempt for the same
  // registration is open. Only the session attached to the registration (or
  // one that was never attached) may cancel it.
  const { data: registration, error: lookupError } = await supabase
    .from("event_registrations")
    .select("status, stripe_session_id")
    .eq("id", registrationId)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!shouldCancelUnpaidCheckout(registration, session.id)) return;

  const { error } = await supabase
    .from("event_registrations")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: "payment_not_completed",
    })
    .eq("id", registrationId)
    .eq("status", "pending_payment");

  if (error) {
    console.error("Failed to cancel unpaid registration:", error.message);
    throw new Error(error.message);
  }
}
