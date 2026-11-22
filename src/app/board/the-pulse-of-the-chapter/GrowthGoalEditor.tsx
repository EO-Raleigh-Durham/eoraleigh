"use client";

import { useState, useTransition } from "react";
import { updateChapterGoal } from "./actions";

// Inline "Edit goal" control for the growth-forecast card. Lets a board member
// change the net-growth target, the downside lapse assumption, and the source
// note without a deploy. The lapse rate is shown/edited as a percent (45) but
// stored as a fraction (0.45). The goal is keyed by the chapter's fiscal year.

export function GrowthGoalEditor({
  fiscalYearStart,
  targetPct,
  riskLapseRate,
  sourceNote,
}: {
  fiscalYearStart: number;
  targetPct: number;
  riskLapseRate: number;
  sourceNote: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(String(targetPct));
  const [lapsePct, setLapsePct] = useState(String(Math.round(riskLapseRate * 100)));
  const [note, setNote] = useState(sourceNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateChapterGoal(fiscalYearStart, {
        netGrowthTargetPct: Number(target),
        riskLapseRate: Number(lapsePct) / 100,
        sourceNote: note,
      });
      if (!result.ok) setError(result.error);
      else setOpen(false);
    });
  }

  if (!open) {
    return (
      <button type="button" className="admin-btn" onClick={() => setOpen(true)}>
        Edit goal
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", marginTop: 12 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <Field
          label="Net growth target %"
          help="Net member growth the board is aiming for by year-end"
        >
          <input
            type="number"
            step="0.1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            style={inputStyle}
            aria-label="Net growth target percent"
          />
        </Field>
        <Field
          label="Share of unsure members we assume will leave %"
          help="Of the members flagged as unsure about renewing, the percent the downside assumes actually leave by year-end. At 45, it assumes 45 out of every 100 do not renew"
        >
          <input
            type="number"
            step="1"
            min="0"
            max="100"
            value={lapsePct}
            onChange={(e) => setLapsePct(e.target.value)}
            style={inputStyle}
            aria-label="Share of unsure members assumed to leave percent"
          />
        </Field>
        <Field label="Source">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Strategy Summit workbook"
            style={{ ...inputStyle, width: 240 }}
            aria-label="Source note"
          />
        </Field>
      </div>
      {error && <div style={{ color: "#C2185B", fontSize: 13 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="admin-btn admin-btn--primary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" className="admin-btn" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #D1D5DB",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 14,
  width: 110,
};

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#6B7280", maxWidth: 260 }}>
      <span>{label}</span>
      {children}
      {help && (
        <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 400, lineHeight: 1.4 }}>{help}</span>
      )}
    </label>
  );
}
