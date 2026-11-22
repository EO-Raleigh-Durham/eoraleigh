"use client";

import { useState } from "react";
import { Reveal } from "./Reveal";
import { Field } from "./Field";
import { PODCAST_RECORDING_LOCATION } from "@/content/podcast";
import { useSpamTrap } from "./SpamTrap";

type FormState = {
  name: string;
  email: string;
  company: string;
  revenue: string;
  story: string;
};

const INITIAL: FormState = { name: "", email: "", company: "", revenue: "", story: "" };

export function PodcastGuestForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spamTrap = useSpamTrap();

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/podcast-guest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, ...spamTrap.read() }),
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

  if (submitted) {
    return (
      <Reveal delay={120} className="podcast-apply-form">
        <div className="podcast-apply-success">
          <div className="podcast-apply-success-mark">✓</div>
          <h3 className="heading-2" style={{ color: "#fff", marginBottom: 12 }}>
            Pitch received
          </h3>
          <p style={{ color: "var(--text-on-dark-muted)", lineHeight: 1.6 }}>
            Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""}. The podcast team reviews pitches every Friday and replies within two weeks. If your story is a fit, we&apos;ll book a recording in {PODCAST_RECORDING_LOCATION}.
          </p>
        </div>
      </Reveal>
    );
  }

  return (
    <Reveal delay={120} className="podcast-apply-form">
      <h3 className="heading-2" style={{ color: "#fff", marginBottom: 24 }}>
        Tell us your story
      </h3>
      <div className="podcast-apply-fields">
        <Field label="Your name">
          <input
            type="text"
            autoComplete="name"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </Field>
        <Field label="Company">
          <input
            type="text"
            autoComplete="organization"
            placeholder="Company name"
            value={form.company}
            onChange={(e) => update("company", e.target.value)}
          />
        </Field>
        <Field label="Annual revenue">
          <input
            type="text"
            placeholder="USD"
            value={form.revenue}
            onChange={(e) => update("revenue", e.target.value)}
          />
        </Field>
        <Field label="What is your story, in one sentence?" full>
          <textarea
            rows={3}
            placeholder="What did you do, and why should other founders hear about it?"
            value={form.story}
            onChange={(e) => update("story", e.target.value)}
          ></textarea>
        </Field>
      </div>
      {error && (
        <div className="join-error" role="alert" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}
      <button
        type="button"
        className="btn btn--primary btn--lg"
        style={{ marginTop: 24, width: "100%" }}
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? "Submitting..." : "Submit application"}
      </button>
      {spamTrap.field}
    </Reveal>
  );
}
