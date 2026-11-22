import Link from "next/link";
import { pageMeta } from "@/lib/page-metadata";
import { Reveal } from "@/components/Reveal";
import { EventsList } from "@/components/events/EventsList";
import { getViewableEvents } from "@/lib/events";
import { getSessionUser } from "@/lib/auth";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "Past Events · Recordings & Speakers Archive",
  description:
    `Browse ${CHAPTER_NAME}'s event archive since 2023: recordings, slide decks, and recaps from learning events, Forum gatherings, and signature programs.`,
  path: "/past-events",
});

export default async function PastEventsPage() {
  // Any event whose start date has passed belongs in the archive, not just the
  // ones an admin remembered to flip to "completed". Exclude only draft and
  // cancelled.
  const user = await getSessionUser();
  const events = await getViewableEvents(user?.role ?? null, {
    status: ["published", "open", "closed", "completed"],
    before: new Date(),
    order: "desc",
  });

  return (
    <div className="events-page">
      {/* HERO */}
      <section className="section section--hero section--dark events-hero">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--on-dark">Past events archive</span>
            <h1
              className="display-1"
              style={{ marginTop: 16, marginBottom: 24, color: "#fff" }}
            >
              Two years of the chapter,
              <br />
              <span style={{ color: "var(--accent)" }}>in the rear-view</span>
            </h1>
            <p
              className="lead"
              style={{ color: "var(--text-on-dark-muted)", maxWidth: 680 }}
            >
              Recordings, slides, and recaps from every learning event, retreat, Forum reformation, and chapter dinner since 2024. Members can request the full materials. Non-members see the breadth of what we do, not the contents.
            </p>
          </Reveal>
        </div>
      </section>

      {/* CONTROLS + LIST */}
      <section className="section section--alt">
        <div className="container">
          <div className="events-list-head">
            <Reveal>
              <span className="eyebrow eyebrow--accent">Filter</span>
              <h2 className="display-3" style={{ marginTop: 12 }}>
                {events.length} events
              </h2>
            </Reveal>
          </div>

          <EventsList
            events={events}
            showYearInRow
            showYearFilter
            showRecapStatus
            emptyMessage="No archived events match those filters. Try widening the search."
          />
        </div>
      </section>

      {/* CTA */}
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
              Looking forward?
            </p>
            <h3 className="heading-1" style={{ marginBottom: 20 }}>
              What is on the calendar now
            </h3>
            <p
              className="lead text-muted"
              style={{
                marginBottom: 24,
                maxWidth: 540,
                margin: "0 auto 24px",
              }}
            >
              The current ninety-day calendar of member events sits on the main events page.
            </p>
            <div
              className="row"
              style={{
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link href="/events" className="btn btn--dark">
                Upcoming events →
              </Link>
              <Link href="/community-events" className="btn btn--ghost">
                Community events
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
