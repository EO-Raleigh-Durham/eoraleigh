"use client";

import { useState, useTransition } from "react";
import {
  statusLabel,
  type SurveyWithFields,
  type SurveyStatus,
} from "@/lib/surveys";
import { updateSurveyMeta, deleteSurvey } from "./actions";

const STATUSES: SurveyStatus[] = ["draft", "published", "closed"];

export function SurveyMetaForm({ survey }: { survey: SurveyWithFields }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateSurveyMeta(survey.id, formData);
      if (res && !res.ok) setError(res.error);
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `Delete "${survey.name}"? This removes the survey and all its questions. Surveys with responses can't be deleted.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteSurvey(survey.id);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <div>
      {error && <div className="admin-banner admin-banner--err">{error}</div>}

      <form action={handleSubmit} className="admin-form">
        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Survey name</span>
            <input name="name" type="text" required defaultValue={survey.name} />
          </label>
          <label className="admin-field">
            <span className="admin-label">Status</span>
            <select name="status" defaultValue={survey.status}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
            <span className="admin-hint">
              Only published surveys can be taken at the public link.
            </span>
          </label>
        </div>

        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Internal description (optional)</span>
            <textarea
              name="description"
              rows={2}
              defaultValue={survey.description ?? ""}
              placeholder="Notes for the team. Not shown to respondents."
            />
          </label>
        </div>

        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Welcome message (optional)</span>
            <textarea
              name="intro_text"
              rows={2}
              defaultValue={survey.intro_text ?? ""}
              placeholder="Shown on the first screen, before the questions."
            />
          </label>
        </div>

        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Thank-you message (optional)</span>
            <textarea
              name="thank_you_text"
              rows={2}
              defaultValue={survey.thank_you_text ?? ""}
              placeholder="Shown after a respondent submits."
            />
          </label>
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn admin-btn--primary" disabled={pending}>
            {pending ? "Saving..." : "Save survey"}
          </button>
        </div>
      </form>

      <div className="admin-danger-zone">
        <div className="admin-danger-head">Danger zone</div>
        <p className="admin-danger-desc">
          Deleting removes the survey and its questions. A survey that already has
          responses can&apos;t be deleted: set its status to Closed instead.
        </p>
        <button
          type="button"
          className="admin-btn admin-btn--danger"
          onClick={handleDelete}
          disabled={pending}
        >
          Delete survey
        </button>
      </div>
    </div>
  );
}
