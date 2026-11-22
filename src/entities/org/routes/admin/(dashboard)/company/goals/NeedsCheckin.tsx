"use client";

import { krCode } from "@/entities/org/lib/company/edges-shared";
import { krProgress } from "@/entities/org/lib/company/kr-progress";
import type { ObjectiveWithKrs } from "@/entities/org/lib/company/goal-shapes";
import { Badge } from "@/kernel/ui/Badge";

// The chapter app's version of edge8-web's NeedsCheckin (EO-owned): what needs the
// reader leads the Goals page. Every measured key result at risk or off track,
// off track first. EO reads the tone from krProgress, so a key result nobody
// has measured is never counted here as on or off track. Check in scrolls to
// that key result's row and clicks it, which opens the editor's one check-in
// form.
function openCheckin(krId: string) {
  const row = document.getElementById(`kr-${krId}`);
  row?.scrollIntoView({ behavior: "smooth", block: "center" });
  row?.click();
}

export function NeedsCheckin({ tree, unmeasuredKrIds }: { tree: ObjectiveWithKrs[]; unmeasuredKrIds: string[] }) {
  const unmeasured = new Set(unmeasuredKrIds);
  const needs = tree
    .flatMap((o, oi) =>
      o.krs.map((kr, ki) => ({ kr, code: krCode(oi, ki), objective: o.title, tone: krProgress(kr, !unmeasured.has(kr.id)).tone })),
    )
    .filter(({ tone }) => tone === "off" || tone === "risk")
    .sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "off" ? -1 : 1));
  if (needs.length === 0) return null;
  return (
    <section className="admin-card admin-section-card u-mb-4" aria-labelledby="goals-needs-h">
      <div className="ats-sec-head">
        <div>
          <p className="ats-sec-k">Needs a check-in</p>
          <h2 className="ats-sec-h" id="goals-needs-h">
            {needs.length === 1 ? "One key result is" : `${needs.length} key results are`} at risk or off track
          </h2>
        </div>
      </div>
      {needs.map(({ kr, code, objective, tone }) => (
        <div key={kr.id} className="ats-row co-row">
          <span className="u-min-0">
            <span className="ats-person-name">
              {code} {kr.title}
            </span>
            <span className="ats-person-meta">{objective}</span>
          </span>
          <Badge tone={tone === "off" ? "err" : "warn"}>{tone === "off" ? "Off track" : "At risk"}</Badge>
          <button type="button" className="admin-btn admin-btn--sm" onClick={() => openCheckin(kr.id)}>
            Check in
          </button>
        </div>
      ))}
    </section>
  );
}
