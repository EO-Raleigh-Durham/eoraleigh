"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { Field } from "@/components/Field";
import { readFirstTouch } from "@/lib/attribution-client";
import { useSpamTrap } from "@/components/SpamTrap";
import { CHAPTER_CHAT_APP, CHAPTER_CITIES, CHAPTER_PLACE, CHAPTER_NAME, CHAPTER_PHONE_PLACEHOLDER } from "@/kernel/config/chapter";
import { JOIN_TESTIMONIAL } from "@/content/testimonials";

type FormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  revenue: string;
  role: string;
  industry: string;
  city: string;
  why: string;
};

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  revenue: "",
  role: "Founder",
  industry: "",
  city: CHAPTER_CITIES[0] ?? "",
  why: "",
};

const REVENUE_BUCKETS = ["$1M – $3M", "$3M – $10M", "$10M – $50M", "$50M+"];

export function JoinClient() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spamTrap = useSpamTrap();
  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, attribution: readFirstTouch(), ...spamTrap.read() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <section className="page-hero page-hero--light">
        <div className="container container--narrow">
          <Reveal>
            <span className="eyebrow eyebrow--accent">Apply for membership</span>
            <h1 className="display-2" style={{ marginTop: 16, marginBottom: 24 }}>
              Where {CHAPTER_PLACE}&apos;s entrepreneurs grow into world-class leaders
            </h1>
            <p className="lead">
              EO membership is exclusive, not elitist. We accept about 25% of applicants because we are looking for founders who share our core values and pursue growth across their personal life, business, family, and community. Eligibility: founder, co-founder, or majority owner of a {CHAPTER_PLACE ? `${CHAPTER_PLACE}-based ` : ""}business with over US$1 million in annual revenue.
            </p>
            <ol className="review-steps" style={{ marginTop: 32 }}>
              <li>
                <span className="mono">01</span> Submit your application below.
              </li>
              <li>
                <span className="mono">02</span> Meet the chapter team for a coffee chat.
              </li>
              <li>
                <span className="mono">03</span> Start your EO journey.
              </li>
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--accent">Why join</span>
            <h2 className="display-3" style={{ marginTop: 12, marginBottom: 40 }}>
              What membership unlocks
            </h2>
          </Reveal>
          <div className="programs-bento">
            <Reveal className="bento">
              <div className="bento-mark"><span className="mono">01</span></div>
              <h3 className="heading-2" style={{ marginTop: 12 }}>Monthly Forum</h3>
              <p className="body" style={{ color: "var(--text-muted)" }}>
                Confidential, monthly sessions with a small circle of fellow founders. The room you can&apos;t buy your way into.
              </p>
            </Reveal>
            <Reveal delay={80} className="bento">
              <div className="bento-mark"><span className="mono">02</span></div>
              <h3 className="heading-2" style={{ marginTop: 12 }}>Global learning</h3>
              <p className="body" style={{ color: "var(--text-muted)" }}>
                Exclusive access to executive programs at Harvard, Wharton, INSEAD, MIT, and more.
              </p>
            </Reveal>
            <Reveal delay={160} className="bento">
              <div className="bento-mark"><span className="mono">03</span></div>
              <h3 className="heading-2" style={{ marginTop: 12 }}>Leadership opportunities</h3>
              <p className="body" style={{ color: "var(--text-muted)" }}>
                Develop your leadership through chapter, regional, and global roles inside EO.
              </p>
            </Reveal>
            <Reveal delay={240} className="bento">
              <div className="bento-mark"><span className="mono">04</span></div>
              <h3 className="heading-2" style={{ marginTop: 12 }}>Network across SE Asia and beyond</h3>
              <p className="body" style={{ color: "var(--text-muted)" }}>
                Connect with top entrepreneurs across Southeast Asia and 20,000+ EO members worldwide.
              </p>
            </Reveal>
            <Reveal delay={320} className="bento">
              <div className="bento-mark"><span className="mono">05</span></div>
              <h3 className="heading-2" style={{ marginTop: 12 }}>Tight-knit local chapter</h3>
              <p className="body" style={{ color: "var(--text-muted)" }}>
                Built on trust, learning, and shared values, with the {CHAPTER_PLACE} founders shaping the next era.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {JOIN_TESTIMONIAL && (
        <section className="section">
          <div className="container container--text" style={{ textAlign: "center" }}>
            <Reveal>
              <p className="words-quote" style={{ color: "var(--text)", maxWidth: 720, margin: "0 auto 24px" }}>
                &ldquo;{JOIN_TESTIMONIAL.quote}&rdquo;
              </p>
              <div className="caption mono" style={{ color: "var(--text-muted)" }}>
                {JOIN_TESTIMONIAL.attribution}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--narrow">
          {submitted ? (
            <div className="join-card join-card--success">
              <div className="join-success-mark">✓</div>
              <h2 className="display-3" style={{ marginBottom: 16 }}>
                Application received
              </h2>
              <p className="lead" style={{ marginBottom: 24, color: "var(--text-muted)" }}>
                Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""}. The membership team reviews every application personally.
              </p>
              <ol className="review-steps" style={{ marginBottom: 32 }}>
                <li>
                  <span className="mono">01</span> Membership team reviews within 5 business days.
                </li>
                <li>
                  <span className="mono">02</span> Two existing members invite you to a coffee chat.
                </li>
                <li>
                  <span className="mono">03</span> Final decision communicated within 2 weeks.
                </li>
              </ol>
              <Link href="/" className="btn btn--ghost">
                ← Back to home
              </Link>
            </div>
          ) : (
          <div className="join-card">
            <div className="join-progress">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className={`join-progress-step ${step >= n ? "is-done" : ""} ${
                    step === n ? "is-active" : ""
                  }`.trim()}
                >
                  <span className="mono">{String(n).padStart(2, "0")}</span>
                </div>
              ))}
              <div className="join-progress-bar">
                <div
                  className="join-progress-bar-fill"
                  style={{ width: ((step - 1) / 3) * 100 + "%" }}
                ></div>
              </div>
            </div>

            {step === 1 && (
              <div className="join-step">
                <div className="join-step-head">
                  <span className="eyebrow">Step 01 / 04</span>
                  <h2 className="heading-1" style={{ marginTop: 8 }}>About you</h2>
                </div>
                <div className="form-grid">
                  <Field label="Full name *">
                    <input
                      className="input"
                      type="text"
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="Nguyen Van A"
                    />
                  </Field>
                  <Field label="Email *">
                    <input
                      className="input"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="you@company.com"
                    />
                  </Field>
                  <Field label={CHAPTER_CHAT_APP ? `Phone (${CHAPTER_CHAT_APP} preferred)` : "Phone"}>
                    <input
                      className="input"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder={CHAPTER_PHONE_PLACEHOLDER}
                    />
                  </Field>
                  <Field label="City">
                    {CHAPTER_CITIES.length > 0 ? (
                      <select
                        className="input"
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                      >
                        {CHAPTER_CITIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                        <option>Other</option>
                      </select>
                    ) : (
                      <input
                        className="input"
                        type="text"
                        autoComplete="address-level2"
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                      />
                    )}
                  </Field>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="join-step">
                <div className="join-step-head">
                  <span className="eyebrow">Step 02 / 04</span>
                  <h2 className="heading-1" style={{ marginTop: 8 }}>Your business</h2>
                </div>
                <div className="form-grid">
                  <Field label="Company name *">
                    <input
                      className="input"
                      type="text"
                      autoComplete="organization"
                      value={form.company}
                      onChange={(e) => update("company", e.target.value)}
                    />
                  </Field>
                  <Field label="Your role *">
                    <select
                      className="input"
                      value={form.role}
                      onChange={(e) => update("role", e.target.value)}
                    >
                      <option>Founder</option>
                      <option>Co-founder</option>
                      <option>CEO</option>
                      <option>Owner / Majority shareholder</option>
                    </select>
                  </Field>
                  <Field label="Industry">
                    <input
                      className="input"
                      type="text"
                      value={form.industry}
                      onChange={(e) => update("industry", e.target.value)}
                      placeholder="e.g. SaaS, F&B, manufacturing"
                    />
                  </Field>
                  <Field label="Annual revenue (USD) *" full>
                    <div className="revenue-options">
                      {REVENUE_BUCKETS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`revenue-option ${form.revenue === opt ? "is-selected" : ""}`.trim()}
                          onClick={() => update("revenue", opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    <p className="micro" style={{ color: "var(--text-muted)", marginTop: 8 }}>
                      EO requires a minimum $1M USD in annual revenue. Don&apos;t qualify yet?{" "}
                      <Link href="/about" style={{ color: "var(--accent)" }}>
                        EO Accelerator
                      </Link>{" "}
                      may be for you.
                    </p>
                  </Field>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="join-step">
                <div className="join-step-head">
                  <span className="eyebrow">Step 03 / 04</span>
                  <h2 className="heading-1" style={{ marginTop: 8 }}>Why EO?</h2>
                </div>
                <Field label={`In a few sentences, why do you want to join ${CHAPTER_NAME}? *`} full>
                  <textarea
                    className="input"
                    rows={6}
                    value={form.why}
                    onChange={(e) => update("why", e.target.value)}
                    placeholder="What are you looking to learn, change, or get unstuck on?"
                  ></textarea>
                </Field>
                <div className="join-checks">
                  <label className="join-check">
                    <input type="checkbox" defaultChecked />
                    <span>I commit to monthly Forum attendance and the EO confidentiality oath.</span>
                  </label>
                  <label className="join-check">
                    <input type="checkbox" defaultChecked />
                    <span>I&apos;m comfortable being introduced to two existing members for a coffee chat.</span>
                  </label>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="join-step join-step--review">
                <div className="join-step-head">
                  <span className="eyebrow">Step 04 / 04</span>
                  <h2 className="heading-1" style={{ marginTop: 8 }}>Review &amp; submit</h2>
                </div>
                <div className="review-list">
                  {(
                    [
                      ["Name", form.name || "-"],
                      ["Email", form.email || "-"],
                      ["Phone", form.phone || "-"],
                      ["City", form.city],
                      ["Company", form.company || "-"],
                      ["Role", form.role],
                      ["Industry", form.industry || "-"],
                      ["Revenue", form.revenue || "-"],
                      ["Why EO", form.why || "-"],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="review-row">
                      <div className="review-key eyebrow">{k}</div>
                      <div className="review-val">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="review-next">
                  <h3 className="heading-3" style={{ marginBottom: 8 }}>What happens next</h3>
                  <ol className="review-steps">
                    <li>
                      <span className="mono">01</span> Membership team reviews within 5 business days.
                    </li>
                    <li>
                      <span className="mono">02</span> Two existing members invite you to a coffee chat.
                    </li>
                    <li>
                      <span className="mono">03</span> Final decision communicated within 2 weeks.
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {error && (
              <div className="join-error" role="alert">
                {error}
              </div>
            )}

            <div className="join-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={back}
                disabled={step === 1 || submitting}
                style={{ visibility: step === 1 ? "hidden" : "visible" }}
              >
                ← Back
              </button>
              {step < 4 ? (
                <button type="button" className="btn btn--primary btn--lg" onClick={next}>
                  Continue <span className="arrow">→</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary btn--lg"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : (
                    <>Submit application <span className="arrow">→</span></>
                  )}
                </button>
              )}
            </div>
            {spamTrap.field}
          </div>
          )}
        </div>
      </section>
    </div>
  );
}
