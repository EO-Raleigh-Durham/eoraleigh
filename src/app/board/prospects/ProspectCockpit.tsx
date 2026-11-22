import type { FunnelRow, ProspectScoreboard } from "@/lib/prospect-pipeline";

// Scoreboard and funnel at the top of /board/prospects. Pure presentation:
// every number is computed in src/lib/prospect-pipeline.ts.

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}

export function ProspectScorecard({ score, fyLabel }: { score: ProspectScoreboard; fyLabel: string }) {
  const wonPct = pct(score.won, score.target);
  const expectedPct = Math.max(pct(score.won + score.expected, score.target) - wonPct, 0);
  const coverageTone =
    score.coverage === null ? "good" : score.coverage >= 3 ? "good" : score.coverage >= 1.5 ? "warn" : "bad";
  return (
    <section className="sap-score" aria-label="Membership scoreboard">
      <div className="sap-score-grid">
        <div className="sap-kpi sap-kpi--hero">
          <div className="sap-kpi-label">New members won · {fyLabel}</div>
          <div className="sap-kpi-value">
            {score.won}
            <span className="sap-kpi-of"> of {score.target}</span>
          </div>
          <div className="sap-kpi-sub">
            {score.remaining > 0 ? `${score.remaining} still to win` : "Target met"} · {score.lost} lost this year
          </div>
        </div>
        <div className="sap-kpi">
          <div className="sap-kpi-label">Expected joins</div>
          <div className="sap-kpi-value">{score.expected}</div>
          <div className="sap-kpi-sub">from live prospects, weighted by stage</div>
        </div>
        <div className={`sap-kpi sap-kpi--${coverageTone}`}>
          <div className="sap-kpi-label">Coverage</div>
          <div className="sap-kpi-value">{score.coverage === null ? "Target met" : `${score.coverage}x`}</div>
          <div className="sap-kpi-sub">
            {score.coverage === null
              ? "Every new member is upside"
              : `live prospects vs ${score.remaining} still to win · aim for 3x`}
          </div>
        </div>
        <div className="sap-kpi">
          <div className="sap-kpi-label">Live pipeline</div>
          <div className="sap-kpi-value">{score.live}</div>
          <div className="sap-kpi-sub">
            {score.dead > 0 ? `plus ${score.dead} dead ${score.dead === 1 ? "lead" : "leads"} to clear` : "no dead leads"}
          </div>
        </div>
      </div>
      <div
        className="sap-progress"
        role="img"
        aria-label={`${wonPct}% of target won, ${wonPct + expectedPct}% expected`}
      >
        <span className="sap-progress-secured" style={{ width: `${wonPct}%` }} />
        <span className="sap-progress-forecast" style={{ width: `${expectedPct}%` }} />
      </div>
      <div className="sap-progress-legend">
        <span><i className="sap-dot sap-dot--secured" /> Won {wonPct}%</span>
        <span><i className="sap-dot sap-dot--forecast" /> Expected {wonPct + expectedPct}%</span>
        <span className="sap-progress-target">Target {score.target} new members</span>
      </div>
    </section>
  );
}

export function ProspectFunnel({ rows }: { rows: FunnelRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="sap-panel" aria-label="Prospect funnel">
      <h2 className="sap-panel-title">Funnel</h2>
      <div className="sap-funnel">
        {rows.map((r, i) => (
          <div key={r.stage} className="sap-funnel-row">
            <div className="sap-funnel-label">
              {r.stage}
              <span className="sap-funnel-weight">{Math.round(r.weight * 100)}%</span>
            </div>
            <div className="sap-funnel-track">
              <span
                className="sap-funnel-bar"
                style={{
                  width: `${Math.max(pct(r.count, max), r.count > 0 ? 4 : 0)}%`,
                  background: `hsl(237 ${60 + i * 6}% ${80 - i * 7}%)`,
                }}
              />
            </div>
            <div className="sap-funnel-num">{r.count}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
