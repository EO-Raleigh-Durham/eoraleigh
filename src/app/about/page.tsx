import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { FinalCTA } from "@/components/home/FinalCTA";
import { Testimonials } from "@/components/Testimonials";
import { pageMeta } from "@/lib/page-metadata";
import { CHAPTER_NAME } from "@/kernel/config/chapter";
import { ABOUT_CHAPTER_STAT, ABOUT_PURPOSE_LEAD, COMMUNITY_TESTIMONIALS } from "@/content/about";

export const metadata = pageMeta({
  title: "About the Chapter",
  description:
    `${CHAPTER_NAME} is the local chapter of Entrepreneurs' Organization, a global community of 20,000+ founders across 61 countries since 1987.`,
  path: "/about",
});

const VALUES = [
  {
    num: "01",
    title: "Together we grow",
    body:
      "We are committed to each other's success and well-being, and we unite to celebrate our differences. EO binds us together across cities and continents.",
  },
  {
    num: "02",
    title: "Trust and respect",
    body:
      "Each of us is unique and equal. Living this value with an open mind and appreciation for different points of view enables us to create a space where everyone can be their complete, authentic selves.",
  },
  {
    num: "03",
    title: "Thirst for learning",
    body:
      "We have an insatiable curiosity. Through curiosity, we grow and widen our horizons. Learning is about asking the right questions, trying new things, and being curious about other members and their perspectives.",
  },
  {
    num: "04",
    title: "Think big, be bold",
    body:
      "We innovate and take risks to make the world a better place for our teams, our families, our communities, and humankind. We see entrepreneurship as a way to create a better world for all.",
  },
];

const STATS = [
  ...(ABOUT_CHAPTER_STAT ? [ABOUT_CHAPTER_STAT] : []),
  { num: "20,000+", label: "Members worldwide" },
  { num: "70+", label: "Countries with chapters" },
  { num: "1987", label: "Founded" },
];

export default function AboutPage() {
  return (
    <div>
      <section className="page-hero page-hero--dark">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--on-dark">About {CHAPTER_NAME}</span>
            <h1 className="display-1" style={{ marginTop: 16, marginBottom: 24, color: "#fff" }}>
              A community
              <br />
              by entrepreneurs
              <br />
              <span style={{ color: "var(--accent)" }}>for entrepreneurs</span>
            </h1>
            <p className="lead" style={{ color: "var(--text-on-dark-muted)", maxWidth: 640 }}>
              {CHAPTER_NAME} is part of the Entrepreneurs&apos; Organization, a global community of over 20,000 founders across 61 countries. Since 1987, EO has helped entrepreneurs grow through peer connections, experience-sharing, and world-class learning.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--accent">Our values</span>
            <h2 className="display-3" style={{ marginTop: 12, marginBottom: 40, maxWidth: 720 }}>
              Four values that guide every Forum, event, and conversation
            </h2>
          </Reveal>
          <div className="about-pillars">
            {VALUES.map((p, i) => (
              <Reveal key={p.num} delay={i * 100} className="pillar">
                <div className="pillar-num mono">{p.num}</div>
                <h3 className="heading-2" style={{ marginBottom: 12 }}>{p.title}</h3>
                <p className="body" style={{ color: "var(--text-muted)" }}>{p.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <div className="about-story">
            <Reveal className="about-story-text">
              <span className="eyebrow eyebrow--accent">Our purpose</span>
              <h2 className="display-3" style={{ marginTop: 12, marginBottom: 24 }}>
                We move the world forward by unlocking the full potential of entrepreneurs
              </h2>
              <p className="lead" style={{ marginBottom: 20 }}>
                {ABOUT_PURPOSE_LEAD}
              </p>
              <p className="body" style={{ color: "var(--text-muted)", marginBottom: 32 }}>
                EO is more than a business group, it&apos;s a trusted, founder-led network built to support your growth. Whether you&apos;re navigating scale, transition, or reinvention, EO gives you the space and structure to go further, faster, with people who understand the journey because they&apos;re on it too.
              </p>
              <div className="row" style={{ gap: 12 }}>
                <Link href="/board-of-directors" className="btn btn--dark">Meet the board</Link>
                <Link href="/path-of-leadership" className="btn btn--ghost">Path of Leadership</Link>
              </div>
            </Reveal>
            <Reveal delay={120} className="about-story-stats">
              {STATS.map((s) => (
                <div key={s.label} className="about-stat">
                  <div className="mono about-stat-num">{s.num}</div>
                  <div className="about-stat-label">{s.label}</div>
                </div>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      <Testimonials
        testimonials={COMMUNITY_TESTIMONIALS}
        variant="light"
        eyebrow="In their own words"
        heading="The community, in their voice"
      />

      <FinalCTA />
    </div>
  );
}
