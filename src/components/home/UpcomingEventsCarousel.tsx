"use client";

import Link from "next/link";
import { useRef } from "react";

export type CarouselEventCard = {
  id: string;
  href: string;
  typeLabel: string;
  typeColor: string;
  dateFull: string;
  day: string;
  monthUpper: string;
  year: string;
  title: string;
  speaker: string | null;
  location: string | null;
  ctaLabel: string;
};

export function UpcomingEventsCarousel({
  events,
}: {
  events: CarouselEventCard[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scroll(dir: "prev" | "next") {
    const track = trackRef.current;
    if (!track) return;
    // scroll by full visible width (shows next set of 3)
    track.scrollBy({
      left: dir === "next" ? track.clientWidth : -track.clientWidth,
      behavior: "smooth",
    });
  }

  return (
    <div className="uec-outer">
      <div className="uec-track" ref={trackRef}>
        {events.map((e) => (
          <Link key={e.id} href={e.href} className="uec-card">
            <div className="uec-card-top">
              <span className="uec-card-type" style={{ color: e.typeColor }}>
                {e.typeLabel}
              </span>
              <div className="uec-card-date-badge">
                <span className="uec-card-day">{e.day}</span>
                <span className="uec-card-mon">{e.monthUpper}</span>
              </div>
            </div>

            <h3 className="uec-card-title">{e.title}</h3>

            <div className="uec-card-footer">
              {e.speaker && (
                <span className="uec-card-meta-item">{e.speaker}</span>
              )}
              {e.location && (
                <span className="uec-card-meta-item">{e.location}</span>
              )}
              <span className="uec-card-cta">
                {e.ctaLabel}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6h8M6.5 2.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>

      {events.length > 3 && (
        <div className="uec-arrows">
          <button className="uec-arrow" onClick={() => scroll("prev")} aria-label="Previous" type="button">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="uec-arrow" onClick={() => scroll("next")} aria-label="Next" type="button">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
