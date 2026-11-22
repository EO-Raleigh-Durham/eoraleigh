import { CHAPTER_CITY, CHAPTER_NAME } from "@/kernel/config/chapter";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";

export function WhyJoin() {
  return (
    <section className="section why-section">
      <div className="container">
        <div className="why-grid">
          <div className="why-text">
            <Reveal>
              <span className="eyebrow eyebrow--accent">Why a business group</span>
              <h2 className="display-3" style={{ marginTop: 16, marginBottom: 24 }}>
                Building a company is hard
                <br />
                Doing it alone is harder
              </h2>
              <p className="lead" style={{ marginBottom: 24 }}>
                {CHAPTER_NAME} connects you with founders who understand your specific problems, the late-night cash crunch, the co-founder fight, the hire who didn&apos;t work out. You get learning, accountability, new perspectives, and a circle that supports your business growth and your personal development.
              </p>
              <p className="body" style={{ color: "var(--text-muted)", marginBottom: 32 }}>
                We&apos;re a business group built by and for entrepreneurs ready to grow. It&apos;s where experienced founders learn faster, scale smarter, and lead with more confidence.
              </p>
              <Link href="/path-of-leadership" className="btn btn--dark">
                Start your leadership journey <span className="arrow">→</span>
              </Link>
            </Reveal>
          </div>
          <div className="why-image">
            <Reveal delay={120}>
              <img
                src="/images/events/townhall-2026-27/room.jpg"
                alt={`${CHAPTER_NAME} members together at the 2026/27 Town Hall in ${CHAPTER_CITY}`}
              />
              <div className="why-image-tag mono">{CHAPTER_CITY} · 2026/27 Town Hall</div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
