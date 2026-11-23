"use client";

import { useState, useTransition } from "react";
import type {
  ChapterMetric,
  ChapterMetricField,
} from "@/lib/chapter-metrics";
import { addYear, deleteYear, setOpenDuesYear, updateCell } from "./actions";

type MetricType = "text" | "integer" | "decimal" | "money" | "percent";

type MetricDef = {
  field: ChapterMetricField;
  label: string;
  type: MetricType;
};

const METRIC_DEFS: MetricDef[] = [
  { field: "president", label: "President", type: "text" },
  { field: "members", label: "Members", type: "integer" },
  { field: "retention_pct", label: "Retention", type: "percent" },
  { field: "revenue_usd", label: "Revenue", type: "money" },
  { field: "revenue_per_member_usd", label: "Revenue per member", type: "money" },
  { field: "forum_count", label: "Forum count", type: "integer" },
  { field: "forum_health", label: "Forum health", type: "text" },
  { field: "chapter_events", label: "Chapter events", type: "integer" },
  { field: "average_event_score", label: "Average event score", type: "decimal" },
  { field: "end_of_year_reserves_usd", label: "End of year reserves", type: "money" },
  { field: "eo_grants_usd", label: "EO grants", type: "money" },
  { field: "sap_usd", label: "SAP", type: "money" },
  { field: "dues_per_member_usd", label: "Dues per member", type: "money" },
  { field: "secondary_dues_usd", label: "Secondary chapter dues", type: "money" },
  { field: "initiation_fee_usd", label: "Initiation fee", type: "money" },
];

function formatValue(value: string | number | null, type: MetricType): string {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "money") return `$${Number(value).toLocaleString()}`;
  if (type === "percent") {
    const n = Number(value);
    return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`;
  }
  if (type === "decimal") return Number(value).toFixed(1);
  if (type === "integer") return Number(value).toLocaleString();
  return String(value);
}

function inputValue(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function parseLocal(raw: string, type: MetricType): string | number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (type === "text") return trimmed;
  const cleaned = trimmed.replace(/[$,%\s]/g, "");
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  if (type === "integer" || type === "money") return Math.round(num);
  return num;
}

export function MetricsTable({ initialMetrics }: { initialMetrics: ChapterMetric[] }) {
  const resetKey = initialMetrics.map((row) => row.fiscal_year).join("|");
  return <MetricsTableState key={resetKey} initialMetrics={initialMetrics} />;
}

function MetricsTableState({ initialMetrics }: { initialMetrics: ChapterMetric[] }) {
  const [data, setData] = useState(initialMetrics);
  const [editing, setEditing] = useState<{ year: string; field: ChapterMetricField } | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [showAddYear, setShowAddYear] = useState(false);
  const [newYearLabel, setNewYearLabel] = useState("");

  function startEdit(year: string, field: ChapterMetricField, currentValue: string | number | null) {
    setEditing({ year, field });
    setDraft(inputValue(currentValue));
    setError(null);
    setFlash(null);
  }

  function cancelEdit() {
    setEditing(null);
    setDraft("");
  }

  function commitEdit() {
    if (!editing) return;
    const { year, field } = editing;
    const def = METRIC_DEFS.find((d) => d.field === field);
    if (!def) return;
    const raw = draft;

    const snapshot = data;
    const optimistic = data.map((row) =>
      row.fiscal_year === year
        ? ({ ...row, [field]: parseLocal(raw, def.type) } as ChapterMetric)
        : row,
    );
    setData(optimistic);
    setEditing(null);
    setDraft("");

    startTransition(async () => {
      const result = await updateCell(year, field, raw);
      if (!result.ok) {
        setError(result.error);
        setData(snapshot);
      } else {
        setFlash(`Saved ${def.label} for ${year}`);
        setTimeout(() => setFlash(null), 1500);
      }
    });
  }

  function handleAddYear() {
    const label = newYearLabel.trim();
    setError(null);
    startTransition(async () => {
      const result = await addYear(label);
      if (!result.ok) {
        setError(result.error);
      } else {
        setShowAddYear(false);
        setNewYearLabel("");
        setFlash(`Added ${label}`);
        setTimeout(() => setFlash(null), 1500);
      }
    });
  }

  function handleDeleteYear(year: string) {
    if (!confirm(`Delete the ${year} row and all its metrics? This cannot be undone.`)) return;
    setError(null);
    const snapshot = data;
    setData(data.filter((row) => row.fiscal_year !== year));
    startTransition(async () => {
      const result = await deleteYear(year);
      if (!result.ok) {
        setError(result.error);
        setData(snapshot);
      } else {
        setFlash(`Deleted ${year}`);
        setTimeout(() => setFlash(null), 1500);
      }
    });
  }

  return (
    <div className="cm-wrap">
      <div className="cm-toolbar">
        {!showAddYear ? (
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => {
              setShowAddYear(true);
              setError(null);
            }}
          >
            Add year
          </button>
        ) : (
          <form
            className="cm-add"
            onSubmit={(e) => {
              e.preventDefault();
              handleAddYear();
            }}
          >
            <input
              type="text"
              className="cm-add-input"
              placeholder="26/27"
              value={newYearLabel}
              onChange={(e) => setNewYearLabel(e.target.value)}
              maxLength={5}
              autoFocus
              aria-label="New fiscal year"
            />
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={pending}
            >
              Add
            </button>
            <button
              type="button"
              className="admin-btn"
              onClick={() => {
                setShowAddYear(false);
                setNewYearLabel("");
                setError(null);
              }}
            >
              Cancel
            </button>
          </form>
        )}
        {pending && <span className="cm-saving">Saving…</span>}
        {flash && <span className="cm-flash">{flash}</span>}
      </div>

      {error && <div className="admin-banner admin-banner--err">{error}</div>}

      <div className="cm-toolbar" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label htmlFor="cm-dues-open" style={{ fontWeight: 600, fontSize: 14 }}>
          Members pay dues for
        </label>
        <select
          id="cm-dues-open"
          className="cm-add-input"
          style={{ width: "auto", minWidth: 120 }}
          value={data.find((r) => r.dues_open)?.fiscal_year ?? ""}
          disabled={pending}
          onChange={(e) => {
            const year = e.target.value;
            const snapshot = data;
            setError(null);
            setData(data.map((r) => ({ ...r, dues_open: r.fiscal_year === year })));
            startTransition(async () => {
              const result = await setOpenDuesYear(year);
              if (!result.ok) {
                setError(result.error);
                setData(snapshot);
              } else {
                setFlash(year ? `Dues open for ${year}` : "Dues closed");
                setTimeout(() => setFlash(null), 2000);
              }
            });
          }}
        >
          <option value="">Not open</option>
          {data.map((r) => (
            <option key={r.id} value={r.fiscal_year}>
              {r.fiscal_year}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: "#5E617D" }}>
          The dues pages charge this year&apos;s dues per member and secondary chapter dues. Set both before opening a new year.
        </span>
      </div>

      <div className="cm-table-wrap">
        <table className="cm-table">
          <thead>
            <tr>
              <th className="cm-metric-col cm-head">Metric</th>
              {data.map((row) => (
                <th key={row.id} className="cm-year-col cm-head">
                  <div className="cm-year-head">
                    <span className="cm-year-label">{row.fiscal_year}</span>
                    <button
                      type="button"
                      className="cm-year-del"
                      onClick={() => handleDeleteYear(row.fiscal_year)}
                      title={`Delete ${row.fiscal_year}`}
                      aria-label={`Delete ${row.fiscal_year}`}
                    >
                      ×
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRIC_DEFS.map((def) => (
              <tr key={def.field}>
                <th className="cm-metric-col">{def.label}</th>
                {data.map((row) => {
                  const isEditing =
                    editing?.year === row.fiscal_year && editing.field === def.field;
                  const value = row[def.field];
                  return (
                    <td
                      key={row.id}
                      className={`cm-cell${isEditing ? " is-editing" : ""}${value === null ? " is-empty" : ""}`}
                      onClick={() => {
                        if (!isEditing) startEdit(row.fiscal_year, def.field, value);
                      }}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          className="cm-input"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitEdit();
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              cancelEdit();
                            }
                          }}
                          autoFocus
                          aria-label={`${def.label} for ${row.fiscal_year}`}
                        />
                      ) : (
                        <span>{formatValue(value, def.type)}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
