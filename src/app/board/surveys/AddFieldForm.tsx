"use client";

import { useState, useTransition } from "react";
import {
  FIELD_TYPE_META,
  SURVEY_FIELD_TYPES,
  isChoiceType,
  type SurveyFieldType,
} from "@/lib/surveys";
import { createSurveyField } from "./actions";

export function AddFieldForm({ surveyId }: { surveyId: string }) {
  const [type, setType] = useState<SurveyFieldType>("short_text");
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createSurveyField(surveyId, formData);
      if (res && !res.ok) {
        setError(res.error);
      } else {
        setType("short_text");
        setFormKey((k) => k + 1); // remount to clear inputs
      }
    });
  }

  return (
    <form key={formKey} action={handleSubmit} className="svb-add">
      <div className="svb-add-head">Add a question</div>
      {error && <div className="admin-banner admin-banner--err">{error}</div>}

      <div className="admin-form-row">
        <label className="admin-field admin-field--full">
          <span className="admin-label">Question</span>
          <input name="label" type="text" required placeholder="What would you like to ask?" />
        </label>
      </div>

      <div className="admin-form-row admin-form-row--2">
        <label className="admin-field">
          <span className="admin-label">Type</span>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as SurveyFieldType)}
          >
            {SURVEY_FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {FIELD_TYPE_META[t].label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field admin-field--inline" style={{ alignSelf: "end", paddingBottom: 10 }}>
          <input name="required" type="checkbox" />
          <span>Required</span>
        </label>
      </div>

      {isChoiceType(type) && (
        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Options (one per line)</span>
            <textarea name="options" rows={3} placeholder={"Option A\nOption B\nOption C"} />
          </label>
        </div>
      )}

      {type === "rating" && (
        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Scale</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input name="min" type="number" defaultValue={1} style={{ width: 70 }} />
              <span className="admin-hint">to</span>
              <input name="max" type="number" defaultValue={5} style={{ width: 70 }} />
            </div>
          </label>
          <div className="admin-form-row--2" style={{ marginBottom: 0 }}>
            <label className="admin-field">
              <span className="admin-label">Low label</span>
              <input name="min_label" type="text" placeholder="e.g. Poor" />
            </label>
            <label className="admin-field">
              <span className="admin-label">High label</span>
              <input name="max_label" type="text" placeholder="e.g. Excellent" />
            </label>
          </div>
        </div>
      )}

      {type === "number" && (
        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Min (optional)</span>
            <input name="min" type="number" />
          </label>
          <label className="admin-field">
            <span className="admin-label">Max (optional)</span>
            <input name="max" type="number" />
          </label>
        </div>
      )}

      <div className="admin-form-actions" style={{ justifyContent: "flex-start", borderTop: 0, marginTop: 8 }}>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={pending}>
          {pending ? "Adding..." : "Add question"}
        </button>
      </div>
    </form>
  );
}
