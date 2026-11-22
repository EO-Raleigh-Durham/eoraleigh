"use client";

import { useState } from "react";
import type { SurveyField } from "@/lib/surveys";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { submitSurveyResponse } from "../actions";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

type StepperSurvey = {
  slug: string;
  name: string;
  intro_text: string | null;
  thank_you_text: string | null;
  fields: SurveyField[];
};

type AnswerValue = string | string[];

export function SurveyStepper({ survey }: { survey: StepperSurvey }) {
  const { fields } = survey;
  // step 0 = welcome + contact; steps 1..fields.length = one field each
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ thankYou: string | null } | null>(null);

  const totalSteps = fields.length + 1;
  const isContact = step === 0;
  const field = isContact ? null : fields[step - 1];
  const isLast = step === fields.length;
  const progress = done ? 100 : Math.round((step / totalSteps) * 100);

  function setAnswer(fieldId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setError(null);
  }

  function toggleMulti(fieldId: string, option: string) {
    setAnswers((prev) => {
      const cur = Array.isArray(prev[fieldId]) ? (prev[fieldId] as string[]) : [];
      const next = cur.includes(option)
        ? cur.filter((o) => o !== option)
        : [...cur, option];
      return { ...prev, [fieldId]: next };
    });
    setError(null);
  }

  function blank(v: AnswerValue | undefined): boolean {
    if (v === undefined) return true;
    if (Array.isArray(v)) return v.length === 0;
    return v.trim() === "";
  }

  async function advance() {
    setError(null);
    if (isContact) {
      if (!name.trim()) return setError("Please enter your name");
      if (!email.trim() || !email.includes("@")) {
        return setError("Please enter a valid email");
      }
    } else if (field) {
      if (field.required && blank(answers[field.id])) {
        return setError("This question is required");
      }
    }
    if (isLast) {
      await submit();
    } else {
      setStep((s) => s + 1);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await submitSurveyResponse({
      slug: survey.slug,
      name: name.trim(),
      email: email.trim(),
      answers,
    });
    setSubmitting(false);
    if (res.ok) setDone({ thankYou: res.thankYou });
    else setError(res.error);
  }

  function onKeyDownAdvance(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      void advance();
    }
  }

  if (done) {
    return (
      <main className="svs-wrap">
        <div className="svs-card svs-done">
          <div className="svs-done-mark" aria-hidden>
            ✓
          </div>
          <h1 className="svs-done-title">
            {done.thankYou ?? "Thank you, your response has been recorded"}
          </h1>
          <PortalInviteCta initialEmail={email.trim()} />
        </div>
      </main>
    );
  }

  return (
    <main className="svs-wrap">
      <div className="svs-progress" aria-hidden>
        <div className="svs-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="svs-card" key={step}>
        {isContact ? (
          <div>
            <div className="svs-eyebrow">{CHAPTER_NAME}</div>
            <h1 className="svs-title">{survey.name}</h1>
            {survey.intro_text && <p className="svs-intro">{survey.intro_text}</p>}
            <div className="svs-field">
              <label className="svs-label" htmlFor="svs-name">
                Your name
              </label>
              <input
                id="svs-name"
                className="svs-input"
                type="text"
                autoComplete="name"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={onKeyDownAdvance}
                placeholder="Jane Founder"
              />
            </div>
            <div className="svs-field">
              <label className="svs-label" htmlFor="svs-email">
                Your email
              </label>
              <input
                id="svs-email"
                className="svs-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKeyDownAdvance}
                placeholder="jane@company.com"
              />
            </div>
          </div>
        ) : field ? (
          <div>
            <div className="svs-step-count">
              Question {step} of {fields.length}
            </div>
            <h2 className="svs-question">
              {field.label}
              {field.required && <span className="svs-req"> *</span>}
            </h2>
            {field.help_text && <p className="svs-help">{field.help_text}</p>}
            <div className="svs-answer">
              <FieldInput
                field={field}
                value={answers[field.id]}
                setValue={(v) => setAnswer(field.id, v)}
                toggleMulti={(o) => toggleMulti(field.id, o)}
                onEnter={onKeyDownAdvance}
              />
            </div>
          </div>
        ) : null}

        {error && <div className="svs-error">{error}</div>}

        <div className="svs-nav">
          {step > 0 && (
            <button
              type="button"
              className="svs-btn svs-btn--ghost"
              onClick={() => {
                setError(null);
                setStep((s) => Math.max(0, s - 1));
              }}
              disabled={submitting}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className="svs-btn svs-btn--primary"
            onClick={() => void advance()}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : isLast ? "Submit" : "Next"}
          </button>
        </div>
      </div>
    </main>
  );
}

// Shown under the thank-you message. Every respondent gets the same offer: a
// secure sign-in link emailed to the address they gave, or to another one they
// type. It never says whether an email belongs to a member or already has an
// account, so the public survey cannot be used to test addresses. What the
// link opens is decided on the server when it is clicked.
function PortalInviteCta({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sendMagicLink() {
    const to = email.trim().toLowerCase();
    if (!to.includes("@")) {
      setMsg("Please enter a valid email");
      return;
    }
    setSending(true);
    setMsg(null);
    const supabase = createBrowserSupabase();
    const callback = new URL("/api/auth/callback", window.location.origin);
    callback.searchParams.set("next", "/member");
    const { error } = await supabase.auth.signInWithOtp({
      email: to,
      options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
    });
    setSending(false);
    if (error) {
      setMsg("We could not send the link. Please try again.");
      return;
    }
    setEmail(to);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="svs-invite">
        <h2 className="svs-invite-title">Check your inbox</h2>
        <p className="svs-invite-text">
          We sent a secure link to {email}. Click it to open the {CHAPTER_NAME}{" "}
          Portal.
        </p>
      </div>
    );
  }

  return (
    <div className="svs-invite">
      <h2 className="svs-invite-title">Access the member portal</h2>
      <p className="svs-invite-text">
        Browse events, the member directory, chapter priorities and newsletters.
        We will email you a secure sign-in link. Use the email you registered
        with EO.
      </p>
      <div className="svs-invite-actions">
        <input
          className="svs-input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
        />
        <button
          type="button"
          className="svs-btn svs-btn--primary"
          onClick={() => void sendMagicLink()}
          disabled={sending || !email.trim()}
        >
          {sending ? "Sending link..." : "Email me a link"}
        </button>
      </div>
      {msg && <div className="svs-error">{msg}</div>}
    </div>
  );
}

function FieldInput({
  field,
  value,
  setValue,
  toggleMulti,
  onEnter,
}: {
  field: SurveyField;
  value: AnswerValue | undefined;
  setValue: (v: AnswerValue) => void;
  toggleMulti: (option: string) => void;
  onEnter: (e: React.KeyboardEvent) => void;
}) {
  const str = typeof value === "string" ? value : "";
  const arr = Array.isArray(value) ? value : [];
  const options = field.config.options ?? [];

  switch (field.type) {
    case "long_text":
      return (
        <textarea
          className="svs-input svs-textarea"
          rows={4}
          value={str}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type your answer here"
        />
      );
    case "email":
      return (
        <input
          className="svs-input"
          type="email"
          value={str}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onEnter}
          placeholder="name@company.com"
        />
      );
    case "number":
      return (
        <input
          className="svs-input"
          type="number"
          value={str}
          autoFocus
          min={field.config.min}
          max={field.config.max}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onEnter}
          placeholder="0"
        />
      );
    case "date":
      return (
        <input
          className="svs-input"
          type="date"
          value={str}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onEnter}
        />
      );
    case "dropdown":
      return (
        <select
          className="svs-input"
          value={str}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
        >
          <option value="">Select an option</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "single_choice":
      return (
        <div className="svs-options">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              className={`svs-option ${str === o ? "is-selected" : ""}`}
              onClick={() => setValue(o)}
            >
              {o}
            </button>
          ))}
        </div>
      );
    case "multi_choice":
      return (
        <div className="svs-options">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              className={`svs-option ${arr.includes(o) ? "is-selected" : ""}`}
              onClick={() => toggleMulti(o)}
            >
              <span className="svs-check" aria-hidden>
                {arr.includes(o) ? "✓" : ""}
              </span>
              {o}
            </button>
          ))}
        </div>
      );
    case "yes_no":
      return (
        <div className="svs-options svs-options--row">
          {["Yes", "No"].map((o) => (
            <button
              key={o}
              type="button"
              className={`svs-option ${str === o ? "is-selected" : ""}`}
              onClick={() => setValue(o)}
            >
              {o}
            </button>
          ))}
        </div>
      );
    case "rating": {
      const min = field.config.min ?? 1;
      const max = field.config.max ?? 5;
      const scale: number[] = [];
      for (let i = min; i <= max; i++) scale.push(i);
      return (
        <div>
          {/* Inline layout keeps the whole scale on one row on phones. */}
          <div className="svs-rating" style={{ flexWrap: "nowrap", gap: 8 }}>
            {scale.map((n) => (
              <button
                key={n}
                type="button"
                style={{ flex: "1 1 0", minWidth: 0, width: "auto" }}
                className={`svs-rating-btn ${str === String(n) ? "is-selected" : ""}`}
                onClick={() => setValue(String(n))}
              >
                {n}
              </button>
            ))}
          </div>
          {(field.config.min_label || field.config.max_label) && (
            <div className="svs-rating-labels">
              <span>{field.config.min_label ?? ""}</span>
              <span>{field.config.max_label ?? ""}</span>
            </div>
          )}
        </div>
      );
    }
    case "short_text":
    default:
      return (
        <input
          className="svs-input"
          type="text"
          value={str}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onEnter}
          placeholder="Type your answer here"
        />
      );
  }
}
