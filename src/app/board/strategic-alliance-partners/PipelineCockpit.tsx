import {
  STAGE_LABEL,
  type FunnelRow,
  type OwnerRow,
  type Scoreboard,
} from "@/lib/sap-pipeline";

// Scoreboard, funnel and owner table at the top of the SAP page.
// Pure presentation: every number is computed in src/lib/sap-pipeline.ts.

function usd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `$${n.toLocaleString()}`;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}

export function Scorecard({
  score,
  fyLabel,
  wonNames,
}: {
  score: Scoreboard;
  fyLabel: string;
  wonNames: string[];
}) {
  const securedPct = pct(score.cashSecured, score.target);
  const forecastPct = Math.max(pct(score.forecastCash, score.target) - securedPct, 0);
  const coverageTone =
    score.coverage === null ? "good" : score.coverage >= 3 ? "good" : score.coverage >= 2 ? "warn" : "bad";

  return (
    <section className="sap-score" aria-label="Pipeline scoreboard">
      <div className="sap-score-grid">
        <div className="sap-kpi sap-kpi--hero">
          <div className="sap-kpi-label">Cash secured · {fyLabel}</div>
          <div className="sap-kpi-value">
            {usd(score.cashSecured)}
            <span className="sap-kpi-of"> of {usd(score.target)}</span>
          </div>
          <div className="sap-kpi-sub">
            {score.wonCount} won
            {score.inKindSecured > 0 && ` · plus ${usd(score.inKindSecured)} in-kind`}
          </div>
        </div>
        <div className="sap-kpi">
          <div className="sap-kpi-label">Weighted forecast</div>
          <div className="sap-kpi-value">{usd(score.forecastCash)}</div>
          <div className="sap-kpi-sub">secured + {usd(score.weightedCash)} likely from open deals</div>
        </div>
        <div className={`sap-kpi sap-kpi--${coverageTone}`}>
          <div className="sap-kpi-label">Coverage</div>
          <div className="sap-kpi-value">
            {score.coverage === null ? "Target met" : `${score.coverage}x`}
          </div>
          <div className="sap-kpi-sub">
            {score.coverage === null
              ? "Every new deal is upside"
              : `open cash vs ${usd(score.remaining)} still to win · aim for 3x`}
          </div>
        </div>
        <div className="sap-kpi">
          <div className="sap-kpi-label">Open pipeline</div>
          <div className="sap-kpi-value">{usd(score.openTotal)}</div>
          <div className="sap-kpi-sub">
            {score.openCount} deals · {usd(score.openCash)} cash
          </div>
        </div>
      </div>

      <div
        className="sap-progress"
        role="img"
        aria-label={`${securedPct}% of target secured, ${securedPct + forecastPct}% forecast`}
      >
        <span className="sap-progress-secured" style={{ width: `${securedPct}%` }} />
        <span className="sap-progress-forecast" style={{ width: `${forecastPct}%` }} />
      </div>
      <div className="sap-progress-legend">
        <span><i className="sap-dot sap-dot--secured" /> Secured {securedPct}%</span>
        <span><i className="sap-dot sap-dot--forecast" /> Forecast {securedPct + forecastPct}%</span>
        <span className="sap-progress-target">Target {usd(score.target)}</span>
      </div>
      {wonNames.length > 0 && (
        <div className="sap-won-strip">
          <span className="sap-won-label">Won this year</span>
          {wonNames.map((n) => (
            <span key={n} className="sap-won-chip">{n}</span>
          ))}
        </div>
      )}
    </section>
  );
}

export function Funnel({ rows }: { rows: FunnelRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <section className="sap-panel" aria-label="Pipeline funnel">
      <h2 className="sap-panel-title">Funnel</h2>
      <div className="sap-funnel">
        {rows.map((r) => (
          <div key={r.stage} className="sap-funnel-row">
            <div className="sap-funnel-label">
              {STAGE_LABEL[r.stage]}
              <span className="sap-funnel-weight">{Math.round(r.weight * 100)}%</span>
            </div>
            <div className="sap-funnel-track">
              <span
                className={`sap-funnel-bar sap-funnel-bar--${r.stage}`}
                style={{ width: `${Math.max(pct(r.total, max), r.count > 0 ? 4 : 0)}%` }}
              />
            </div>
            <div className="sap-funnel-num">
              {r.count} · {usd(r.total)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Owners({ rows }: { rows: OwnerRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="sap-panel" aria-label="Pipeline by owner">
      <h2 className="sap-panel-title">By owner</h2>
      <table className="sap-owner-table">
        <thead>
          <tr>
            <th>Owner</th>
            <th>Open</th>
            <th>Weighted</th>
            <th>Meeting or proposal</th>
            <th>Overdue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.owner}>
              <td>{r.owner}</td>
              <td>{r.open}</td>
              <td>{usd(r.weighted)}</td>
              <td>{r.advanced}</td>
              <td className={r.overdue > 0 ? "sap-owner-overdue" : undefined}>{r.overdue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
