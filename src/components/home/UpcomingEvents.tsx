import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import {
  getViewableEvents,
  eventScope,
  formatEventDate,
  eventTypeLabel,
  type EventRow,
} from "@/lib/events";
import {
  UpcomingEventsCarousel,
  type CarouselEventCard,
} from "./UpcomingEventsCarousel";

const TYPE_COLOR: Record<string, string> = {
  learning: "#3D46F2",
  membership: "#EFB82E",
  social: "#1EA691",
  my_eo: "#FA653C",
  forum: "#FF346E",
};

function toCard(e: EventRow): CarouselEventCard {
  const date = formatEventDate(e.starts_at, e.ends_at);
  return {
    id: e.id,
    href: e.cta_href ?? `/events/${e.slug ?? e.id}`,
    typeLabel: e.tag_label ?? eventTypeLabel(e.type),
    typeColor: TYPE_COLOR[e.type] ?? "#3D46F2",
    dateFull: date.full,
    day: date.day,
    monthUpper: date.monthUpper,
    year: date.year,
    title: e.title,
    speaker: e.speaker,
    location: e.location,
    ctaLabel: e.cta_label ?? "Learn more",
  };
}

export async function UpcomingEvents() {
  const dbEvents = await getViewableEvents(null, {
    status: ["open", "published"],
    after: new Date(),
    limit: 8,
    order: "asc",
  });

  // Global events surface on /global-events, not the homepage carousel.
  const all = dbEvents
    .filter((e) => eventScope(e) === "local")
    .map(toCard);

  if (all.length === 0) return null;

  return (
    <section className="section home-upcoming">
      <div className="container">
        <div className="home-upcoming-header">
          <Reveal>
            <span className="eyebrow eyebrow--accent">Coming up</span>
            <h2 className="display-3" style={{ marginTop: 12 }}>
              Upcoming events
            </h2>
          </Reveal>
          <Reveal delay={60}>
            <Link href="/events" className="btn btn--outline home-upcoming-viewall">
              View all &rarr;
            </Link>
          </Reveal>
        </div>

        <UpcomingEventsCarousel events={all} />
      </div>
    </section>
  );
}
