import type { GrowthForecast as Forecast } from "@/lib/growth-forecast";

// Net growth for the year against the board's minimum, kept to one number per
// case (Dave, 20 Nov 2026). Net growth = new members minus churn, from the
// 1 July count. Churn comes from the engagement matrix: Low = every At risk
// member leaves, Medium = half of them, High = nobody. Joins: Low = today's
// likely prospects, Medium = pipeline plus new leads at last year's
// conversion, High = last year's pace. Departures so far are always counted.

export function GrowthForecast({ f, atRisk, editor }: { f: Forecast; atRisk: number; editor?: React.ReactNode }) {
  const byKey = Object.fromEntries(f.projection.scenarios.map((s) => [s.key, s]));
  const start = f.startOfYearMembers;
  const cases = [
    { k: "Low", joins: f.joinsYtd + Math.round(f.pipelineExpected), leave: f.departuresYtd + atRisk },
    { k: "Medium", joins: byKey.pipeline?.joins ?? f.joinsYtd, leave: f.departuresYtd + Math.round(atRisk / 2) },
    { k: "High", joins: byKey.pace?.joins ?? f.joinsYtd, leave: f.departuresYtd },
  ].map((c) => ({ ...c, pct: start ? ((c.joins - c.leave) / start) * 100 : 0 }));
  const goal = f.targetPct;
  const medium = cases[1];
  const verdict = f.finished
    ? cases[1].pct >= goal
      ? ["Hit goal", "ok"]
      : ["Missed goal", "bad"]
    : medium.pct >= goal
      ? ["On track", "ok"]
      : cases[2].pct >= goal
        ? ["Behind", "warn"]
        : ["Off track", "bad"];
  const tone = { ok: ["#DCFCE7", "#0E8345"], warn: ["#FEF3C7", "#B45309"], bad: ["#FEE2E2", "#C2185B"] }[verdict[1]]!;
  const pct = (n: number) => `${n >= 0 ? "+" : ""}${Math.round(n)}%`;

  return (
    <section className="admin-card" style={{ borderLeft: `4px solid ${tone[1]}`, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div className="admin-card-label">Net growth {f.fyLabel} · minimum {pct(goal)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {editor}
          <span style={{ background: tone[0], color: tone[1], fontWeight: 700, fontSize: 13, padding: "3px 12px", borderRadius: 999 }}>{verdict[0]}</span>
        </div>
      </div>
      <p style={{ margin: "6px 0 14px", fontSize: 14, color: "#374151" }}>
        {f.joinsYtd} joined and {f.departuresYtd} left so far; {start} members on 1 July, {f.currentMembers} now.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {cases.map((c) => {
          const hit = c.pct >= goal;
          return (
            <div
              key={c.k}
              style={{
                border: `1px solid ${c.k === "Medium" ? "#3D46F2" : "var(--border)"}`,
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>{c.k}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: hit ? "#0E8345" : "var(--base-blue, #0c0c31)" }}>{pct(c.pct)}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {c.joins} join, {c.leave} leave
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
