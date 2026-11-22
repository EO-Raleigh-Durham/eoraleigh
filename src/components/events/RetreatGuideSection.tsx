import Image from "next/image";
import { Reveal } from "@/components/Reveal";

// The Chapter Retreat's landing page is a set of static pages under
// public/events/chapter-retreat-2026/ (agenda, before the trip, what to know).
// This section sits on the public event page and points registrants to it.
// The event row itself comes from the database, so the page template matches
// it by slug and renders this block above the RSVP form.
export const RETREAT_EVENT_SLUG = "chapter-retreat-2026";
export const RETREAT_GUIDE_URL = "/events/chapter-retreat-2026/members";

export function RetreatGuideSection() {
  return (
    <section className="section section--tight">
      <div className="container">
        <Reveal>
          <div className="retreat-guide">
            <div className="retreat-guide__photo-wrap">
              <Image
                className="retreat-guide__photo"
                src="/images/chapter-retreat-2026/hip/hero-aerial-mist.jpg"
                alt="Aerial view of Haven in the Pines, white resort buildings among pine-covered hills in morning mist"
                fill
                sizes="(max-width: 900px) 92vw, 45vw"
                unoptimized
              />
            </div>
            <div className="retreat-guide__txt">
              <span className="eyebrow eyebrow--accent">Retreat guide</span>
              <h2 className="display-3" style={{ marginTop: 12, marginBottom: 16 }}>
                Three days in the highlands with your chapter
              </h2>
              <p className="retreat-guide__lede">
                The retreat landing page has the day-by-day agenda, what to bring, the venue and who to contact.
              </p>
              <a
                className="btn btn--primary"
                href={RETREAT_GUIDE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open the retreat landing page
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
