import Link from "next/link";
import { headers } from "next/headers";
import { getEvents, getRsvpCounts, type EventRow } from "@/lib/events";
import { qrSvg } from "@/lib/tickets";
import { isStripeConfigured } from "@/lib/stripe";
import { EventsShell } from "./EventsShell";
import { CHAPTER_DOMAIN, CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Events",
  description: `All ${CHAPTER_NAME} events with status and registration counts.`,
};
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; saved?: string; deleted?: string; error?: string }>;

function requestTimestamp() {
  return Date.now();
}

export default async function EventsAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const events = await getEvents({ order: "desc" });
  const counts = await getRsvpCounts(events.map((e) => e.id));

  const h = await headers();
  const host = h.get("host") || CHAPTER_DOMAIN;
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");

  const surveyEntries = await Promise.all(
    events
      .filter((e) => e.survey_enabled)
      .map(async (e) => {
        const url = `${proto}://${host}/events/${e.id}/survey`;
        return [e.id, { url, qr: await qrSvg(url) }] as const;
      })
  );
  const surveyData = Object.fromEntries(surveyEntries);

  const now = requestTimestamp();
  const upcoming: EventRow[] = [];
  const past: EventRow[] = [];
  for (const e of events) {
    const t = new Date(e.starts_at).getTime();
    if (t >= now) upcoming.push(e);
    else past.push(e);
  }
  // upcoming sorts ascending so the next event is at the top
  upcoming.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const stripeOk = isStripeConfigured();
  const hasPaidEvents = events.some((e) => e.price_amount > 0);

  return (
    <div>
      <div className="admin-page-head admin-page-head--row">
        <div>
          <div className="admin-eyebrow">Events</div>
          <h1 className="admin-page-title">Event management</h1>
          <p className="admin-page-sub">
            Create, edit, and manage events across all three types (learning, social, myEO). Public listings update automatically when you save here.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/board/events/performance" className="admin-btn admin-btn--ghost">
            Performance
          </Link>
          <Link href="/board/events/new" className="admin-btn admin-btn--primary">
            New event
          </Link>
        </div>
      </div>

      {!stripeOk && hasPaidEvents && (
        <div className="admin-banner admin-banner--warn">
          <strong>Stripe is not configured.</strong> One or more events have a price set, but{" "}
          <code>STRIPE_SECRET_KEY</code> is missing from the environment. Paid RSVPs will fail.{" "}
          Add <code>STRIPE_SECRET_KEY</code> and <code>STRIPE_WEBHOOK_SECRET</code> to Vercel, then
          redeploy.
        </div>
      )}
      {sp.deleted && <div className="admin-banner admin-banner--ok">Event deleted.</div>}
      {sp.error && <div className="admin-banner admin-banner--err">{sp.error}</div>}

      <EventsShell upcoming={upcoming} past={past} counts={counts} surveyData={surveyData} />
    </div>
  );
}
