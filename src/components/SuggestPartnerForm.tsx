"use client";

import { useState, useTransition } from "react";
import { Field } from "./Field";
import { submitPartnerSuggestion } from "@/app/partners/suggest/actions";

// Public form: a member suggests a company as a potential Strategic Alliance
// Partner. Mirrors the RsvpForm server-action pattern (useTransition + inline
// success/error). The submission lands in the SAP pipeline as a Lead and
// links the submitting member as the referrer.

export function SuggestPartnerForm() {
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await submitPartnerSuggestion(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="sap-suggest-success">
        <div className="sap-suggest-success-mark">✓</div>
        <h3 className="heading-2" style={{ marginBottom: 12 }}>
          Thank you
        </h3>
        <p className="text-muted" style={{ lineHeight: 1.6, margin: 0 }}>
          We have shared your suggestion with the chapter Strategic Alliance
          Partner chair. If it is a fit, they will follow up about next steps.
        </p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="sap-suggest-form">
      {/* Honeypot: hidden from people, tempting to bots. */}
      <div className="sap-suggest-hp" aria-hidden="true">
        <label>
          Company URL
          <input
            name="company_url"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="sap-suggest-fields">
        <Field label="Your name">
          <input name="your_name" type="text" required placeholder="Full name" />
        </Field>
        <Field label="Your email">
          <input
            name="your_email"
            type="email"
            required
            placeholder="you@company.com"
          />
        </Field>
        <Field label="Company name">
          <input
            name="company_name"
            type="text"
            required
            placeholder="The business you are suggesting"
          />
        </Field>
        <Field label="Company website">
          <input name="website" type="url" placeholder="https://example.com" />
        </Field>
        <Field label="Industry">
          <input
            name="industry"
            type="text"
            placeholder="Hospitality, legal, healthcare ..."
          />
        </Field>
        <Field label="Your contact there (optional)">
          <input
            name="contact_there"
            type="text"
            placeholder="A name, or how you know them"
          />
        </Field>
        <Field
          label="Why would they make a great Strategic Alliance Partner?"
          full
        >
          <textarea
            name="motivation"
            rows={4}
            required
            placeholder="What member value could they offer, and what is your connection?"
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
        style={{ marginTop: 24 }}
        disabled={pending}
      >
        {pending ? "Submitting..." : "Submit suggestion"}
      </button>
    </form>
  );
}
