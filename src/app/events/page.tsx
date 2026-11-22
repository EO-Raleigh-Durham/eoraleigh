import Link from "next/link";
import { pageMeta } from "@/lib/page-metadata";
import { Reveal } from "@/components/Reveal";
import { EventsList } from "@/components/events/EventsList";
import { Testimonials } from "@/components/Testimonials";
import { eventScope, formatEventDateFor, getViewableEvents, type EventRow } from "@/lib/events";
import { getSessionUser } from "@/lib/auth";
import { plainBlurb } from "@/lib/event-blurb";
import {
  EVENTS_HERO_LEAD,
  EVENTS_PAGE_DESCRIPTION,
  LEARNING_TESTIMONIALS,
  PINNED_EVENTS,
  RETIRED_EVENT_SLUGS,
} from "@/content/events-page";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "Events · The Member Calendar",
  description: EVENTS_PAGE_DESCRIPTION,
  path: "/events",
});

export default async function EventsPage() {
  const user = await getSessionUser();
  const allEvents = await getViewableEvents(user?.role ?? null, {
    status: ["open", "published"],
    after: new Date(),
  });
  // Global events live on /global-events only; this is the local calendar.
  const events = allEvents.filter(
    (e) =>
      eventScope(e) === "local" &&
      !(e.slug && RETIRED_EVENT_SLUGS.includes(e.slug)),
  );

  const featured = events.find((e) => e.featured) ?? null;
  const upcoming = events.filter((e) => !e.featured);

  return (
    <div className="events-page">
      {/* HERO */}
      <section className="section section--hero section--dark events-hero">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--on-dark">Member events</span>
            <h1
              className="display-1"
              style={{ marginTop: 16, marginBottom: 24, color: "#fff" }}
            >
              Twelve months
              <br />
              <span style={{ color: "var(--accent)" }}>
                fifty-plus events
              </span>
            </h1>
            <p
              className="lead"
              style={{
                color: "var(--text-on-dark-muted)",
                maxWidth: 680,
              }}
            >
              {EVENTS_HERO_LEAD}
            </p>
          </Reveal>
        </div>
      </section>

      {/* FEATURED EVENT */}
      {featured && <FeaturedEvent event={featured} />}

      {/* UPCOMING EVENTS LIST */}
      <section className="section section--alt">
        <div className="container">
          <div className="events-list-head">
            <Reveal>
              <span className="eyebrow eyebrow--accent">Coming up</span>
              <h2 className="display-3" style={{ marginTop: 12 }}>
                The next ninety days
              </h2>
            </Reveal>
          </div>

          {/* Static pinned events — not in DB */}
          <div className="events-list" style={{ marginBottom: 0 }}>
            {PINNED_EVENTS.filter(
              (e) =>
                new Date() <= new Date(e.until) &&
                // Skip a pinned card when the same event is already listed from the DB.
                !events.some((ev) => ev.slug && e.href === `/events/${ev.slug}`),
            ).map(
              (e) => (
                <Reveal key={e.href}>
                  <Link href={e.href} className="event-row event-row--link">
                    <div className="event-row-date">
                      <div className="event-row-day">{e.day}</div>
                      <div className="event-row-month mono">{e.month}</div>
                    </div>
                    <div className="event-row-body">
                      <div className="event-row-cat mono">{e.cat}</div>
                      <h3 className="event-row-title">{e.title}</h3>
                      <div className="event-row-meta">
                        <span>{e.meta[0]}</span>
                        <span className="divider"></span>
                        <span>{e.meta[1]}</span>
                      </div>
                    </div>
                    <div className="event-row-cta">
                      <span className="event-row-arrow">→</span>
                    </div>
                  </Link>
                </Reveal>
              ),
            )}
          </div>

          <EventsList events={upcoming} />
        </div>
      </section>

      {/* TESTIMONIALS */}
      <Testimonials
        testimonials={LEARNING_TESTIMONIALS}
        eyebrow="Member voices"
        heading="What members get out of the learning"
      />

      {/* PAST EVENTS LINK */}
      <section className="section">
        <div
          className="container container--text"
          style={{ textAlign: "center" }}
        >
          <Reveal>
            <p
              className="caption mono"
              style={{ color: "var(--accent)", marginBottom: 12 }}
            >
              Looking back?
            </p>
            <h3 className="heading-1" style={{ marginBottom: 20 }}>
              Past events archive
            </h3>
            <p
              className="lead text-muted"
              style={{
                marginBottom: 24,
                maxWidth: 540,
                margin: "0 auto 24px",
              }}
            >
              Recordings, recaps, and slide decks from every learning event we have hosted since 2023.
            </p>
            <Link href="/past-events" className="btn btn--dark">
              Browse the archive →
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

function FeaturedEvent({ event }: { event: EventRow }) {
  const date = formatEventDateFor(event);
  return (
    <section className="section">
      <div className="container">
        <Reveal>
          <span className="eyebrow eyebrow--accent">Featured this quarter</span>
          <h2
            className="display-3"
            style={{ marginTop: 12, marginBottom: 40, maxWidth: 720 }}
          >
            The next signature program
          </h2>
        </Reveal>

        <Reveal delay={120} className="event-featured">
          <div
            className="event-featured-img"
            style={{
              backgroundImage: event.cover_image_url
                ? `url(${event.cover_image_url})`
                : undefined,
            }}
          >
            <span className="event-featured-tag mono">
              {event.tag_label ?? "Featured"}
            </span>
          </div>
          <div className="event-featured-body">
            <div
              className="caption mono"
              style={{ color: "var(--accent)", marginBottom: 16 }}
            >
              {date.full}
              {event.location ? ` · ${event.location}` : ""}
            </div>
            <h3
              className="display-3"
              style={{
                marginBottom: 20,
                fontSize: "clamp(28px, 3.4vw, 44px)",
              }}
            >
              {event.title}
            </h3>
            {event.blurb && (
              <p
                className="lead"
                style={{ marginBottom: 28, color: "var(--text-muted)" }}
              >
                {plainBlurb(event.blurb)}
              </p>
            )}
            {event.capacity && (
              <div className="event-featured-meta">
                <div>
                  <div className="caption text-faint">Capacity</div>
                  <div className="event-featured-meta-val">
                    {event.capacity} founders globally
                  </div>
                </div>
                {event.location && (
                  <div>
                    <div className="caption text-faint">Format</div>
                    <div className="event-featured-meta-val">
                      In-person · {event.location}
                    </div>
                  </div>
                )}
                <div>
                  <div className="caption text-faint">Apply by</div>
                  <div className="event-featured-meta-val">
                    {date.full.split(",")[0]}
                  </div>
                </div>
              </div>
            )}
            <div className="row" style={{ gap: 12, marginTop: 32 }}>
              <Link
                href={event.cta_href ?? "/training"}
                className="btn btn--dark"
              >
                {event.cta_label ?? "Program details"}
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
