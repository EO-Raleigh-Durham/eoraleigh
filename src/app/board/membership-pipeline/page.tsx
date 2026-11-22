import Link from "next/link";
import { loadMembershipPipeline } from "@/lib/membership-pipeline";

export const metadata = {
  title: "Prospect Dashboard",
  description: "Live membership funnel from the Prospects pipeline, lead to member.",
};
export const dynamic = "force-dynamic";

const usd = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;

export default async function MembershipPipelinePage() {
  const p = await loadMembershipPipeline();
  const maxStage = Math.max(1, ...p.funnel.map((s) => s.count));

  return (
    <div>
      <div className="admin-page-head admin-page-head--row">
        <div>
          <div className="admin-eyebrow">Member Acquisition</div>
          <h1 className="admin-page-title">Prospect Dashboard</h1>
          <p className="admin-page-sub">
            Live funnel from the Prospects pipeline. Find the constraint, then work it
          </p>
        </div>
        <Link href="/board/prospects" className="admin-btn admin-btn--ghost">
          Open prospects →
        </Link>
      </div>

      <div className="mp-kpis">
        <Kpi label="Open prospects" value={String(p.open)} note={`${p.total} on record`} />
        <Kpi
          label="Win rate"
          value={p.winRatePct != null ? `${p.winRatePct}%` : "—"}
          note={`${p.won} won · ${p.lost} lost`}
        />
        <Kpi
          label="Avg days to join"
          value={p.avgCycleDays != null ? String(p.avgCycleDays) : "—"}
          note="apply to closed won"
        />
        <Kpi label="Open pipeline value" value={usd(p.openValueUsd)} note="sum of open dues" />
        <Kpi
          label="Fully qualified"
          value={p.qualifiedPct != null ? `${p.qualifiedPct}%` : "—"}
          note={`${p.qualifiedOpen} of ${p.open} open`}
        />
        <Kpi label="Stale 30d+" value={String(p.stale30)} note="open, no recent activity" />
      </div>

      <h2 className="admin-section-title">The funnel</h2>
      <div className="mp-funnel">
        {p.funnel.map((s) => (
          <div key={s.stage} className="mp-funnel-row">
            <div className="mp-funnel-label">{s.stage}</div>
            <div className="mp-funnel-track">
              <div
                className="mp-funnel-fill"
                style={{ width: `${Math.max(3, (s.count / maxStage) * 100)}%` }}
              />
            </div>
            <div className="mp-funnel-val">{s.count}</div>
          </div>
        ))}
      </div>
      <p className="mp-note">
        Open prospects by current stage. {p.won} have closed won and {p.lost} closed lost on record.
        The biggest stage-to-stage drop is where to focus.
      </p>

      <h2 className="admin-section-title" style={{ marginTop: 32 }}>
        Where members come from
      </h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Channel</th>
              <th style={{ textAlign: "right" }}>Prospects</th>
              <th style={{ textAlign: "right" }}>Won</th>
              <th style={{ textAlign: "right" }}>Win rate</th>
            </tr>
          </thead>
          <tbody>
            {p.byChannel.map((c) => (
              <tr key={c.channel}>
                <td>{c.channel}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{c.total}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{c.won}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {c.winRatePct != null ? `${c.winRatePct}%` : "—"}
                </td>
              </tr>
            ))}
            {p.byChannel.length === 0 && (
              <tr>
                <td colSpan={4} className="admin-table-meta">
                  No channel data yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="admin-section-title" style={{ marginTop: 32 }}>
        Why deals are lost
      </h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Reason</th>
              <th style={{ textAlign: "right" }}>Count</th>
            </tr>
          </thead>
          <tbody>
            {p.lossReasons.map((r) => (
              <tr key={r.reason}>
                <td>{r.reason}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.count}</td>
              </tr>
            ))}
            {p.lossReasons.length === 0 && (
              <tr>
                <td colSpan={2} className="admin-table-meta">
                  No closed-lost deals yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mp-foot">
        Live from the Prospects (Member Acquisition) pipeline. Two additions would sharpen this: a
        stored membership goal, for pace and pipeline coverage, and per-stage timestamps, for true
        time-in-stage. Until then, velocity is apply-to-close only and there is no goal line.
      </p>
    </div>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="mp-kpi">
      <div className="mp-kpi-label">{label}</div>
      <div className="mp-kpi-val">{value}</div>
      {note && <div className="mp-kpi-note">{note}</div>}
    </div>
  );
}
