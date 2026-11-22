import type { Metadata } from "next";
import Link from "next/link";
import { HANDOVERS } from "@/content/handovers";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata: Metadata = {
  title: "2026/7 Handover",
  description: `Reflections and field notes from the outgoing team for the 2026/7 ${CHAPTER_NAME} term.`,
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};


export default function HandoverHubPage() {
  return (
    <div className="adh-page adh-page--in-admin">
      <section className="adh-hero">
        <div className="adh-hero-inner">
          <span className="adh-eyebrow">{CHAPTER_NAME} · Term Handover</span>
          <h1 className="adh-hero-title">
            2026/7<br />
            <span className="adh-hero-title-accent">Handover</span>
          </h1>
          <p className="adh-hero-sub">
            Reflections from the outgoing team for the incoming one. Each
            handover below is a private document written in the voice of the
            person stepping out, with what they learned, what they tried, and
            what they&apos;d want the next person to know.
          </p>
        </div>
      </section>

      <section className="adh-section adh-section--soft">
        <div className="adh-section-inner">
          <div className="adh-hub-grid">
            {HANDOVERS.map((h) => (
              <Link
                key={h.href}
                href={h.href}
                className={`adh-hub-card adh-hub-card--${h.accent}`}
              >
                <div className="adh-hub-card-head">
                  <span className="adh-hub-card-role">{h.role}</span>
                  <span className="adh-hub-card-term">{h.term}</span>
                </div>
                <h2 className="adh-hub-card-person">{h.person}</h2>
                <p className="adh-hub-card-lede">{h.lede}</p>
                <ul className="adh-hub-card-list">
                  {h.highlights.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <div className="adh-hub-card-cta">
                  Read the handover
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>

          <p className="adh-hub-foot">
            These pages are private to the admin section. Share the URL with
            care.
          </p>
        </div>
      </section>
    </div>
  );
}
