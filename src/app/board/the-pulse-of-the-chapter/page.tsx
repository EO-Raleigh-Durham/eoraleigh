import Link from "next/link";
import { loadChapterPulse, loadNewMemberEngagement, type EngagementTrendPoint } from "@/lib/engagement";
import { loadGrowthForecast } from "@/lib/growth-forecast";
import { listFiscalYears, currentFyStart } from "@/lib/event-metrics";
import FiscalYearSelect from "@/components/FiscalYearSelect";
import { GrowthForecast } from "../GrowthForecast";
import { GrowthGoalEditor } from "./GrowthGoalEditor";
import { PulseMatrix } from "./PulseMatrix";
import { supabase } from "@/lib/supabase";
import type { EngagementSignal } from "@/lib/engagement";
import "./pulse.css";
import { CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

export const metadata = {
  title: "The Pulse of the Chapter",
  description: "What members say in surveys next to what they do at events, by fiscal year.",
};

export const dynamic = "force-dynamic";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: CHAPTER_TIME_ZONE,
  });

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: "#6B7280" }}>—</span>;
  if (value > 0) return <span style={{ color: "#0E8345", fontWeight: 700 }}>▲ +{value.toFixed(1)}</span>;
  if (value < 0) return <span style={{ color: "#C2185B", fontWeight: 700 }}>▼ {value.toFixed(1)}</span>;
  return <span style={{ color: "#6B7280" }}>0.0</span>;
}

// Small arrow next to the trend card's headline number: this month vs last.
function TrendDelta({ current, previous }: { current: number; previous: number }) {
  const d = Math.round((current - previous) * 10) / 10;
  const style = { fontSize: 14, marginLeft: 8 };
  if (d > 0) return <span style={{ ...style, color: "#0E8345" }}>▲ +{d}</span>;
  if (d < 0) return <span style={{ ...style, color: "#C2185B" }}>▼ {d}</span>;
  return <span style={{ ...style, color: "#6B7280" }}>→</span>;
}

// Server-rendered sparkline: monthly engagement points per active member.
// One polyline, no chart library, dot on the current month.
function Sparkline({ points }: { points: EngagementTrendPoint[] }) {
  if (points.length < 2) return null;
  const w = 160;
  const hgt = 40;
  const pad = 4;
  const max = Math.max(...points.map((p) => p.perMember), 0.1);
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (points.length - 1);
  const y = (v: number) => hgt - pad - (v / max) * (hgt - 2 * pad);
  const line = points
    .map((p, i) => `${x(i).toFixed(1)},${y(p.perMember).toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1];
  return (
    <svg
      viewBox={`0 0 ${w} ${hgt}`}
      width="100%"
      height={hgt}
      role="img"
      aria-label={`Monthly engagement per member, ${points[0].label} to ${last.label}`}
      style={{ display: "block", margin: "6px 0 4px" }}
    >
      <polyline
        points={line}
        fill="none"
        stroke="#3D46F2"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={x(points.length - 1).toFixed(1)}
        cy={y(last.perMember).toFixed(1)}
        r="3"
        fill="#3D46F2"
      />
    </svg>
  );
}


export default async function ThePulseOfTheChapterPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string; tab?: string; signal?: string }>;
}) {
  const { fy, tab, signal } = await searchParams;
  const surveysTab = tab === "surveys";
  const SIGNALS: EngagementSignal[] = ["healthy", "value_risk", "drifting", "at_risk"];
  const selectedSignal = SIGNALS.includes(signal as EngagementSignal) ? (signal as EngagementSignal) : null;
  const requested = fy ? Number(fy) : NaN;
  const selected = Number.isInteger(requested) ? requested : currentFyStart();

  const [p, years, newMembers] = await Promise.all([
    loadChapterPulse(selected),
    listFiscalYears(),
    loadNewMemberEngagement(),
  ]);
  const forecast = await loadGrowthForecast(selected, p.members);
  const atRisk = p.members.filter((m) => m.signal === "at_risk").length;
  const healthy = p.members.filter((m) => m.signal === "healthy").length;
  const scored = p.members.filter((m) => m.signal !== "new").length;
  // Members whose suggested follow-up is already on the Workboard.
  const { data: cardRows } = await supabase
    .from("tasks")
    .select("subject_id")
    .eq("subject_type", "person")
    .eq("status", "open")
    .eq("metadata->>source", "engagement")
    .is("archived_at", null);
  const onWorkboard = new Set(((cardRows ?? []) as { subject_id: string }[]).map((r) => r.subject_id));
  const q = (t: string) => `?${new URLSearchParams({ ...(fy ? { fy } : {}), ...(t === "surveys" ? { tab: "surveys" } : {}) }).toString()}`;
  const options = Array.from(new Set([selected, ...years])).sort(
    (a, b) => b - a,
  );

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">Member Engagement</div>
        <h1 className="admin-page-title">The Pulse of the Chapter</h1>
        <p className="admin-page-sub">
          Will we grow at least {forecast.targetPct}% this year, and which members need attention, {p.fyLabel}
        </p>
        <FiscalYearSelect options={options} selected={selected} />
      </div>

      <GrowthForecast
        f={forecast}
        atRisk={atRisk}
        editor={
          <GrowthGoalEditor
            fiscalYearStart={forecast.fiscalYearStart}
            targetPct={forecast.targetPct}
            riskLapseRate={forecast.riskLapseRate}
            sourceNote={forecast.sourceNote}
          />
        }
      />

      <div className="pm-trends">
        <div className="admin-card">
          <div className="admin-card-label">Healthy members</div>
          <div className="admin-card-title">{scored ? Math.round((healthy / scored) * 100) : 0}%</div>
          <div className="admin-card-desc">{healthy} of {scored} · target 70%</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-label">Growth Pulse · {p.fyLabel}</div>
          <div className="admin-card-title">{p.fyPulseAvg !== null ? `${p.fyPulseAvg.toFixed(1)} / 5` : "No responses"}</div>
          <div className="admin-card-desc">{p.fyPulseResponses} {p.fyPulseResponses === 1 ? "response" : "responses"} this year</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-label">Engagement by month</div>
          <div className="admin-card-title">
            {p.trend.length >= 2 ? (
              <>
                {p.trend[p.trend.length - 1].perMember}
                <TrendDelta current={p.trend[p.trend.length - 1].perMember} previous={p.trend[p.trend.length - 2].perMember} />
              </>
            ) : (
              "No data"
            )}
          </div>
          <Sparkline points={p.trend} />
        </div>
      </div>

      <nav className="pm-tabs" aria-label="Pulse sections">
        <Link href={q("engagement")} className={`pm-tab${surveysTab ? "" : " is-active"}`}>Engagement</Link>
        <Link href={q("surveys")} className={`pm-tab${surveysTab ? " is-active" : ""}`}>Surveys</Link>
      </nav>

      {!surveysTab && (
        <section>
          <PulseMatrix
            members={p.members}
            selected={selectedSignal}
            showNew={signal === "new"}
            newMembers={newMembers.members}
            onWorkboard={onWorkboard}
          />
        </section>
      )}

      {surveysTab && (
        <>
          <div className="admin-card-grid">
            <div className="admin-card">
              <div className="admin-card-label">Event value · {p.fyLabel}</div>
              <div className="admin-card-title">{p.fyEventValueAvg !== null ? `${p.fyEventValueAvg.toFixed(1)} / 5` : "No ratings"}</div>
              <div className="admin-card-desc">
                {p.fyEventValueResponses} {p.fyEventValueResponses === 1 ? "response" : "responses"} across {p.fyEventsHeld} {p.fyEventsHeld === 1 ? "event" : "events"}
              </div>
            </div>
            <div className="admin-card">
              <div className="admin-card-label">Events per member · {p.fyLabel}</div>
              <div className="admin-card-title">{p.fyAvgEventsPerMember !== null ? p.fyAvgEventsPerMember : "No data"}</div>
              <div className="admin-card-desc">Check-ins across {p.fyEventsHeld} events ÷ {p.activeMemberCount} members</div>
            </div>
          </div>

          <section style={{ marginTop: 28 }}>
            <h2 className="admin-section-title">Growth Pulse by quarter</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Wave</th>
                    <th>Responses</th>
                    <th>Avg rating</th>
                    <th>vs previous</th>
                  </tr>
                </thead>
                <tbody>
                  {p.waves.map((w) => (
                    <tr key={w.label}>
                      <td>{w.label}</td>
                      <td>{w.responses}</td>
                      <td>{w.avgRating !== null ? `${w.avgRating.toFixed(1)} / 5` : "No responses"}</td>
                      <td><Delta value={w.delta} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="admin-table-meta" style={{ marginTop: 16 }}>
              <Link href="/board/surveys/transformational-growth-pulse" className="admin-link-action">
                Full Transformational Growth Pulse dashboard →
              </Link>
            </p>
          </section>

          <section style={{ marginTop: 28 }}>
            <h2 className="admin-section-title">Recent events</h2>
            {p.recentEvents.length === 0 ? (
              <div className="admin-stub">No events held this fiscal year yet</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Date</th>
                      <th>Event value</th>
                      <th>Checked in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.recentEvents.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <Link href={`/board/events/${e.id}`} className="admin-link-action">{e.title}</Link>
                        </td>
                        <td>{fmtDate(e.startsAt)}</td>
                        <td>{e.eventValueRating !== null ? `${e.eventValueRating.toFixed(1)} / 5 (${e.eventValueResponses})` : "No ratings"}</td>
                        <td>{e.checkedIn} / {e.registered}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="admin-table-meta" style={{ marginTop: 16 }}>
              <Link href="/board/events/performance" className="admin-link-action">Full Event Performance dashboard →</Link>
            </p>
          </section>
        </>
      )}
    </div>
  );
}
