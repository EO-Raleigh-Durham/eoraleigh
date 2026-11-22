import Link from "next/link";
import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { roleAtLeast } from "@/lib/access";
import {
  getRegistrationsForPerson,
  getViewableEvents,
  eventPath,
  eventScope,
  formatEventDate,
  type RegistrationStatus,
} from "@/lib/events";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata: Metadata = { title: "My events" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  pending_payment: "Payment pending",
  registered: "Registered",
  waitlisted: "Waitlisted",
  cancelled: "Cancelled",
  attended: "Attended",
  no_show: "No show",
};

// Registrations that count as "already signed up" — anything but a cancelled
// one. Used to skip events the member is already on when picking the feature.
const ACTIVE_STATUSES: RegistrationStatus[] = [
  "pending_payment",
  "registered",
  "waitlisted",
  "attended",
];

function requestTimestamp() {
  return Date.now();
}

type Scope = "local" | "global";

export default async function MemberEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const user = await requireAuth();
  // Local / Global switch: local chapter events by default, EO global
  // events (the /global-events calendar) when the member picks Global.
  const scope: Scope = (await searchParams).scope === "global" ? "global" : "local";

  const registrations = user.personId
    ? await getRegistrationsForPerson(user.personId)
    : [];
  const now = requestTimestamp();

  // The next upcoming event (visible to this member's role) they have not yet
  // signed up for — featured at the top as a nudge to register.
  const signedUp = new Set(
    registrations
      .filter((r) => ACTIVE_STATUSES.includes(r.status) && r.event)
      .map((r) => r.event!.id),
  );
  // The member area shows what an ordinary member sees: board and admin
  // viewers are capped at the member audience so a board-only event is never
  // featured here (board events live in the /board workspace).
  const viewAs = roleAtLeast(user.role, "board") ? "member" : user.role;
  // Events in the selected scope with registration open or simply published,
  // the same filter as /events and /global-events.
  const upcoming = (
    await getViewableEvents(viewAs, {
      status: ["open", "published"],
      after: new Date(),
      order: "asc",
    })
  ).filter((e) => eventScope(e) === scope);
  const featured = upcoming.find((e) => !signedUp.has(e.id)) ?? null;
  const featuredDate = featured
    ? formatEventDate(featured.starts_at, featured.ends_at)
    : null;

  return (
    <section className="section">
      <div className="container container--text">
        <span className="eyebrow eyebrow--accent">My events</span>
        <h1 className="display-3" style={{ marginTop: 12, marginBottom: 8 }}>
          My events
        </h1>
        <p className="lead text-muted" style={{ marginBottom: 32 }}>
          Signed in as {user.email}.{" "}
          <Link href="/profile" className="auth-link">
            Edit my profile
          </Link>
        </p>

        <div className="mev-scope">
          <div className="blog-type-toggle" role="tablist" aria-label="Event scope">
            {(["local", "global"] as const).map((s) => (
              <Link
                key={s}
                href={s === "local" ? "/member/events" : "/member/events?scope=global"}
                role="tab"
                aria-selected={scope === s}
                className={`blog-type-pill${scope === s ? " is-active" : ""}`}
                scroll={false}
              >
                {s === "local" ? "Local" : "Global"}
              </Link>
            ))}
          </div>
          <Link
            href={scope === "local" ? "/events" : "/global-events"}
            className="auth-link"
          >
            {scope === "local" ? `All ${CHAPTER_NAME} events` : "All EO global events"}
          </Link>
        </div>

        {!featured && (
          <p className="text-muted" style={{ marginBottom: 32 }}>
            {scope === "local"
              ? `No upcoming ${CHAPTER_NAME} events to sign up for right now.`
              : "No upcoming EO global events to sign up for right now."}
          </p>
        )}

        {featured && (
          <Link href={eventPath(featured)} className="mev-feature">
            {featured.cover_image_url && (
              <div
                className="mev-feature-media"
                style={{ backgroundImage: `url(${featured.cover_image_url})` }}
              />
            )}
            <div className="mev-feature-body">
              <span className="mev-feature-kicker">Next up for you</span>
              <h2 className="mev-feature-title">{featured.title}</h2>
              <div className="mev-feature-meta">
                {featuredDate?.full}
                {featured.location ? ` · ${featured.location}` : ""}
              </div>
              <span className="mev-feature-cta">View event &amp; RSVP →</span>
            </div>
          </Link>
        )}

        <h2 className="mev-list-head">Your registrations</h2>
        {registrations.length === 0 ? (
          <p className="text-muted">
            You have no event registrations yet.{" "}
            <Link href="/events" className="auth-link">
              Browse upcoming events
            </Link>
            .
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 16 }}>
            {registrations.map((r) => {
              const ev = r.event;
              const date = ev ? formatEventDate(ev.starts_at, ev.ends_at) : null;
              const isPast = ev
                ? new Date(ev.ends_at ?? ev.starts_at).getTime() < now
                : false;
              return (
                <li
                  key={r.id}
                  style={{
                    border: "1px solid var(--border, #e5e5e5)",
                    borderRadius: 12,
                    padding: "18px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {ev?.title ?? "Event"}
                    </div>
                    <div className="text-muted" style={{ fontSize: 14 }}>
                      {date?.full}
                      {ev?.location ? ` · ${ev.location}` : ""}
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: 13, marginTop: 6, color: "var(--accent)" }}
                    >
                      {STATUS_LABEL[r.status]}
                    </div>
                  </div>
                  {isPast && ev ? (
                    <Link
                      href={eventPath(ev)}
                      className="btn btn--dark"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      View recap →
                    </Link>
                  ) : (
                    r.ticket_code && (
                      <Link
                        href={`/t/${r.ticket_code}`}
                        className="btn btn--dark"
                        style={{ whiteSpace: "nowrap" }}
                      >
                        View ticket →
                      </Link>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
