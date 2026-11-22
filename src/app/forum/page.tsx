import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { Testimonials } from "@/components/Testimonials";
import { pageMeta } from "@/lib/page-metadata";
import { CHAPTER_NAME } from "@/kernel/config/chapter";
import { FORUM_TESTIMONIALS } from "@/content/testimonials";

export const metadata = pageMeta({
  title: "Forum, the 8-peer experience",
  description:
    "Eight people who will tell you the truth. Forum is the heart of EO, a monthly meeting of eight peers, sworn to confidentiality, who share what is actually happening.",
  path: "/forum",
});

const FORUM_FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is EO Forum?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Forum is the heart of EO. A monthly meeting of eight peers, matched by company and life stage, who share what is actually happening in their business, marriage, and head, and listen back without judgment. It follows GESI, a structured experience-share protocol refined since 1987.",
      },
    },
    {
      "@type": "Question",
      name: "How long is a Forum meeting?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A Forum meeting runs three and a half hours, once a month. The same eight peers meet for a full year, which is how the depth compounds: by month four you know each other's businesses, by month nine you know each other's marriages.",
      },
    },
    {
      "@type": "Question",
      name: "Is Forum confidential?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Confidentiality is the foundation of Forum, not a guideline. Members swear a confidentiality oath at every meeting, and breaking it is the one violation that ends membership immediately. This is why founders feel safe discussing layoffs they have not announced, divorces in progress, and rounds that did not close.",
      },
    },
  ],
};

const GESI = [
  {
    letter: "G",
    word: "Gestalt",
    body:
      "You arrive. Each member shares the most pressing issue on their mind in 60 seconds. No talking over, no fixing, no advice yet. Just witnessing.",
  },
  {
    letter: "E",
    word: "Experience",
    body:
      "One member presents. You go deep, business or personal. The others listen. They ask clarifying questions only, no judgment, no opinions.",
  },
  {
    letter: "S",
    word: "Share",
    body:
      "Forum mates respond, each one only with their own lived experience: “When I went through this, here is what happened.” Never advice. Never “you should.”",
  },
  {
    letter: "I",
    word: "Insight",
    body:
      "The presenter takes what is useful, discards the rest. Next month they report back: what they tried, what worked, what changed.",
  },
];

const TOPICS = [
  { tag: "Business", q: "My CFO is stealing. How do I confront her without losing the team?" },
  { tag: "Family", q: "My partner is exhausted. The business is the cause. What do I do?" },
  { tag: "Money", q: "We just closed a Series A. I am terrified. Have you felt this?" },
  { tag: "Health", q: "I have not slept properly in eleven months. Has anyone else been here?" },
  { tag: "Co-founder", q: "My co-founder is checked out. I think I need to buy them out." },
  { tag: "Identity", q: "I sold the company. I do not know who I am now. Where do I begin?" },
];

export default function ForumPage() {
  return (
    <div className="forum-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FORUM_FAQ_JSON_LD) }}
      />
      {/* HERO */}
      <section className="section section--hero forum-hero">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--accent">The Forum experience</span>
            <h1 className="display-1 forum-hero-headline">
              Eight people who will tell you
              <br />
              <span style={{ color: "var(--accent)" }}>the truth</span>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="lead forum-hero-sub">
              Forum is the heart of EO. A monthly meeting of eight peers, sworn to confidentiality, who share what is actually happening in their business, marriage, and head, and listen back without judgment.
            </p>
          </Reveal>
          <Reveal delay={200} className="forum-hero-meta">
            <div>
              <span className="mono forum-hero-meta-num">8</span>
              <span className="forum-hero-meta-label">peers per Forum</span>
            </div>
            <div>
              <span className="mono forum-hero-meta-num">3.5h</span>
              <span className="forum-hero-meta-label">monthly meeting</span>
            </div>
            <div>
              <span className="mono forum-hero-meta-num">100%</span>
              <span className="forum-hero-meta-label">confidential</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* THE CIRCLE */}
      <section className="section forum-circle-section">
        <div className="container">
          <div className="forum-circle-grid">
            <Reveal className="forum-circle-text">
              <span className="eyebrow eyebrow--accent">The shape of it</span>
              <h2 className="display-3" style={{ marginTop: 12, marginBottom: 24 }}>
                A small room, a locked door, a round table
              </h2>
              <p className="lead" style={{ marginBottom: 20 }}>
                Each Forum is exactly eight people. Small enough that you cannot hide. Big enough that someone has been where you are. Members are matched by stage, not industry, so the conversations stay focused on the human problems of running a company.
              </p>
              <p className="body" style={{ color: "var(--text-muted)" }}>
                The same eight meet every month for a year. By month four you know each other&apos;s businesses. By month nine you know each other&apos;s marriages. By month twelve you cannot imagine doing this work without them.
              </p>
            </Reveal>

            <Reveal delay={160} className="forum-circle-art">
              <div className="forum-ring">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                  const angle = ((i * 45 - 90) * Math.PI) / 180;
                  const r = 140;
                  const x = Math.cos(angle) * r;
                  const y = Math.sin(angle) * r;
                  return (
                    <div
                      key={i}
                      className="forum-ring-dot"
                      style={{
                        left: `calc(50% + ${x}px - 22px)`,
                        top: `calc(50% + ${y}px - 22px)`,
                        animationDelay: `${i * 180}ms`,
                      }}
                    >
                      <span className="mono">{(i + 1).toString().padStart(2, "0")}</span>
                    </div>
                  );
                })}
                <div className="forum-ring-center">
                  <div className="caption" style={{ color: "var(--accent)", marginBottom: 6 }}>
                    One meeting
                  </div>
                  <div className="forum-ring-center-num">8</div>
                  <div className="caption" style={{ color: "rgba(255,255,255,0.6)", marginTop: 6 }}>
                    peers
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* THE METHOD — GESI */}
      <section className="section section--alt">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--accent">The method</span>
            <h2 className="display-3" style={{ marginTop: 12, maxWidth: 760, marginBottom: 16 }}>
              GESI: a 30-year-old protocol for honest conversation
            </h2>
            <p className="lead" style={{ maxWidth: 760, marginBottom: 56, color: "var(--text-muted)" }}>
              Forum is not a roundtable. It is not a peer-advisory group. It is a structured experience-share that EO has refined since 1987. Four steps, in order, every time.
            </p>
          </Reveal>

          <div className="gesi-grid">
            {GESI.map((g, i) => (
              <Reveal key={g.letter} delay={i * 100} className="gesi-card">
                <div className="gesi-letter">{g.letter}</div>
                <div className="gesi-word">{g.word}</div>
                <p className="body" style={{ color: "var(--text-muted)" }}>{g.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CONFIDENTIALITY OATH */}
      <section className="section section--dark forum-oath">
        <div className="container container--text">
          <Reveal>
            <span className="eyebrow eyebrow--on-dark">The oath</span>
            <h2 className="display-2" style={{ marginTop: 16, marginBottom: 32, color: "#fff" }}>
              &ldquo;What is said in Forum, stays in Forum&rdquo;
            </h2>
            <p className="lead" style={{ color: "var(--text-on-dark-muted)", marginBottom: 24 }}>
              Confidentiality is not a guideline. It is the foundation. Members swear an oath at every meeting. Breaking it is the one violation that ends membership immediately.
            </p>
            <p className="body" style={{ color: "var(--text-on-dark-muted)" }}>
              This is why founders open up about layoffs they have not announced, divorces in progress, the hire they regret, the round that did not close. Things they cannot tell their team, their board, or their spouse. Forum is the only room where the whole truth is safe.
            </p>
          </Reveal>
        </div>
      </section>

      {/* WHAT GETS DISCUSSED */}
      <section className="section">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--accent">What actually comes up</span>
            <h2 className="display-3" style={{ marginTop: 12, marginBottom: 56, maxWidth: 720 }}>
              Real topics from real Forums
            </h2>
          </Reveal>

          <div className="forum-topics">
            {TOPICS.map((t, i) => (
              <Reveal key={i} delay={i * 60} className="forum-topic">
                <span className="forum-topic-tag mono">{t.tag}</span>
                <p className="forum-topic-q">{t.q}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <Testimonials
        testimonials={FORUM_TESTIMONIALS}
        eyebrow="In their own words"
        heading="Forum mates, in their own voice"
      />

      {/* CTA */}
      <section className="section section--dark final-cta-section">
        <div className="container">
          <Reveal className="final-cta">
            <span className="eyebrow eyebrow--on-dark">Ready when you are</span>
            <h2 className="display-2" style={{ color: "#fff", marginTop: 20, marginBottom: 24, maxWidth: 880 }}>
              Forum is included with EO membership
            </h2>
            <p className="lead" style={{ color: "var(--text-on-dark-muted)", marginBottom: 32, maxWidth: 720 }}>
              Members are placed in their first Forum within 30 days of joining. We match by company stage and life stage, not industry, so the conversations go deep instead of staying transactional.
            </p>
            <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
              <Link href="/join" className="btn btn--primary btn--lg">
                Apply for membership
              </Link>
              <Link href="/about" className="btn btn--ghost-on-dark btn--lg">
                About {CHAPTER_NAME}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
