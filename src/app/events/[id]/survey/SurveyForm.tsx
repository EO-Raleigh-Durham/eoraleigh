"use client";

import { useState, useTransition } from "react";
import { EVENT_VALUE_SCALE } from "@/lib/event-feedback";
import { submitEventSurvey } from "./actions";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export function SurveyForm({
  eventId,
}: {
  eventId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await submitEventSurvey(eventId, formData);
      if (res.ok) setDone(true);
      else setError(res.error);
    });
  }

  if (done) {
    return (
      <div className="svy-success">
        <h3>Thank you</h3>
        <p>
          Your feedback has been recorded. We appreciate you helping {CHAPTER_NAME}{" "}
          improve
        </p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="svy-form">
      {error && <div className="svy-error">{error}</div>}

      <fieldset className="svy-q">
        <legend className="svy-q-label">
          Overall, how valuable was this event to you?
        </legend>
        <div className="svy-scale">
          {EVENT_VALUE_SCALE.map((opt) => (
            <label
              key={opt.value}
              className={`svy-scale-opt${rating === opt.value ? " is-selected" : ""}`}
            >
              <input
                type="radio"
                name="event_value_rating"
                value={opt.value}
                checked={rating === opt.value}
                onChange={() => setRating(opt.value)}
                required
              />
              <span className="svy-scale-num">{opt.value}</span>
              <span className="svy-scale-word">{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="svy-q">
        <span className="svy-q-label">What was the most valuable part of the event?</span>
        <textarea name="loved_text" rows={4} placeholder="Optional" />
      </label>

      <label className="svy-q">
        <span className="svy-q-label">
          What is one thing we could improve for future events?
        </span>
        <textarea name="improve_text" rows={4} placeholder="Optional" />
      </label>

      <div className="svy-id-row">
        <label className="svy-field">
          <span className="svy-q-label">Name (optional)</span>
          <input name="name" type="text" autoComplete="name" placeholder="Your name" />
        </label>
        <label className="svy-field">
          <span className="svy-q-label">Email</span>
          <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </label>
      </div>

      <button
        type="submit"
        className="btn btn--primary btn--lg"
        disabled={pending}
        style={{ marginTop: 8 }}
      >
        {pending ? "Submitting..." : "Submit feedback"}
      </button>
    </form>
  );
}
