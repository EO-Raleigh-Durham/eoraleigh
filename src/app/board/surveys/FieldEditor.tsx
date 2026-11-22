"use client";

import { useState, useTransition } from "react";
import {
  FIELD_TYPE_META,
  SURVEY_FIELD_TYPES,
  isChoiceType,
  type SurveyField,
  type SurveyFieldType,
} from "@/lib/surveys";
import { updateSurveyField, deleteSurveyField, moveSurveyField } from "./actions";

type Props = {
  field: SurveyField;
  surveyId: string;
  isFirst: boolean;
  isLast: boolean;
};

export function FieldEditor({ field, surveyId, isFirst, isLast }: Props) {
  const locked = !!field.legacy_map;
  const [type, setType] = useState<SurveyFieldType>(field.type);
  const activeType = locked ? field.type : type;
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    setError(null);
    setFlash(false);
    startTransition(async () => {
      const res = await updateSurveyField(field.id, surveyId, formData);
      if (res && !res.ok) setError(res.error);
      else setFlash(true);
    });
  }

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      const res = await moveSurveyField(field.id, surveyId, direction);
      if (res && !res.ok) setError(res.error);
    });
  }

  function handleDelete() {
    if (!confirm(`Delete this question? "${field.label}"`)) return;
    startTransition(async () => {
      const res = await deleteSurveyField(field.id, surveyId);
      if (res && !res.ok) setError(res.error);
    });
  }

  const options = (field.config.options ?? []).join("\n");

  return (
    <form action={handleSave} className="svb-field">
      <div className="svb-field-head">
        <span className="svb-field-type">{FIELD_TYPE_META[activeType].label}</span>
        {locked && (
          <span className="admin-pill admin-pill--accent">Feeds Pulse report</span>
        )}
        <div className="svb-field-reorder">
          <button
            type="button"
            className="svb-icon-btn"
            onClick={() => handleMove("up")}
            disabled={pending || isFirst}
            aria-label="Move up"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            className="svb-icon-btn"
            onClick={() => handleMove("down")}
            disabled={pending || isLast}
            aria-label="Move down"
            title="Move down"
          >
            ↓
          </button>
        </div>
      </div>

      {error && <div className="admin-banner admin-banner--err">{error}</div>}

      <div className="admin-form-row">
        <label className="admin-field admin-field--full">
          <span className="admin-label">Question</span>
          <input name="label" type="text" required defaultValue={field.label} />
        </label>
      </div>

      <div className="admin-form-row admin-form-row--2">
        <label className="admin-field">
          <span className="admin-label">Type</span>
          {locked ? (
            <>
              <select defaultValue={field.type} disabled>
                <option value={field.type}>{FIELD_TYPE_META[field.type].label}</option>
              </select>
              <input type="hidden" name="type" value={field.type} />
              <span className="admin-hint">
                Type is locked because this question feeds the Pulse report.
              </span>
            </>
          ) : (
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
          )}
        </label>
        <label className="admin-field admin-field--inline" style={{ alignSelf: "end", paddingBottom: 10 }}>
          <input name="required" type="checkbox" defaultChecked={field.required} />
          <span>Required</span>
        </label>
      </div>

      <div className="admin-form-row">
        <label className="admin-field admin-field--full">
          <span className="admin-label">Help text (optional)</span>
          <input name="help_text" type="text" defaultValue={field.help_text ?? ""} />
        </label>
      </div>

      {isChoiceType(activeType) && (
        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Options (one per line)</span>
            <textarea name="options" rows={4} defaultValue={options} placeholder={"Option A\nOption B\nOption C"} />
          </label>
        </div>
      )}

      {activeType === "rating" && (
        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Scale</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input name="min" type="number" defaultValue={field.config.min ?? 1} style={{ width: 70 }} />
              <span className="admin-hint">to</span>
              <input name="max" type="number" defaultValue={field.config.max ?? 5} style={{ width: 70 }} />
            </div>
          </label>
          <div className="admin-form-row--2" style={{ marginBottom: 0 }}>
            <label className="admin-field">
              <span className="admin-label">Low label</span>
              <input name="min_label" type="text" defaultValue={field.config.min_label ?? ""} placeholder="e.g. Poor" />
            </label>
            <label className="admin-field">
              <span className="admin-label">High label</span>
              <input name="max_label" type="text" defaultValue={field.config.max_label ?? ""} placeholder="e.g. Excellent" />
            </label>
          </div>
        </div>
      )}

      {activeType === "number" && (
        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Min (optional)</span>
            <input name="min" type="number" defaultValue={field.config.min ?? ""} />
          </label>
          <label className="admin-field">
            <span className="admin-label">Max (optional)</span>
            <input name="max" type="number" defaultValue={field.config.max ?? ""} />
          </label>
        </div>
      )}

      <div className="svb-field-foot">
        <button
          type="button"
          className="admin-link-action admin-link-action--danger"
          onClick={handleDelete}
          disabled={pending || locked}
          title={locked ? "Locked: feeds the Pulse report" : "Delete question"}
        >
          Delete
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {flash && <span className="cm-flash">Saved</span>}
          <button type="submit" className="admin-btn admin-btn--ghost" disabled={pending}>
            {pending ? "Saving..." : "Save question"}
          </button>
        </div>
      </div>
    </form>
  );
}
