"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { CHAPTER_PHONE_PLACEHOLDER } from "@/kernel/config/chapter";
import { Field } from "@/components/Field";
import { submitRequalification } from "./actions";

// Annual member re-qualification form (Plan 26).
// Collects the member's confirmed core details plus this year's qualification
// figures. The form does NOT adjudicate qualification: under $1M it shows an
// informational message and asks the grandfather question, but every answer is
// just collected. Submission is once per fiscal year, members only.

type FormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  revenue: string; // raw digits, USD
  employees: string;
  ownership: string; // percentage 0-100
  challenge: string;
  exitedOver8m: "" | "yes" | "no";
  exitDetails: string;
};

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  revenue: "",
  employees: "",
  ownership: "",
  challenge: "",
  exitedOver8m: "",
  exitDetails: "",
};

// Fields we can pre-populate from what we already know about the signed-in
// member. Anything missing simply stays blank.
export type RequalifyPrefill = Partial<
  Pick<FormState, "name" | "email" | "phone" | "company" | "employees">
>;

const REVENUE_THRESHOLD = 1_000_000; // USD — below this opens the sub-section
const GRANDFATHER_FLOOR = 8_000_000; // USD — prior exit that grandfathers a member

function parseMoney(raw: string): number | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return null;
  return Number(digits);
}

function formatMoney(raw: string): string {
  const n = parseMoney(raw);
  return n === null ? "" : n.toLocaleString("en-US");
}

export function RequalifyForm({
  prefill,
  revenueYear,
}: {
  prefill?: RequalifyPrefill;
  revenueYear: number;
}) {
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM, ...prefill });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const revenueValue = parseMoney(form.revenue);
  const belowThreshold = revenueValue !== null && revenueValue < REVENUE_THRESHOLD;

  async function handleSubmit() {
    setError(null);
    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.company.trim() ||
      revenueValue === null ||
      !form.employees.trim() ||
      !form.ownership.trim() ||
      !form.challenge.trim()
    ) {
      setError("Please complete every required field before submitting.");
      return;
    }
    if (belowThreshold && form.exitedOver8m === "") {
      setError("Please answer the question about a previous exit.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitRequalification({
        name: form.name,
        email: form.email,
        phone: form.phone,
        company: form.company,
        revenue: revenueValue,
        employees: form.employees ? Number(form.employees) : null,
        ownershipPct: form.ownership ? Number(form.ownership) : null,
        challenge: form.challenge,
        exitedOver8m: belowThreshold ? form.exitedOver8m === "yes" : null,
        exitDetails: form.exitDetails,
      });
      if (!res.ok) {
        setError(res.error || "Something went wrong saving your answers. Please try again.");
        return;
      }
      setSubmitted(true);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    const rows: [string, string][] = [
      ["Name", form.name],
      ["Email", form.email],
      ["Phone", form.phone],
      ["Primary company", form.company],
      [`${revenueYear} revenue (USD)`, revenueValue !== null ? `$${revenueValue.toLocaleString("en-US")}` : "-"],
      ["Current employees", form.employees],
      ["Ownership", form.ownership ? `${form.ownership}%` : "-"],
      ["Biggest challenge", form.challenge],
    ];
    if (belowThreshold) {
      rows.push(["Exited a company for over $8M", form.exitedOver8m === "yes" ? "Yes" : "No"]);
      if (form.exitedOver8m === "yes" && form.exitDetails.trim()) {
        rows.push(["Exit details", form.exitDetails]);
      }
    }
    return (
      <div>
        <section className="section section--tight">
          <div className="container container--narrow">
            <div className="join-card join-card--success">
              <div className="join-success-mark">✓</div>
              <h2 className="display-3" style={{ marginBottom: 16 }}>
                Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""}
              </h2>
              <p className="lead" style={{ marginBottom: 8, color: "var(--text-muted)" }}>
                Here is what the form captured.
              </p>
              <p className="micro" style={{ marginBottom: 24, color: "var(--text-muted)" }}>
                Your answers have been saved.
              </p>
              <div className="review-list" style={{ textAlign: "left" }}>
                {rows.map(([k, v]) => (
                  <div key={k} className="review-row">
                    <div className="review-key eyebrow">{k}</div>
                    <div className="review-val">{v || "-"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <section className="page-hero page-hero--light">
        <div className="container container--narrow">
          <Reveal>
            <span className="eyebrow eyebrow--accent">Annual re-qualification</span>
            <h1 className="display-2" style={{ marginTop: 16, marginBottom: 24 }}>
              Confirm your details for the new membership year
            </h1>
            <p className="lead">
              Take a moment to confirm your information and share where your business is today. It only takes a couple of minutes.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--narrow">
          <div className="join-card">
            <div className="join-step">
              <div className="join-step-head">
                <span className="eyebrow">Your details</span>
                <h2 className="heading-1" style={{ marginTop: 8 }}>Confirm your information</h2>
              </div>
              <div className="form-grid">
                <Field label="Full name *">
                  <input
                    className="input"
                    type="text"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Nguyen Van A"
                  />
                </Field>
                <Field label="Email *">
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="you@company.com"
                  />
                </Field>
                <Field label="Phone (WhatsApp preferred) *">
                  <input
                    className="input"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder={CHAPTER_PHONE_PLACEHOLDER}
                  />
                </Field>
                <Field label="Primary company *">
                  <input
                    className="input"
                    type="text"
                    value={form.company}
                    onChange={(e) => update("company", e.target.value)}
                  />
                </Field>
              </div>
            </div>

            <div className="join-step" style={{ marginTop: 8 }}>
              <div className="join-step-head">
                <span className="eyebrow">Your business today</span>
                <h2 className="heading-1" style={{ marginTop: 8 }}>This year&apos;s numbers</h2>
              </div>
              <div className="form-grid">
                <Field label={`${revenueYear} revenue, USD *`}>
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    value={formatMoney(form.revenue)}
                    onChange={(e) => update("revenue", e.target.value)}
                    placeholder="1,000,000"
                  />
                </Field>
                <Field label="Current number of employees *">
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    value={form.employees.replace(/[^0-9]/g, "")}
                    onChange={(e) => update("employees", e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g. 25"
                  />
                </Field>
                <Field label="What percentage of shares in the company do you own? *">
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    value={form.ownership}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, "");
                      const n = digits ? Math.min(100, Number(digits)) : "";
                      update("ownership", n === "" ? "" : String(n));
                    }}
                    placeholder="e.g. 60"
                  />
                </Field>
              </div>

              {belowThreshold && (
                <div className="rqf-callout">
                  <p className="body" style={{ marginBottom: 16 }}>
                    Based on your 2025 revenue you currently don&apos;t meet the ${(REVENUE_THRESHOLD / 1_000_000).toFixed(0)}M qualification, but you have one year to get your revenue back over ${(REVENUE_THRESHOLD / 1_000_000).toFixed(0)}M and remain a member.
                  </p>
                  <Field label={`Have you previously exited a company for over $${(GRANDFATHER_FLOOR / 1_000_000).toFixed(0)}M USD? *`} full>
                    <div className="revenue-options">
                      {(["yes", "no"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`revenue-option ${form.exitedOver8m === opt ? "is-selected" : ""}`.trim()}
                          onClick={() => update("exitedOver8m", opt)}
                        >
                          {opt === "yes" ? "Yes" : "No"}
                        </button>
                      ))}
                    </div>
                  </Field>
                  {form.exitedOver8m === "yes" && (
                    <Field label="Tell us about the exit (optional)" full>
                      <textarea
                        className="input"
                        rows={3}
                        value={form.exitDetails}
                        onChange={(e) => update("exitDetails", e.target.value)}
                        placeholder="Company, year, approximate value"
                      ></textarea>
                    </Field>
                  )}
                </div>
              )}
            </div>

            <div className="join-step" style={{ marginTop: 8 }}>
              <Field label="What's your biggest challenge right now that you hope EO can help you with? *" full>
                <textarea
                  className="input"
                  rows={5}
                  value={form.challenge}
                  onChange={(e) => update("challenge", e.target.value)}
                  placeholder="Share what's most on your mind."
                ></textarea>
              </Field>
            </div>

            {error && (
              <div className="join-error" role="alert">
                {error}
              </div>
            )}

            <div className="join-actions" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn--primary btn--lg"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : (<>Submit <span className="arrow">→</span></>)}
              </button>
            </div>
          </div>

          <p className="micro" style={{ color: "var(--text-muted)", marginTop: 16, textAlign: "center" }}>
            Need help? <Link href="/" style={{ color: "var(--accent)" }}>Contact the chapter team</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
