// Hourly: releases paid event seats still held as pending_payment long after
// their Stripe checkout ended (for example when the expiry webhook never
// arrived). Rules live in src/lib/unpaid-seat-holds.ts. Voucher registrations
// are skipped: they have their own release function.
// Refuses any request without the CRON_SECRET bearer (Vercel cron sends it).

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import { sendUnmatchedPaymentAlertEmail } from "@/lib/email";
import { reportUnmatchedPayment } from "@/lib/unmatched-payment-alert";
import {
  UNPAID_HOLD_BATCH_LIMIT,
  UNPAID_HOLD_MIN_AGE_MINUTES,
  decideUnpaidHold,
} from "@/lib/unpaid-seat-holds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ ok: true, skipped: "stripe not configured" });
  }

  const now = Date.now();
  const cutoff = new Date(now - UNPAID_HOLD_MIN_AGE_MINUTES * 60_000).toISOString();
  const { data: holds, error } = await supabase
    .from("event_registrations")
    .select("id, created_at, stripe_session_id")
    .eq("status", "pending_payment")
    .is("voucher_id", null)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(UNPAID_HOLD_BATCH_LIMIT);
  if (error) {
    console.error("release-unpaid-seat-holds:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const report = { checked: 0, cancelled: 0, alerted: 0, left: 0, errors: 0 };
  for (const hold of holds ?? []) {
    report.checked += 1;
    try {
      const session = hold.stripe_session_id
        ? await stripe.checkout.sessions.retrieve(hold.stripe_session_id)
        : null;
      const action = decideUnpaidHold({
        ageMinutes: (now - new Date(hold.created_at).getTime()) / 60_000,
        stripeSessionId: hold.stripe_session_id,
        session,
      });

      if (action === "alert" && session) {
        await reportUnmatchedPayment(
          {
            sessionId: session.id,
            paymentIntentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : (session.payment_intent?.id ?? null),
            registrationId: hold.id,
            amountTotal: session.amount_total,
            currency: session.currency,
            reason: "Stripe shows this checkout as paid, but the registration is still waiting for payment",
          },
          sendUnmatchedPaymentAlertEmail,
        );
        report.alerted += 1;
      } else if (action === "cancel") {
        // Same update the Stripe webhook makes when a checkout expires. The
        // filters repeat the check in the database: a row that was paid, or
        // moved to another checkout, since it was read is not changed.
        const update = supabase
          .from("event_registrations")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancellation_reason: "payment_not_completed",
          })
          .eq("id", hold.id)
          .eq("status", "pending_payment");
        const { data: cancelled, error: cancelError } = await (hold.stripe_session_id
          ? update.eq("stripe_session_id", hold.stripe_session_id)
          : update.is("stripe_session_id", null)
        ).select("id");
        if (cancelError) throw new Error(cancelError.message);
        if (cancelled?.length) report.cancelled += 1;
        else report.left += 1;
      } else {
        report.left += 1;
      }
    } catch (err) {
      report.errors += 1;
      console.error(
        `release-unpaid-seat-holds: registration ${hold.id}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return NextResponse.json({ ok: true, ...report });
}
