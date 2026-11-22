import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import {
  getEvents,
  eventAudience,
  eventPath,
  eventScope,
  eventTypeLabel,
  formatEventDate,
} from "@/lib/events";

// Blog conversion block: the next one to three upcoming local events, soonest
// first. Members-only events are deliberately listed here as membership
// advertising (owner decision, 2026-07-24): titles and dates are public, and
// the event page shows non-members a join pitch instead of the event. Both
// blog surfaces render with force-dynamic, so `after: new Date()` is evaluated
// per request and a past event can never appear. When the calendar is empty
// the block degrades to a generic events CTA instead of rendering a stale or
// empty list.
export async function BlogUpcomingEvents() {
  const upcoming = (
    await getEvents({
      status: ["open", "published"],
      after: new Date(),
      order: "asc",
      limit: 8,
    })
  )
    // Global events surface on /global-events, not the blog block. Board-only
    // events are internal and never advertised.
    .filter((e) => eventScope(e) === "local" && eventAudience(e) !== "board")
    .slice(0, 3);

  if (upcoming.length === 0) {
    return (
      <section className="section section--alt">
        <div className="container container--text" style={{ textAlign: "center" }}>
          <Reveal>
            <span className="eyebrow eyebrow--accent">Coming up</span>
            <h2 className="display-3" style={{ marginTop: 12, marginBottom: 16 }}>
              Stories start at events
            </h2>
            <p
              className="lead text-muted"
              style={{ maxWidth: 560, margin: "0 auto 28px" }}
            >
              Nothing is open for registration right now. New learning, social,
              and forum events are announced throughout the year.
            </p>
            <Link href="/events" className="btn btn--dark">
              Browse events &rarr;
            </Link>
          </Reveal>
        </div>
      </section>
    );
  }

  return (
    <section className="section section--alt">
      <div className="container">
        <div className="events-list-head">
          <Reveal>
            <span className="eyebrow eyebrow--accent">Coming up</span>
            <h2 className="display-3" style={{ marginTop: 12 }}>
              Stories start at events
            </h2>
          </Reveal>
          <Reveal delay={60}>
            <Link href="/events" className="btn btn--outline">
              View all &rarr;
            </Link>
          </Reveal>
        </div>

        <div className="events-list" style={{ marginTop: 24 }}>
          {upcoming.map((e, i) => {
            const date = formatEventDate(e.starts_at, e.ends_at);
            const cat = `${eventTypeLabel(e.type)}${
              e.tag_label ? ` · ${e.tag_label}` : ""
            }`;
            return (
              <Reveal key={e.id} delay={i * 40}>
                <Link href={eventPath(e)} className="event-row event-row--link">
                  <div className="event-row-date">
                    <div className="event-row-day">{date.day}</div>
                    <div className="event-row-month mono">{date.monthUpper}</div>
                  </div>
                  <div className="event-row-body">
                    <div className="event-row-cat mono">
                      {cat}
                      {eventAudience(e) !== "community" && (
                        <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                          {" · Members"}
                        </span>
                      )}
                    </div>
                    <h3 className="event-row-title">{e.title}</h3>
                    <div className="event-row-meta">
                      {e.speaker && <span>{e.speaker}</span>}
                      {e.speaker && e.location && <span className="divider"></span>}
                      {e.location && <span>{e.location}</span>}
                    </div>
                  </div>
                  <div className="event-row-cta">
                    <span className="event-row-arrow">→</span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
