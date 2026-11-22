import Link from "next/link";
import { pageMeta } from "@/lib/page-metadata";
import { Reveal } from "@/components/Reveal";
import { EventsList } from "@/components/events/EventsList";
import { Testimonials } from "@/components/Testimonials";
import { eventScope, getViewableEvents } from "@/lib/events";
import { CHAPTER_CITY, CHAPTER_COUNTRY, CHAPTER_NAME } from "@/kernel/config/chapter";
import { SOCIALS_TESTIMONIALS } from "@/content/testimonials";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: `Founder Events in ${CHAPTER_CITY} · Open Mixers`,
  description:
    `Open ${CHAPTER_NAME} events for non-members in ${CHAPTER_CITY}: mixers, pitch nights, Forum demos. Free to attend, RSVP appreciated. Meet 4-6 members in the room.`,
  path: "/community-events",
});

export default async function CommunityEventsPage() {
  const publicEvents = await getViewableEvents(null, {
    visibility: ["public"],
    status: ["open", "published"],
    after: new Date(),
  });
  // Global events live on /global-events only, even when they are public.
  const events = publicEvents.filter((e) => eventScope(e) === "local");

  return (
    <div className="events-page">
      {/* HERO */}
      <section className="section section--hero section--dark events-hero">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--on-dark">Community events</span>
            <h1
              className="display-1"
              style={{ marginTop: 16, marginBottom: 24, color: "#fff" }}
            >
              Come spend an evening
              <br />
              <span style={{ color: "var(--accent)" }}>
                with the chapter
              </span>
            </h1>
            <p
              className="lead"
              style={{ color: "var(--text-on-dark-muted)", maxWidth: 680 }}
            >
              Most EO events are members-only. These are the ones we open to the broader founder community in {CHAPTER_COUNTRY}, mixers, pitch nights, working sessions, and Forum demos. Free to attend, RSVP appreciated.
            </p>
          </Reveal>
        </div>
      </section>

      {/* INTRO */}
      <section className="section section--tight">
        <div
          className="container container--text"
          style={{ textAlign: "center" }}
        >
          <Reveal>
            <p className="lead text-muted">
              If you have been curious about EO but want to feel the room first, an open event is the right way in. You will meet four to six members and see how we run a session.
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
                The next ninety days
              </h2>
            </Reveal>
          </div>

          <EventsList events={events} />
        </div>
      </section>

      {/* TESTIMONIALS */}
      <Testimonials
        testimonials={SOCIALS_TESTIMONIALS}
        variant="light"
        eyebrow="What people say"
        heading="The room beyond your usual circle"
      />

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
              Already a member?
            </p>
            <h3 className="heading-1" style={{ marginBottom: 20 }}>
              The full member calendar lives elsewhere
            </h3>
            <p
              className="lead text-muted"
              style={{
                marginBottom: 24,
                maxWidth: 540,
                margin: "0 auto 24px",
              }}
            >
              Forum, signature programs, retreats, and member-only learning sessions are on the main events page.
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
