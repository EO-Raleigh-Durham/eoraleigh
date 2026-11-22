"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { Field } from "@/components/Field";
import { CHAPTER_NAME, CHAPTER_PHONE_PLACEHOLDER } from "@/kernel/config/chapter";

type FormState = {
  email: string;
  verification_type: string;
  gross_revenue: string;
  fiscal_year_end: string;
  entity_type: string;
  ownership_pct: string;
  signature: string;
  printed_name: string;
  association: string;
  form_date: string;
  phone: string;
  address: string;
  city: string;
  state_region: string;
  zip_code: string;
};

const VERIFICATION_OPTIONS = [
  "Financial statements are audited annually",
  "Financial statements are unaudited",
  "We are unable to provide audited financials, but can provide supplementary documents (e.g., Tax Returns)",
  "Other",
];

const ENTITY_OPTIONS = [
  "Sole Proprietor",
  "Partnership",
  "Limited Liability Company",
  "Corporation",
  "Other",
];

const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg";

export function RevenueVerificationClient({ initialEmail }: { initialEmail: string }) {
  const [form, setForm] = useState<FormState>({
    email: initialEmail,
    verification_type: "",
    gross_revenue: "",
    fiscal_year_end: "",
    entity_type: "",
    ownership_pct: "",
    signature: "",
    printed_name: "",
    association: "",
    form_date: "",
    phone: "",
    address: "",
    city: "",
    state_region: "",
    zip_code: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }
    if (files.length === 0) {
      setError("Please attach your financial report/statement.");
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      (Object.keys(form) as (keyof FormState)[]).forEach((k) => body.append(k, form[k]));
      files.forEach((f) => body.append("files", f));

      const res = await fetch("/api/revenue-verification", { method: "POST", body });
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

  if (submitted) {
    return (
      <div>
        <section className="section section--tight">
          <div className="container container--narrow">
            <div className="rv-card rv-card--success">
              <div className="rv-success-mark">✓</div>
              <h2 className="display-3" style={{ marginBottom: 16 }}>
                Submission received
              </h2>
              <p className="lead" style={{ color: "var(--text-muted)" }}>
                Thank you{form.printed_name ? `, ${form.printed_name.split(" ")[0]}` : ""}. Your
                revenue verification and documents have been sent to the {CHAPTER_NAME} chapter team.
              </p>
              <Link href="/" className="btn btn--ghost" style={{ marginTop: 24 }}>
                ← Back to home
              </Link>
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
            <span className="eyebrow eyebrow--accent">{CHAPTER_NAME} membership</span>
            <h1 className="display-2" style={{ marginTop: 16, marginBottom: 20 }}>
              Revenue Verification
            </h1>
            <p className="lead">
              Please take a moment to complete this form to verify your company&apos;s annual
              revenue as part of the membership process. Attach your financial report or statement
              and complete the declaration below.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--narrow">
          <form className="rv-card" onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <Field label="Email *" full>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </Field>

              <Field label="Revenue Verification" full>
                <select
                  className="input"
                  value={form.verification_type}
                  onChange={(e) => update("verification_type", e.target.value)}
                >
                  <option value="">Please select</option>
                  {VERIFICATION_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Financial Report / Statement *" full>
                <input
                  className="rv-file"
                  type="file"
                  multiple
                  accept={ACCEPT}
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  required
                />
                {files.length > 0 && (
                  <ul className="rv-file-list">
                    {files.map((f) => (
                      <li key={f.name}>
                        {f.name} <span className="rv-file-size">({Math.ceil(f.size / 1024)} KB)</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="micro" style={{ color: "var(--text-muted)", marginTop: 8 }}>
                  PDF, Word, Excel, or image. Up to 20 MB per file.
                </p>
              </Field>

              <Field label="Gross Revenue">
                <input
                  className="input"
                  type="text"
                  value={form.gross_revenue}
                  onChange={(e) => update("gross_revenue", e.target.value)}
                  placeholder="e.g. US$1,500,000"
                />
              </Field>

              <Field label="Fiscal Year End Date">
                <input
                  className="input"
                  type="text"
                  value={form.fiscal_year_end}
                  onChange={(e) => update("fiscal_year_end", e.target.value)}
                  placeholder="MM - DD - YYYY"
                />
              </Field>

              <Field label="Entity Type">
                <select
                  className="input"
                  value={form.entity_type}
                  onChange={(e) => update("entity_type", e.target.value)}
                >
                  <option value="">Please select</option>
                  {ENTITY_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Ownership % of Applicant">
                <input
                  className="input"
                  type="text"
                  value={form.ownership_pct}
                  onChange={(e) => update("ownership_pct", e.target.value)}
                  placeholder="e.g. 60%"
                />
              </Field>

              <Field label="Signature">
                <input
                  className="input"
                  type="text"
                  value={form.signature}
                  onChange={(e) => update("signature", e.target.value)}
                  placeholder="Type your full name as signature"
                />
              </Field>

              <Field label="Printed name">
                <input
                  className="input"
                  type="text"
                  value={form.printed_name}
                  onChange={(e) => update("printed_name", e.target.value)}
                />
              </Field>

              <Field label="Association">
                <input
                  className="input"
                  type="text"
                  value={form.association}
                  onChange={(e) => update("association", e.target.value)}
                  placeholder="Company / organization"
                />
              </Field>

              <Field label="Date">
                <input
                  className="input"
                  type="text"
                  value={form.form_date}
                  onChange={(e) => update("form_date", e.target.value)}
                  placeholder="MM - DD - YYYY"
                />
              </Field>

              <Field label="Phone Number">
                <input
                  className="input"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder={CHAPTER_PHONE_PLACEHOLDER}
                />
              </Field>

              <Field label="Address" full>
                <input
                  className="input"
                  type="text"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                />
              </Field>

              <Field label="City">
                <input
                  className="input"
                  type="text"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </Field>

              <Field label="State / Region">
                <input
                  className="input"
                  type="text"
                  value={form.state_region}
                  onChange={(e) => update("state_region", e.target.value)}
                />
              </Field>

              <Field label="Zip Code">
                <input
                  className="input"
                  type="text"
                  value={form.zip_code}
                  onChange={(e) => update("zip_code", e.target.value)}
                />
              </Field>
            </div>

            {error && (
              <div className="join-error" role="alert" style={{ marginTop: 16 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn--primary btn--lg"
              style={{ marginTop: 24, width: "100%" }}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
