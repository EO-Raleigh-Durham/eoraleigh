"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createSurvey } from "../actions";

export function NewSurveyForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createSurvey(formData);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <div>
      {error && <div className="admin-banner admin-banner--err">{error}</div>}
      <form action={handleSubmit} className="admin-form">
        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Survey name</span>
            <input
              name="name"
              type="text"
              required
              placeholder="e.g. Q3 Member Pulse"
            />
          </label>
        </div>
        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Description (optional)</span>
            <textarea
              name="description"
              rows={3}
              placeholder="What this survey is for. Shown internally, not to respondents."
            />
          </label>
        </div>
        <div className="admin-form-actions">
          <Link href="/board/surveys" className="admin-btn admin-btn--ghost">
            Cancel
          </Link>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={pending}>
            {pending ? "Creating..." : "Create survey"}
          </button>
        </div>
      </form>
    </div>
  );
}
