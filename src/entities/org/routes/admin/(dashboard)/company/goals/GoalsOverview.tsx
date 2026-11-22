import type { CSSProperties } from "react";
import { krProgress, objectiveRollup } from "@/entities/org/lib/company/kr-progress";
import type { ObjectiveWithKrs } from "@/entities/org/lib/company/goal-shapes";

// Chapter app only (no edge8-web counterpart). The chapter priorities at a
// glance above the full editor: one card per priority with its percent, a bar
// with the year's pace marker, and how many of its key results have a reading.
// Each card jumps to that priority's table. Below it, who still owes a first
// reading, so an unmeasured key result has a name next to it.

// The EO Brand Guidelines primaries, one per priority in order.
const PRIORITY_COLORS = ["var(--eo-blue)", "var(--eo-pink)", "var(--eo-green)", "var(--eo-orange)", "var(--eo-yellow)"];

export function PriorityOverview({
  tree,
  unmeasuredKrIds,
  pacePct,
}: {
  tree: ObjectiveWithKrs[];
  unmeasuredKrIds: string[];
  pacePct: number;
}) {
  if (tree.length === 0) return null;
  const unmeasured = new Set(unmeasuredKrIds);
  return (
    <nav className="eo-prio-grid u-mb-4" aria-label="Chapter priorities">
      {tree.map((o, i) => {
        const roll = objectiveRollup(o.krs, unmeasured);
        const measured = o.krs.filter((kr) => !unmeasured.has(kr.id)).length;
        const style = { "--prio": PRIORITY_COLORS[i % PRIORITY_COLORS.length] } as CSSProperties;
        return (
          <a key={o.id} href={`#priority-${o.id}`} className="eo-prio" style={style}>
            <span className="eo-prio-code">O{i + 1}</span>
            <span className="eo-prio-title">{o.title}</span>
            <span className="eo-prio-pct">
              {roll.pct == null ? <span className="eo-prio-none">Not measured yet</span> : `${roll.pct}%`}
            </span>
            <span className="eo-prio-bar" aria-hidden="true">
              <i style={{ width: `${Math.min(roll.pct ?? 0, 100)}%` }} />
              <b style={{ left: `${pacePct}%` }} />
            </span>
            <span className="eo-prio-meta">
              {measured} of {o.krs.length} key {o.krs.length === 1 ? "result" : "results"} measured
            </span>
          </a>
        );
      })}
    </nav>
  );
}

export function FirstReadings({
  tree,
  unmeasuredKrIds,
  people,
  initialsById,
}: {
  tree: ObjectiveWithKrs[];
  unmeasuredKrIds: string[];
  people: { id: string; name: string }[];
  // An owner who has left the roster still shows, by initials.
  initialsById: Record<string, string>;
}) {
  const unmeasured = new Set(unmeasuredKrIds);
  const names = new Map(people.map((p) => [p.id, p.name]));
  const owed = new Map<string, number>();
  for (const kr of tree.flatMap((o) => o.krs)) {
    if (krProgress(kr, !unmeasured.has(kr.id)).tone !== "unmeasured") continue;
    owed.set(kr.accountable_person_id, (owed.get(kr.accountable_person_id) ?? 0) + 1);
  }
  if (owed.size === 0) return null;
  const total = [...owed.values()].reduce((a, b) => a + b, 0);
  const rows = [...owed.entries()]
    .map(([id, n]) => ({ id, n, name: names.get(id) ?? initialsById[id] ?? "No owner" }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  return (
    <section className="admin-card admin-section-card u-mb-4" aria-labelledby="goals-first-h">
      <div className="ats-sec-head">
        <div>
          <p className="ats-sec-k">Waiting on a first reading</p>
          <h2 className="ats-sec-h" id="goals-first-h">
            {total === 1 ? "One key result has" : `${total} key results have`} no value yet
          </h2>
        </div>
      </div>
      <ul className="ats-chips eo-owed">
        {rows.map((r) => (
          <li key={r.id} className="ats-chip ats-chip--calm">
            {r.name}
            <b>{r.n}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}
