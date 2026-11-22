"use client";

import { useState } from "react";
import { Reveal } from "@/components/Reveal";
import { HOME_MEMBER_QUOTES as QUOTES } from "@/content/home";

export function MemberWords() {
  const [active, setActive] = useState(0);
  const q = QUOTES[active];
  if (!q) return null;
  return (
    <section className="section section--dark words-section">
      <div className="container">
        <div className="words-grid">
          <div className="words-head">
            <Reveal>
              <span className="eyebrow eyebrow--on-dark">In their own words</span>
              <h2 className="display-3" style={{ marginTop: 12, color: "#fff" }}>
                Don&apos;t take our word for it
              </h2>
              <p className="lead" style={{ color: "var(--text-on-dark-muted)", marginTop: 16, maxWidth: 420 }}>
                Hear from members who showed up skeptical and stayed for the long haul.
              </p>
            </Reveal>
          </div>

          <div className="words-stage">
            <div className="words-quote-mark mono">&ldquo;</div>
            <p className="words-quote">{q.quote}</p>
            <div className="words-attr">
              <div className="words-attr-avatar">
                {q.img ? (
                  <img src={q.img} alt="" />
                ) : (
                  <span className="words-attr-initials">
                    {q.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                )}
              </div>
              <div>
                <div className="words-attr-name">{q.name}</div>
                <div className="words-attr-role mono">{q.role}</div>
              </div>
            </div>

            <div className="words-pager">
              {QUOTES.map((_, i) => (
                <button
                  key={i}
                  className={`words-pager-dot ${active === i ? "is-active" : ""}`.trim()}
                  onClick={() => setActive(i)}
                  aria-label={`Quote ${i + 1}`}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
