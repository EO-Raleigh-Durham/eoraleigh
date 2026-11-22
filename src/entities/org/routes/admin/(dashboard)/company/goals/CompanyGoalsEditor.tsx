"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DELIVERY_MIXES,
  KR_STATUSES,
  krCode, looksLikeActivity,
  type KrRow,
  type KrStatus,
} from "@/entities/org/lib/company/edges-shared";
import { PersonSelect, type PersonOption } from "@/entities/crm/client";
import { krProgress, objectiveRollup } from "@/entities/org/lib/company/kr-progress";
import type { LadderedPerson, ObjectiveWithKrs } from "@/entities/org/lib/company/goal-shapes";
import { AdminKrCells, AdminObjectiveHead, GoalsLegend } from "@/entities/org/ui/company/CompanyGoalsObjectives";
import { checkInKr, createKr, createObjective, updateKr, updateObjective } from "../../edges/goals/actions";
import type { Result } from "@/kernel/data/result";

// The chapter app's version of edge8-web's CompanyGoalsEditor (EO-owned). Inline
// editor for the chapter priorities (objectives) and their key results, the
// single place these are edited. Every objective is a chapter priority for the
// fiscal year; every key result names the board member accountable for it.
// Mirrors the read-only CompanyGoalsObjectives card, with edit / add / check-in
// controls layered on.

type KrDraft = {
  title: string;
  target: string;
  unit: string;
  direction: "up" | "down";
  mix: (typeof DELIVERY_MIXES)[number];
  accountable: string;
};

function krDraft(kr?: KrRow): KrDraft {
  return {
    title: kr?.title ?? "",
    target: kr?.target_value != null ? String(kr.target_value) : "",
    unit: kr?.unit ?? "",
    direction: (kr?.direction as "up" | "down") ?? "up",
    mix: (kr?.delivery_mix as (typeof DELIVERY_MIXES)[number]) ?? "human",
    accountable: kr?.accountable_person_id ?? "",
  };
}

export function CompanyGoalsEditor({
  tree,
  initialsById,
  ladderedByKr,
  unmeasuredKrIds,
  pacePct,
  quarter,
  year,
  people,
  emptyLabel,
}: {
  tree: ObjectiveWithKrs[];
  initialsById: Record<string, string>;
  ladderedByKr: Record<string, LadderedPerson[]>;
  unmeasuredKrIds: string[];
  pacePct: number;
  quarter: string;
  // The fiscal year a new objective is filed under.
  year: number;
  // The board roster, for the accountable-person picker.
  people: PersonOption[];
  emptyLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unmeasured = new Set(unmeasuredKrIds);
  const [banner, setBanner] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  // Which inline form is open. Only one at a time keeps the board readable.
  const [mode, setMode] = useState<
    | { kind: "none" }
    | { kind: "add-objective" }
    | { kind: "edit-objective"; id: string }
    | { kind: "add-kr"; objectiveId: string }
    | { kind: "edit-kr"; id: string }
    | { kind: "checkin"; id: string }
  >({ kind: "none" });

  function run(fn: () => Promise<Result & { id?: string }>, okText: string) {
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

  return (
    <div>
      {banner && <div className={`admin-alert admin-alert--${banner.tone === "ok" ? "ok" : "err"}`}>{banner.text}</div>}

      <div className="admin-form-actions u-mb-4">
        {mode.kind === "add-objective" ? (
          <button className="admin-btn" onClick={() => setMode({ kind: "none" })} disabled={pending}>
            Cancel
          </button>
        ) : (
          <button className="admin-btn admin-btn--primary" onClick={() => setMode({ kind: "add-objective" })} disabled={pending}>
            Add priority
          </button>
        )}
      </div>

      {mode.kind === "add-objective" && (
        <ObjectiveForm
          quarter={quarter}
          pending={pending}
          onCancel={() => setMode({ kind: "none" })}
          onSubmit={(d) =>
            run(
              () =>
                createObjective({
                  level: "company",
                  title: d.title,
                  year,
                }),
              "Priority added.",
            )
          }
        />
      )}

      {tree.length === 0 && mode.kind !== "add-objective" && <div className="admin-empty">{emptyLabel}</div>}
      {tree.length > 0 && <GoalsLegend pace={pacePct} />}

      {tree.map((o, oi) => (
        <div key={o.id} id={`priority-${o.id}`} className="admin-card u-mb-4 u-p-0 u-clip eo-prio-anchor">
          <AdminObjectiveHead objective={o} index={oi} rollup={objectiveRollup(o.krs, unmeasured)} />

          {mode.kind === "edit-objective" && mode.id === o.id ? (
            <div className="u-p-4">
              <ObjectiveEditForm
                objective={o}
                pending={pending}
                onCancel={() => setMode({ kind: "none" })}
                onSubmit={(patch) => run(() => updateObjective(o.id, patch), "Objective saved.")}
              />
            </div>
          ) : (
            o.krs.map((kr, ki) => {
              // Collapsed rows are the click target: click (or Enter) opens the
              // check-in, the most frequent action; Edit lives inside the panel.
              const expanded =
                (mode.kind === "edit-kr" || mode.kind === "checkin") && mode.id === kr.id;
              return (
              <div
                key={kr.id}
                id={`kr-${kr.id}`}
                className={`admin-goals-arow${expanded ? "" : " admin-edges-kr--click"}`}
                role={expanded ? undefined : "button"}
                tabIndex={expanded ? undefined : 0}
                title={expanded ? undefined : "Click to check in"}
                onClick={expanded ? undefined : () => setMode({ kind: "checkin", id: kr.id })}
                onKeyDown={
                  expanded
                    ? undefined
                    : (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setMode({ kind: "checkin", id: kr.id });
                        }
                      }
                }
              >
                <AdminKrCells
                  kr={kr}
                  code={krCode(oi, ki)}
                  progress={krProgress(kr, !unmeasured.has(kr.id))}
                  pace={pacePct}
                  ladder={ladderedByKr[kr.id] ?? []}
                  initialsById={initialsById}
                />

                {mode.kind === "edit-kr" && mode.id === kr.id ? (
                  <div className="u-pt-1 u-pb-3">
                    <KrForm
                      kr={kr}
                      people={people}
                      pending={pending}
                      onCancel={() => setMode({ kind: "none" })}
                      onSubmit={(d) =>
                        run(
                          () =>
                            updateKr(kr.id, {
                              title: d.title,
                              target_value: d.target === "" ? null : Number(d.target),
                              unit: d.unit,
                              direction: d.direction,
                              delivery_mix: d.mix,
                              accountable_person_id: d.accountable,
                            }),
                          "Key result saved.",
                        )
                      }
                    />
                  </div>
                ) : mode.kind === "checkin" && mode.id === kr.id ? (
                  <div className="u-pt-1 u-pb-3">
                    <CheckinForm
                      kr={kr}
                      pending={pending}
                      onCancel={() => setMode({ kind: "none" })}
                      onEdit={() => setMode({ kind: "edit-kr", id: kr.id })}
                      onSubmit={(current, status) => run(() => checkInKr(kr.id, { current_value: current, status }), "Checked in.")}
                    />
                  </div>
                ) : null}
              </div>
              );
            })
          )}

          {/* Objective-level actions: edit the objective, or add a KR to it. */}
          {mode.kind === "add-kr" && mode.objectiveId === o.id ? (
            <div className="u-p-4 admin-divider-top">
              <KrForm
                people={people}
                pending={pending}
                onCancel={() => setMode({ kind: "none" })}
                onSubmit={(d) =>
                  run(
                    () =>
                      createKr({
                        objective_id: o.id,
                        accountable_person_id: d.accountable,
                        title: d.title,
                        target_value: d.target === "" ? null : Number(d.target),
                        unit: d.unit,
                        direction: d.direction,
                        delivery_mix: d.mix,
                      }),
                    "Key result added.",
                  )
                }
              />
            </div>
          ) : (
            mode.kind !== "edit-objective" && (
              <div className="admin-form-actions u-p-3 admin-divider-top">
                <button className="admin-btn admin-btn--sm" onClick={() => setMode({ kind: "edit-objective", id: o.id })} disabled={pending}>
                  Edit priority
                </button>
                <button className="admin-btn admin-btn--sm" onClick={() => setMode({ kind: "add-kr", objectiveId: o.id })} disabled={pending}>
                  + Key result
                </button>
              </div>
            )
          )}
        </div>
      ))}
    </div>
  );
}

function ObjectiveForm({
  quarter,
  pending,
  onCancel,
  onSubmit,
}: {
  quarter: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (d: { title: string }) => void;
}) {
  const [title, setTitle] = useState("");
  return (
    <form
      className="admin-card admin-section-card admin-form u-mb-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title });
      }}
    >
      <div className="admin-field">
        <label className="admin-label">Chapter priority (the direction, not the number)</label>
        <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Deepen Belonging & Identity" required />
      </div>
      <p className="admin-hint">Cycle: {quarter}</p>
      <div className="admin-form-actions">
        <button type="submit" className="admin-btn admin-btn--primary" disabled={pending}>
          {pending ? "Saving…" : "Create priority"}
        </button>
        <button type="button" className="admin-btn" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function ObjectiveEditForm({
  objective,
  pending,
  onCancel,
  onSubmit,
}: {
  objective: ObjectiveWithKrs;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (patch: { title: string; status: string }) => void;
}) {
  const [title, setTitle] = useState(objective.title);
  const [status, setStatus] = useState(objective.status);
  return (
    <form
      className="admin-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, status });
      }}
    >
      <div className="admin-field">
        <label className="admin-label">Chapter priority</label>
        <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="admin-field">
        <label className="admin-label">Status</label>
        <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">active</option>
          <option value="done">done</option>
          <option value="dropped">dropped (hides the priority)</option>
        </select>
      </div>
      <div className="admin-form-actions">
        <button type="submit" className="admin-btn admin-btn--primary" disabled={pending}>
          {pending ? "Saving…" : "Save priority"}
        </button>
        <button type="button" className="admin-btn" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function KrForm({
  kr,
  people,
  pending,
  onCancel,
  onSubmit,
}: {
  kr?: KrRow;
  people: PersonOption[];
  pending: boolean;
  onCancel: () => void;
  onSubmit: (d: KrDraft) => void;
}) {
  const [d, setD] = useState<KrDraft>(krDraft(kr));
  const activity = looksLikeActivity(d.title);
  function set<K extends keyof KrDraft>(key: K, value: KrDraft[K]) {
    setD((s) => ({ ...s, [key]: value }));
  }
  return (
    <form
      className="admin-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(d);
      }}
    >
      <div className="admin-field">
        <label className="admin-label">Key result (a measurable outcome, not an activity)</label>
        <input className="admin-input" value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. 65 members by 30 June 2027" required />
        {activity && (
          <p className="admin-hint u-warn">
            This starts with a doing-verb, which usually means an activity. A key result is the outcome the activity should produce.
          </p>
        )}
      </div>
      <div className="admin-goals-grid">
        <div className="admin-field">
          <label className="admin-label">Target</label>
          <input className="admin-input" type="number" step="any" value={d.target} onChange={(e) => set("target", e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Unit</label>
          <input className="admin-input" value={d.unit} onChange={(e) => set("unit", e.target.value)} placeholder="members, %, usd…" />
        </div>
        <div className="admin-field">
          <label className="admin-label">Direction</label>
          <select className="admin-select" value={d.direction} onChange={(e) => set("direction", e.target.value as "up" | "down")}>
            <option value="up">up is good</option>
            <option value="down">down is good</option>
          </select>
        </div>
        <div className="admin-field">
          <label className="admin-label">Accountable board member</label>
          <PersonSelect
            value={d.accountable}
            onChange={(v) => set("accountable", v)}
            options={people.map((p) => ({ value: p.id, label: p.name }))}
          />
        </div>
      </div>
      <p className="admin-hint">One board member is accountable for every key result; staff work rolls up to it as cards.</p>
      <div className="admin-form-actions">
        <button type="submit" className="admin-btn admin-btn--primary" disabled={pending}>
          {pending ? "Saving…" : kr ? "Save key result" : "Create key result"}
        </button>
        <button type="button" className="admin-btn" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function CheckinForm({
  kr,
  pending,
  onCancel,
  onEdit,
  onSubmit,
}: {
  kr: KrRow;
  pending: boolean;
  onCancel: () => void;
  onEdit: () => void;
  onSubmit: (current: number, status: KrStatus) => void;
}) {
  const [value, setValue] = useState(String(kr.current_value));
  const [status, setStatus] = useState<KrStatus>(kr.status as KrStatus);
  return (
    <form
      className="admin-edges-checkin"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(Number(value), status);
      }}
    >
      <div className="admin-edges-checkin-fields">
        <label className="admin-edges-checkin-field">
          <span className="admin-label">Current{kr.unit ? ` (${kr.unit})` : ""}</span>
          <input
            className="admin-input admin-edges-checkin-input"
            type="number"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>
        <div className="admin-edges-checkin-field">
          <span className="admin-label">Status</span>
          <div className="admin-edges-status-seg" role="radiogroup" aria-label="Status">
            {KR_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={status === s}
                className={`admin-edges-status-seg-btn${status === s ? ` is-on is-${s}` : ""}`}
                onClick={() => setStatus(s)}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        {kr.target_value != null && (
          <span className="admin-edges-checkin-target">
            {kr.current_value != null ? `${Number(kr.current_value)} → ` : ""}
            target {kr.direction === "down" ? "≤ " : ""}
            {Number(kr.target_value)}
            {kr.unit === "%" ? "%" : ""}
          </span>
        )}
      </div>
      <div className="admin-edges-checkin-foot">
        <button type="submit" className="admin-btn admin-btn--primary admin-btn--sm" disabled={pending}>
          {pending ? "Saving…" : "Save check-in"}
        </button>
        <button type="button" className="admin-btn admin-btn--sm" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        <button type="button" className="admin-edges-checkin-editlink" onClick={onEdit} disabled={pending}>
          Edit key result
        </button>
      </div>
    </form>
  );
}
