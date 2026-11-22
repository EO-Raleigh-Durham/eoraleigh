"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { krCode, objectiveCode } from "@/entities/org/lib/company/edges-shared";
import type { ObjectiveWithKrs } from "@/entities/org/lib/company/goal-shapes";
import type { ChairGoal } from "@/entities/team/lib/company-goals";
import type { Result } from "@/kernel/data/result";
import { createChairGoal, deleteChairGoal, updateChairGoal } from "../../edges/goals/actions";

// The "Chair goals" tab (EO-owned): one section per board seat, its goals
// under it, each laddered to a chapter priority or a key result. A goal
// belongs to the seat, so the section is the role and the name beside it is
// whoever holds it this year.

type Draft = { title: string; detail: string; ladder: string };

// The ladder picker's one value: "kr:<id>", "obj:<id>" or "".
const ladderValue = (g: Pick<ChairGoal, "objectiveId" | "keyResultId">) =>
  g.keyResultId ? `kr:${g.keyResultId}` : g.objectiveId ? `obj:${g.objectiveId}` : "";
const ladderInput = (v: string) =>
  v.startsWith("kr:") ? { key_result_id: v.slice(3) } : v.startsWith("obj:") ? { objective_id: v.slice(4) } : {};

export function ChairGoalsEditor({ goals, tree }: { goals: ChairGoal[]; tree: ObjectiveWithKrs[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [banner, setBanner] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [mode, setMode] = useState<{ kind: "none" } | { kind: "edit"; id: string } | { kind: "add"; appointmentId: string }>({ kind: "none" });

  const rungLabel = new Map<string, string>();
  tree.forEach((o, oi) => {
    rungLabel.set(`obj:${o.id}`, `${objectiveCode(oi)} · ${o.title}`);
    o.krs.forEach((kr, ki) => rungLabel.set(`kr:${kr.id}`, `${krCode(oi, ki)} · ${kr.title}`));
  });

  // One section per seat, in board order.
  const seats: { appointmentId: string; roleName: string; personName: string; goals: ChairGoal[] }[] = [];
  for (const g of goals) {
    let seat = seats.find((s) => s.appointmentId === g.appointmentId);
    if (!seat) {
      seat = { appointmentId: g.appointmentId, roleName: g.roleName, personName: g.personName, goals: [] };
      seats.push(seat);
    }
    seat.goals.push(g);
  }

  function run(fn: () => Promise<Result>, okText: string) {
    setBanner(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setBanner({ tone: "ok", text: okText });
        setMode({ kind: "none" });
        router.refresh();
      } else {
        setBanner({ tone: "err", text: res.error });
      }
    });
  }

  if (seats.length === 0) return <div className="admin-empty">No chair goals for this year yet.</div>;

  return (
    <div>
      {banner && <div className={`admin-alert admin-alert--${banner.tone === "ok" ? "ok" : "err"}`}>{banner.text}</div>}
      {seats.map((seat) => (
        <section key={seat.appointmentId} className="admin-card admin-section-card u-mb-4">
          <div className="admin-cg-panel-head">
            <div className="admin-card-title">
              {seat.roleName} <span className="admin-cell-muted">· {seat.personName}</span>
            </div>
            {mode.kind === "add" && mode.appointmentId === seat.appointmentId ? null : (
              <button className="admin-btn admin-btn--sm" disabled={pending} onClick={() => setMode({ kind: "add", appointmentId: seat.appointmentId })}>
                + Goal
              </button>
            )}
          </div>
          {seat.goals.map((g) =>
            mode.kind === "edit" && mode.id === g.id ? (
              <GoalForm
                key={g.id}
                initial={{ title: g.title, detail: g.detail ?? "", ladder: ladderValue(g) }}
                rungs={rungLabel}
                pending={pending}
                onCancel={() => setMode({ kind: "none" })}
                onDelete={() => run(() => deleteChairGoal(g.id), "Goal removed.")}
                onSubmit={(d) => run(() => updateChairGoal(g.id, { title: d.title, detail: d.detail, ...ladderInput(d.ladder) }), "Goal saved.")}
              />
            ) : (
              <div key={g.id} className="admin-cg-obj-row admin-edges-kr--click" role="button" tabIndex={0} onClick={() => setMode({ kind: "edit", id: g.id })} onKeyDown={(e) => { if (e.key === "Enter") setMode({ kind: "edit", id: g.id }); }}>
                <span className="admin-cg-obj-goal">
                  {g.position}. {g.title}
                  {g.detail && <div className="admin-cell-muted">{g.detail}</div>}
                </span>
                <span className="admin-cell-muted admin-cg-obj-ladder">{rungLabel.get(ladderValue(g)) ? `⇗ ${rungLabel.get(ladderValue(g))}` : "No ladder yet"}</span>
              </div>
            ),
          )}
          {mode.kind === "add" && mode.appointmentId === seat.appointmentId && (
            <GoalForm
              initial={{ title: "", detail: "", ladder: "" }}
              rungs={rungLabel}
              pending={pending}
              onCancel={() => setMode({ kind: "none" })}
              onSubmit={(d) => run(() => createChairGoal(seat.appointmentId, { title: d.title, detail: d.detail, ...ladderInput(d.ladder) }), "Goal added.")}
            />
          )}
        </section>
      ))}
    </div>
  );
}

function GoalForm({
  initial,
  rungs,
  pending,
  onCancel,
  onDelete,
  onSubmit,
}: {
  initial: Draft;
  rungs: Map<string, string>;
  pending: boolean;
  onCancel: () => void;
  onDelete?: () => void;
  onSubmit: (d: Draft) => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  return (
    <form
      className="admin-form u-pt-1 u-pb-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(d);
      }}
    >
      <div className="admin-field">
        <label className="admin-label">Goal</label>
        <input className="admin-input" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} required />
      </div>
      <div className="admin-field">
        <label className="admin-label">Detail (optional)</label>
        <input className="admin-input" value={d.detail} onChange={(e) => setD({ ...d, detail: e.target.value })} />
      </div>
      <div className="admin-field">
        <label className="admin-label">Ladders to</label>
        <select className="admin-select" value={d.ladder} onChange={(e) => setD({ ...d, ladder: e.target.value })}>
          <option value="">nothing yet</option>
          {[...rungs].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-form-actions">
        <button type="submit" className="admin-btn admin-btn--primary admin-btn--sm" disabled={pending}>
          {pending ? "Saving…" : "Save goal"}
        </button>
        <button type="button" className="admin-btn admin-btn--sm" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        {onDelete && (
          <button type="button" className="admin-edges-checkin-editlink" onClick={onDelete} disabled={pending}>
            Remove goal
          </button>
        )}
      </div>
    </form>
  );
}
