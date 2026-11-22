"use client";

import { useState } from "react";
import { Reveal } from "@/components/Reveal";

export type Testimonial = {
  name: string;
  role?: string;
  quote: string;
  img?: string | null;
};

type Props = {
  testimonials: Testimonial[];
  eyebrow?: string;
  heading?: string;
  variant?: "alt" | "light" | "dark";
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

export function Testimonials({ testimonials, eyebrow, heading, variant = "alt" }: Props) {
  const [active, setActive] = useState(0);
  if (testimonials.length === 0) return null;
  const t = testimonials[active];
  const multiple = testimonials.length > 1;
  const isDark = variant === "dark";

  const sectionClass =
    variant === "dark"
      ? "section section--dark"
      : variant === "light"
      ? "section"
      : "section section--alt";

  return (
    <section className={sectionClass}>
      <div className="container container--text">
        {(eyebrow || heading) && (
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              {eyebrow && (
                <span className={`eyebrow ${isDark ? "eyebrow--on-dark" : "eyebrow--accent"}`.trim()}>
                  {eyebrow}
                </span>
              )}
              {heading && (
                <h2
                  className="display-3"
                  style={{ marginTop: 12, color: isDark ? "#fff" : undefined }}
                >
                  {heading}
                </h2>
              )}
            </div>
          </Reveal>
        )}

        <Reveal className={`testimonials ${isDark ? "testimonials--dark" : ""}`.trim()}>
          <div className="testimonials-mark">&ldquo;</div>
          <p className="testimonials-quote">{t.quote}</p>
          <div className="testimonials-attr">
            <div className="testimonials-attr-avatar">
              {t.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.img} alt="" />
              ) : (
                <span className="testimonials-attr-initials">{initials(t.name)}</span>
              )}
            </div>
            <div>
              <div className="testimonials-attr-name">{t.name}</div>
              {t.role && <div className="testimonials-attr-role mono">{t.role}</div>}
            </div>
          </div>

          {multiple && (
            <div className="testimonials-pager">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`testimonials-pager-dot ${active === i ? "is-active" : ""}`.trim()}
                  onClick={() => setActive(i)}
                  aria-label={`Quote ${i + 1} of ${testimonials.length}`}
                />
              ))}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
