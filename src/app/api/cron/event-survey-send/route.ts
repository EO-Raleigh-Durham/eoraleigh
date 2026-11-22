// Hourly: emails the post-event survey once for every held chapter event,
// 1 to 72 hours after it ends. Rules live in src/lib/event-survey-send.ts.
// Refuses any request without the CRON_SECRET bearer (Vercel cron sends it).

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isEmailConfigured, sendEventBroadcast } from "@/lib/email";
import { runEventSurveySend } from "@/lib/event-survey-send";
import { SITE_URL } from "@/lib/page-metadata";

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
  if (!isEmailConfigured()) {
    return NextResponse.json({ ok: true, skipped: "email not configured" });
  }
  try {
    const report = await runEventSurveySend(supabase, sendEventBroadcast, SITE_URL);
    return NextResponse.json({ ok: true, ...report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("event-survey-send:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
