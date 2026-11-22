"use client";

import { useState } from "react";
import { Reveal } from "@/components/Reveal";
import { FinalCTA } from "@/components/home/FinalCTA";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

const PATH_STEPS = [
  { num: "01", title: "Member", body: `You join ${CHAPTER_NAME}, take the Forum oath of confidentiality, and are placed in a Forum of 8 peers for monthly experience-shares.`, time: "Monthly Forum", term: "Ongoing", training: "Member onboarding" },
  { num: "02", title: "Forum Moderator", body: "Trained to facilitate Forum sessions: hold space, ask the question behind the question, and run experience-shares for your group.", time: "Monthly", term: "1 year", training: "Forum Training Program" },
  { num: "03", title: "Chapter Committee", body: "Serve on a chapter committee in Learning, Membership, Marketing, Forum, Finance, or Strategic Alliance Partners, and shape the program for fellow members.", time: "Variable", term: "1 year", training: "Committee onboarding" },
  { num: "04", title: "Chapter Board", body: "Set chapter strategy and operations across all functions. Accountable to the membership and to EO Global standards.", time: "Variable", term: "1–2 years", training: "EO leadership track" },
  { num: "05", title: "Regional Expert", body: "Contribute subject-matter expertise to the EO APAC region in a program area such as Forum, Learning, or Membership.", time: "Variable", term: "1–2 years", training: "Regional onboarding" },
  { num: "06", title: "Regional Council", body: "Serve on the EO APAC Regional Council, shaping regional direction and connecting chapters across Asia-Pacific.", time: "Variable", term: "1–2 years", training: "Regional Leadership Academy" },
  { num: "07", title: "Global Change Project", body: "Lead a Global Change Project, a six-month initiative that improves how EO operates for 20,000+ members worldwide.", time: "Variable", term: "6 months", training: "Project-based" },
  { num: "08", title: "Global Board", body: "Serve on the EO Global Board, setting direction for the worldwide organization across 61 countries.", time: "Variable", term: "Multi-year", training: "Global Leadership Conference" },
];

export function PathOfLeadershipClient() {
  const [active, setActive] = useState(0);
  const step = PATH_STEPS[active];

  return (
    <div>
      <section className="page-hero page-hero--dark">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--on-dark">Path of Leadership</span>
            <h1 className="display-1" style={{ marginTop: 16, marginBottom: 24, color: "#fff" }}>
              Lead with{" "}
              <span style={{ color: "var(--accent)" }}>purpose</span>
            </h1>
            <p className="lead" style={{ color: "var(--text-on-dark-muted)", maxWidth: 640 }}>
              In EO, leadership is not just encouraged, it is developed. The Path is a structured progression from new member to chapter and global leader, with global executive programs at INSEAD, Wharton, Harvard, and Oxford along the way.
            </p>
            <p className="body" style={{ color: "var(--text-on-dark-muted)", marginTop: 24, fontStyle: "italic", maxWidth: 640 }}>
              &ldquo;Forum and the people I have met through EO have helped me see the world through a more mature lens, challenging my assumptions and expanding how I lead and live.&rdquo;
              <br />
              <span className="caption mono" style={{ color: "var(--accent)", marginTop: 8, display: "inline-block" }}>
                GABY LOO, PRESIDENT-ELECT
              </span>
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="path-grid">
            <div className="path-rail">
              {PATH_STEPS.map((s, i) => (
                <button
                  key={s.num}
                  type="button"
                  className={`path-rail-step ${i === active ? "is-active" : ""}`.trim()}
                  onClick={() => setActive(i)}
                >
                  <span className="mono path-rail-num">{s.num}</span>
                  <span className="path-rail-title">{s.title}</span>
                </button>
              ))}
            </div>
            <div className="path-detail">
              <div className="path-detail-num mono">{step.num} / 08</div>
              <h2 className="display-3" style={{ marginTop: 8, marginBottom: 20 }}>
                {step.title}
              </h2>
              <p className="lead" style={{ marginBottom: 32 }}>{step.body}</p>
              <div className="path-detail-meta">
                <div>
                  <div className="eyebrow">Time commitment</div>
                  <div className="mono path-detail-meta-val">{step.time}</div>
                </div>
                <div>
                  <div className="eyebrow">Term</div>
                  <div className="mono path-detail-meta-val">{step.term}</div>
                </div>
                <div>
                  <div className="eyebrow">Training</div>
                  <div className="mono path-detail-meta-val">{step.training}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FinalCTA />
    </div>
  );
}
