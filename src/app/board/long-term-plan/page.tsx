import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { roleAtLeast } from "@/lib/access";
import { formatPlanValue, loadLongTermPlan, type PlanMetricValue } from "@/lib/long-term-plan";
import "./long-term-plan.css";

export const metadata = { title: "Long Term Plan" };

// The EO primaries, one per pillar, as on the Strategy page.
const PILLAR_COLORS = ["var(--eo-blue)", "var(--eo-pink)", "var(--eo-green)", "var(--eo-orange)"];
const VISION_MARKS = ["◆", "◎", "✦", "◈"];

// Rows grouped so the table reads as three short stories.
const GROUPS: { label: string; keys: string[] }[] = [
  { label: "Members", keys: ["start_july_1", "join", "exit", "renew_30_june", "renewal_rate"] },
  { label: "Revenue", keys: ["local_dues", "annual_local_dues_total", "sap_revenue", "total_revenue", "initiation_fee", "revenue_per_member"] },
  { label: "Chapter health", keys: ["reserves_months", "members_per_forum"] },
];

// A text value longer than a short range ("6-9") is an aim written as a
// sentence. It reads under the metric's name, not squeezed into a number cell.
const isAim = (v: PlanMetricValue) => v.value_numeric == null && (v.value_text ?? "").length > 12;
export const dynamic = "force-dynamic";

// Long Term Plan: the board tracker's three-year plan (Sept 2025) as one
// read-only screen. Vision first, then the key metrics by year, then the
// success statements under each pillar.
export default async function LongTermPlanPage() {
  const user = await getSessionUser();
  if (!user || !roleAtLeast(user.role, "board")) redirect("/admin/login");
  const plan = await loadLongTermPlan();

  const head = (
    <div className="ats-hero eo-strat-hero">
      <p className="ats-k">Chapter · Long Term Plan</p>
      <h1 className="ats-h eo-strat-headline">Where the chapter is heading over three years</h1>
      <p className="ats-sub">Our vision, the key numbers by year and what success looks like for each pillar. Set by the board in September 2025.</p>
    </div>
  );

  if (!plan) {
    return (
      <div className="ats ltp">
        {head}
        <div className="admin-empty">The Long Term Plan has not been loaded yet.</div>
      </div>
    );
  }

  const grouped = new Set(GROUPS.flatMap((g) => g.keys));
  const groups = [
    ...GROUPS.map((g) => ({ label: g.label, rows: g.keys.map((k) => plan.metrics.find((m) => m.key === k)).filter((m): m is (typeof plan.metrics)[number] => !!m) })),
    { label: "Other", rows: plan.metrics.filter((m) => !grouped.has(m.key)) },
  ].filter((g) => g.rows.length > 0);

  const notes: string[] = [];
  const noteRef = (v: PlanMetricValue) => {
    if (!v.note) return null;
    let i = notes.indexOf(v.note);
    if (i < 0) i = notes.push(v.note) - 1;
    return <sup className="ltp-note-ref">{i + 1}</sup>;
  };

  return (
    <div className="ats ltp">
      {head}

      {plan.vision.length > 0 && (
        <section className="u-mb-4">
          <div className="ats-sec-head">
            <div>
              <p className="ats-sec-k">Vision</p>
              <h2 className="ats-sec-h">The chapter we are building</h2>
            </div>
          </div>
          <div className="eo-strat-ids">
            {plan.vision.map((v, i) => (
              <div key={v.key} className="eo-strat-id" style={{ "--tint": PILLAR_COLORS[i % PILLAR_COLORS.length] } as CSSProperties}>
                <span className="eo-strat-id-mark" aria-hidden="true">
                  {VISION_MARKS[i % VISION_MARKS.length]}
                </span>
                <span className="eo-strat-id-label">{v.title}</span>
                <p className="eo-strat-id-body">{v.body}</p>
              </div>
            ))}
          </div>
          {plan.resources.map((r) => (
            <p key={r.key} className="ltp-muted">
              {r.title}:{" "}
              <a href={r.body} target="_blank" rel="noopener noreferrer">
                {r.body.replace(/^https?:\/\//, "")}
              </a>
            </p>
          ))}
        </section>
      )}

      {plan.metrics.length > 0 && (
        <section className="u-mb-4">
          <div className="ats-sec-head">
            <div>
              <p className="ats-sec-k">Key metrics</p>
              <h2 className="ats-sec-h">The numbers, year by year</h2>
              <p className="ats-sub">25/26 is the estimate at 30 June 2026; Years 1 to 3 are the plan.</p>
            </div>
          </div>
          <div className="ltp-panel">
          <div className="ltp-table-wrap">
            <table className="ltp-table">
              <colgroup>
                <col className="ltp-col-metric" />
                {plan.periods.map((p) => (
                  <col key={p.fiscalYearStart} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Metric</th>
                  {plan.periods.map((p, i) => {
                    const [first, ...rest] = p.label.split(" ");
                    const plan_ = i > 0;
                    return (
                      <th key={p.fiscalYearStart} scope="col" className={plan_ ? "ltp-th-plan" : "ltp-th-now"}>
                        {plan_ ? (
                          <>
                            <span className="ltp-th-main">{`${first} ${rest[0] ?? ""}`.trim()}</span>
                            <span className="ltp-th-sub">{rest.slice(1).join(" ")}</span>
                          </>
                        ) : (
                          <>
                            <span className="ltp-th-main">{first}</span>
                            <span className="ltp-th-sub">{rest.join(" ").replace(/[()]/g, "")}</span>
                          </>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              {groups.map((g) => (
                <tbody key={g.label}>
                  <tr className="ltp-group">
                    <th scope="rowgroup" colSpan={plan.periods.length + 1}>
                      {g.label}
                    </th>
                  </tr>
                  {g.rows.map((m) => {
                    const aims = plan.periods
                      .map((p) => ({ p, v: m.byYear.get(p.fiscalYearStart) }))
                      .filter((x): x is { p: (typeof plan.periods)[number]; v: PlanMetricValue } => !!x.v && isAim(x.v));
                    return (
                      <tr key={m.key}>
                        <th scope="row">
                          {m.label}
                          {aims.map(({ p, v }) => (
                            <span key={p.fiscalYearStart} className="ltp-aim">
                              <b>{p.label.split(" ").slice(0, 2).join(" ")} aim:</b> {v.value_text}
                            </span>
                          ))}
                        </th>
                        {plan.periods.map((p) => {
                          const v = m.byYear.get(p.fiscalYearStart);
                          if (!v || isAim(v)) return <td key={p.fiscalYearStart} className="ltp-empty">–</td>;
                          const negative = v.value_numeric != null && Number(v.value_numeric) < 0;
                          return (
                            <td key={p.fiscalYearStart} className={`ltp-cell ltp-cell--${v.entry}${negative ? " ltp-cell--neg" : ""}`}>
                              {formatPlanValue(v)}
                              {noteRef(v)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </div>
          <div className="ltp-legend">
            <span><i className="ltp-swatch ltp-swatch--input" /> Board input</span>
            <span><i className="ltp-swatch ltp-swatch--staff" /> Completed by chapter staff</span>
            <span><i className="ltp-swatch ltp-swatch--calculated" /> Calculated</span>
          </div>
          {notes.length > 0 && (
            <ol className="ltp-notes">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ol>
          )}
          </div>
        </section>
      )}

      {plan.pillars.length > 0 && (
        <section className="u-mb-4">
          <div className="ats-sec-head">
            <div>
              <p className="ats-sec-k">Our chapter in the future</p>
              <h2 className="ats-sec-h">What success looks like, pillar by pillar</h2>
            </div>
          </div>
          <div className="eo-pillars">
            {plan.pillars.map((g, i) => (
              <article key={g.pillar} className="eo-pillar" style={{ "--tint": PILLAR_COLORS[i % PILLAR_COLORS.length] } as CSSProperties}>
                <header className="eo-pillar-head">
                  <span className="eo-pillar-num">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="eo-pillar-title">{g.label}</h3>
                  <span className="eo-pillar-count">{g.items.length}</span>
                </header>
                <ol className="eo-pillar-list">
                  {g.items.flatMap((item) =>
                    item.parts.map((part) => (
                      <li key={part.key}>
                        {part.title && <b>{part.title}</b>}
                        <span>{part.body}</span>
                        {part.year_accomplished && <span className="ltp-pill">Accomplished {part.year_accomplished}</span>}
                      </li>
                    )),
                  )}
                </ol>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
