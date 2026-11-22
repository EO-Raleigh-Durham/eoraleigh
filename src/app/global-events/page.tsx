import Link from "next/link";
import { pageMeta } from "@/lib/page-metadata";
import { Reveal } from "@/components/Reveal";
import { EventsList } from "@/components/events/EventsList";
import { eventScope, getViewableEvents } from "@/lib/events";
import { getSessionUser } from "@/lib/auth";
import { CHAPTER_PLACE } from "@/kernel/config/chapter";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: `Global Events · EO Beyond ${CHAPTER_PLACE}`,
  description:
    `EO global and regional events for ${CHAPTER_PLACE} members: APAC retreats, leadership summits, and the worldwide EO calendar. Travel beyond the chapter and meet founders across 61 countries.`,
  path: "/global-events",
});

export default async function GlobalEventsPage() {
  const user = await getSessionUser();
  const allEvents = await getViewableEvents(user?.role ?? null, {
    status: ["open", "published"],
    after: new Date(),
  });
  const events = allEvents.filter((e) => eventScope(e) === "global");

  return (
    <div className="events-page">
      {/* HERO */}
      <section className="section section--hero section--dark events-hero">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--on-dark">Global events</span>
            <h1
              className="display-1"
              style={{ marginTop: 16, marginBottom: 24, color: "#fff" }}
            >
              EO beyond {CHAPTER_PLACE}
              <br />
              <span style={{ color: "var(--accent)" }}>
                a network of 20,000+
              </span>
            </h1>
            <p
              className="lead"
              style={{ color: "var(--text-on-dark-muted)", maxWidth: 680 }}
            >
              Membership opens the door to the whole organization, not just the chapter. APAC retreats, regional summits, and global learning programs put you in a room with founders from across 61 countries.
            </p>
          </Reveal>
        </div>
      </section>

      {/* LIST */}
      <section className="section section--alt">
        <div className="container">
          <div className="events-list-head">
            <Reveal>
              <span className="eyebrow eyebrow--accent">Coming up</span>
              <h2 className="display-3" style={{ marginTop: 12 }}>
                On the global calendar
              </h2>
            </Reveal>
          </div>

          <EventsList
            events={events}
            emptyMessage="No global events on the calendar right now. Check back soon, or browse the chapter calendar."
          />
        </div>
      </section>

      {/* SWITCH TO MEMBER EVENTS */}
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
              Closer to home?
            </p>
            <h3 className="heading-1" style={{ marginBottom: 20 }}>
              The chapter calendar lives elsewhere
            </h3>
            <p
              className="lead text-muted"
              style={{
                marginBottom: 24,
                maxWidth: 540,
                margin: "0 auto 24px",
              }}
            >
              Forum reformations, signature programs, retreats, and member-only learning here in {CHAPTER_PLACE} are on the main events page.
            </p>
            <div
              className="row"
              style={{ gap: 12, justifyContent: "center", flexWrap: "wrap" }}
            >
              <Link href="/events" className="btn btn--dark">
                Member events →
              </Link>
              <Link href="/join" className="btn btn--ghost">
                Apply for membership
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
