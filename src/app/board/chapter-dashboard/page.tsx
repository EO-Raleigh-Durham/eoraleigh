import Link from "next/link";
import {
  loadChapterOverview,
  type ChapterOverview,
  type KpiDelta,
  type EventsSummary,
} from "@/lib/chapter-overview";
import type { ChapterMetric } from "@/lib/chapter-metrics";
import {
  loadMembershipPipeline,
  type MembershipPipeline,
} from "@/lib/membership-pipeline";
import { SAP_DEAL_TYPE_LABEL, type SapDealType } from "@/lib/sap";
import { eventTypeLabel, formatEventDate, type EventType } from "@/lib/events";
import { getChannelReach, type ChannelReachResult } from "@/lib/marketing";
import { listFiscalYears, currentFyStart } from "@/lib/event-metrics";
import FiscalYearSelect from "@/components/FiscalYearSelect";
import "./chapter-dashboard.css";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Chapter Dashboard",
  description: `The ${CHAPTER_NAME} chapter at a glance: membership, dues, events, engagement, and marketing for the fiscal year.`,
};
export const dynamic = "force-dynamic";

// ============================================================
// Formatting helpers
// ============================================================

const usd = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;
const usdK = (v: number) =>
  v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`;
const fyWindowText = (start: number) => `Jul ${start} – Jun ${start + 1}`;

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================
// Membership pipeline (board funnel + link to full dashboard)
// ============================================================

function MembershipSection({ pipeline }: { pipeline: MembershipPipeline }) {
  const max = Math.max(1, ...pipeline.funnel.map((s) => s.count));
  const bits = [`${pipeline.open} prospects in flight`];
  if (pipeline.winRatePct != null) bits.push(`a ${pipeline.winRatePct}% win rate`);
  if (pipeline.avgCycleDays != null)
    bits.push(`about ${pipeline.avgCycleDays} days to join`);

  return (
    <section className="cdash-section">
      <div className="cdash-section-label">Member Acquisition</div>
      <h2>The membership pipeline</h2>
      <p className="cdash-section-desc">
        {bits.join(", ")}.{" "}
        <Link className="cdash-link" href="/board/membership-pipeline">
          Open the full pipeline dashboard
        </Link>
        .
      </p>
      <div className="cdash-split">
        <div>
          {pipeline.funnel.map((s) => (
            <div key={s.stage} className="cdash-funnel-row">
              <div className="cdash-funnel-label">{s.stage}</div>
              <div className="cdash-funnel-track">
                <div
                  className="cdash-funnel-fill"
                  style={{
                    width: `${Math.max(3, (s.count / max) * 100)}%`,
                    background: "var(--c-blue)",
                  }}
                />
              </div>
              <div className="cdash-funnel-val">{s.count}</div>
            </div>
          ))}
        </div>
        <div className="cdash-tiles">
          <div className="cdash-tile is-feature">
            <div className="cdash-tile-val">{pipeline.open}</div>
            <div className="cdash-tile-label">Open prospects</div>
          </div>
          <div className="cdash-tile">
            <div className="cdash-tile-val">
              {pipeline.winRatePct != null ? `${pipeline.winRatePct}%` : "—"}
            </div>
            <div className="cdash-tile-label">Win rate</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Page
// ============================================================

export default async function ChapterDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const { fy } = await searchParams;
  const requested = fy ? Number(fy) : NaN;
  const selected = Number.isInteger(requested) ? requested : currentFyStart();

  const [data, pipeline, reach, years] = await Promise.all([
    loadChapterOverview(selected),
    loadMembershipPipeline(),
    getChannelReach(),
    listFiscalYears(),
  ]);
  const { current, prior } = data;
  // The selected year is always selectable, even before it has a metrics row.
  const options = Array.from(new Set([selected, ...years])).sort(
    (a, b) => b - a,
  );

  if (!current) {
    return (
      <div className="cdash">
        <div className="admin-page-head">
          <div className="admin-eyebrow">State of the Chapter</div>
          <h1 className="admin-page-title">No chapter metrics yet</h1>
          <p className="admin-page-sub">
            Once a fiscal year is recorded under Historical Metrics, this board
            dashboard will populate automatically
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="cdash">
      <Hero
        data={data}
        current={current}
        prior={prior}
        options={options}
        selected={selected}
      />
      <KpiStrip data={data} current={current} prior={prior} />

      <div className="cdash-container">
        <TrendsSection history={data.history} />
        <HistoricalSection history={data.history} />
        <SapSection data={data} />
        <MembershipSection pipeline={pipeline} />
        {data.events && <EventsSection events={data.events} />}
        <MarketingSection reach={reach} />
        {data.pulse && <SentimentSection data={data} current={current} />}
        <PendingSection current={current} />
      </div>

      <footer className="cdash-footer">
        Live from Supabase · loaded {fmtDate(data.loadedAt)} · internal use only,
        do not share these figures externally
      </footer>
    </div>
  );
}

// ============================================================
// Hero
// ============================================================

function Hero({
  data,
  current,
  prior,
  options,
  selected,
}: {
  data: ChapterOverview;
  current: ChapterMetric;
  prior: ChapterMetric | null;
  options: number[];
  selected: number;
}) {
  const membersRecord = isRecord(data.history, "members", current.members);
  const revenueRecord = isRecord(data.history, "revenue_usd", current.revenue_usd);

  let summary = `${current.president ?? "The board"} leads the chapter through FY${current.fiscal_year}.`;
  if (current.members !== null && current.revenue_usd !== null) {
    const both = membersRecord && revenueRecord;
    summary = `${current.president ?? "The board"}'s board reaches ${current.members} members on ${usd(current.revenue_usd)} of revenue${
      both ? ", both all-time chapter records" : ""
    }.`;
  }

  return (
    <div className="admin-page-head">
      <div className="admin-eyebrow">State of the Chapter</div>
      <h1 className="admin-page-title">Fiscal Year {current.fiscal_year}</h1>
      <p className="admin-page-sub">{summary}</p>
      <div className="cdash-hero-meta">
        {current.president && (
          <span>
            President <b>{current.president}</b>
          </span>
        )}
        <span>
          Window <b>{fyWindowText(current.fiscal_year_start)}</b>
        </span>
        {prior && (
          <span>
            Compared to <b>FY{prior.fiscal_year}</b>
          </span>
        )}
      </div>
      <FiscalYearSelect options={options} selected={selected} />
    </div>
  );
}

function isRecord(
  history: ChapterMetric[],
  field: keyof ChapterMetric,
  value: number | null,
): boolean {
  if (value === null) return false;
  const vals = history
    .map((h) => h[field])
    .filter((v): v is number => typeof v === "number");
  return vals.length > 0 && value >= Math.max(...vals);
}

// ============================================================
// KPI strip
// ============================================================

function KpiStrip({
  data,
  current,
  prior,
}: {
  data: ChapterOverview;
  current: ChapterMetric;
  prior: ChapterMetric | null;
}) {
  const sapIsNew =
    (current.sap_usd ?? 0) > 0 && (!prior || (prior.sap_usd ?? 0) === 0);
  const priorLabel = prior ? `vs FY${prior.fiscal_year}` : undefined;

  return (
    <div className="cdash-kpis">
      <Kpi
        label="Members"
        value={current.members !== null ? String(current.members) : "—"}
        delta={data.deltas.members}
        note={priorLabel}
      />
      <Kpi
        label="Revenue"
        value={current.revenue_usd !== null ? usd(current.revenue_usd) : "—"}
        delta={data.deltas.revenue_usd}
        note={priorLabel}
      />
      <Kpi
        label="Revenue / member"
        value={
          current.revenue_per_member_usd !== null
            ? usd(current.revenue_per_member_usd)
            : "—"
        }
        delta={data.deltas.revenue_per_member_usd}
        note={priorLabel}
      />
      <Kpi
        label="Forums"
        value={current.forum_count !== null ? String(current.forum_count) : "—"}
        delta={data.deltas.forum_count}
        note={priorLabel}
      />
      <Kpi
        label="SAP secured"
        value={current.sap_usd !== null ? usd(current.sap_usd) : "—"}
        delta={sapIsNew ? undefined : data.deltas.sap_usd}
        isNew={sapIsNew ? "First SAP year" : undefined}
        note={sapIsNew ? undefined : priorLabel}
      />
      <Kpi
        label="EO grants"
        value={current.eo_grants_usd !== null ? usd(current.eo_grants_usd) : "—"}
        delta={data.deltas.eo_grants_usd}
        note={priorLabel}
      />
      {/* Website ticket sales, live for the current year only: the website took
          payments from June 2026, so earlier years would read short. */}
      <Kpi
        label="Event revenue"
        value={data.revenue ? usd(data.revenue.events) : "—"}
        note={data.revenue ? "Website ticket sales this year" : "Not tracked for past years"}
      />
      {data.revenue && (
        <p className="cdash-revenue-note" style={{ gridColumn: "1 / -1", margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>
          Revenue so far, calculated live: dues {usd(data.revenue.dues)}
          {data.revenue.duesRate !== null
            ? ` (${data.revenue.members} members at ${usd(data.revenue.duesRate)}, new members from their join month)`
            : " (set the dues rate on Historical metrics)"}{" "}
          + initiation {usd(data.revenue.initiation)}
          {data.revenue.initiationFee !== null
            ? ` (${data.revenue.newMembers} new × ${usd(data.revenue.initiationFee)})`
            : " (set the fee on Historical metrics)"}{" "}
          + EO grants {usd(data.revenue.grants)} + SAP cash {usd(data.revenue.sapCash)} + event tickets{" "}
          {usd(data.revenue.events)} = <strong>{usd(data.revenue.total)}</strong>. Revenue per member is total ÷ members.
        </p>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  note,
  isNew,
}: {
  label: string;
  value: string;
  delta?: KpiDelta;
  note?: string;
  isNew?: string;
}) {
  return (
    <div className="cdash-kpi">
      <div className="cdash-kpi-label">{label}</div>
      <div className="cdash-kpi-val">{value}</div>
      {isNew ? (
        <div className="cdash-kpi-new">{isNew}</div>
      ) : (
        delta && <DeltaChip d={delta} />
      )}
      {note && !isNew && <div className="cdash-kpi-note">{note}</div>}
    </div>
  );
}

function DeltaChip({ d }: { d: KpiDelta }) {
  if (d.pct === null && d.abs === null) return null;
  const cls =
    d.direction === "up" ? "is-up" : d.direction === "down" ? "is-down" : "is-flat";
  const arrow = d.direction === "up" ? "▲" : d.direction === "down" ? "▼" : "—";
  const text =
    d.pct !== null
      ? `${d.pct > 0 ? "+" : ""}${d.pct}%`
      : `${(d.abs ?? 0) > 0 ? "+" : ""}${d.abs}`;
  return (
    <span className={`cdash-kpi-delta ${cls}`}>
      <span className="cdash-arrow">{arrow}</span>
      {text}
    </span>
  );
}

// ============================================================
// Historical metrics (read-only recent-years table + link to editor)
// ============================================================

function HistoricalSection({ history }: { history: ChapterMetric[] }) {
  const years = history.slice(-6);
  const rows: { label: string; fmt: (m: ChapterMetric) => string }[] = [
    { label: "Members", fmt: (m) => (m.members != null ? String(m.members) : "—") },
    { label: "Retention", fmt: (m) => (m.retention_pct != null ? `${m.retention_pct}%` : "—") },
    { label: "Revenue", fmt: (m) => (m.revenue_usd != null ? usd(m.revenue_usd) : "—") },
    {
      label: "Revenue / member",
      fmt: (m) => (m.revenue_per_member_usd != null ? usd(m.revenue_per_member_usd) : "—"),
    },
    { label: "Forums", fmt: (m) => (m.forum_count != null ? String(m.forum_count) : "—") },
  ];

  return (
    <section className="cdash-section">
      <div className="cdash-section-label">Historical Metrics</div>
      <h2>The numbers behind the trends</h2>
      <p className="cdash-section-desc">
        Recent fiscal years at a glance.{" "}
        <Link className="cdash-link" href="/board/historical-metrics">
          Open the full editable table
        </Link>{" "}
        for every metric and year.
      </p>
      <div className="cdash-histtable-wrap">
        <table className="cdash-histtable">
          <thead>
            <tr>
              <th>Metric</th>
              {years.map((y) => (
                <th key={y.id} className="num">
                  {y.fiscal_year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th>{r.label}</th>
                {years.map((y) => (
                  <td key={y.id} className="num">
                    {r.fmt(y)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ============================================================
// Trends (9-year history)
// ============================================================

function TrendsSection({ history }: { history: ChapterMetric[] }) {
  const points = (field: keyof ChapterMetric) =>
    history.map((h) => ({
      label: h.fiscal_year,
      value: typeof h[field] === "number" ? (h[field] as number) : null,
    }));

  return (
    <section className="cdash-section">
      <div className="cdash-section-label">Year over Year</div>
      <h2>{history.length} years of chapter growth</h2>
      <p className="cdash-section-desc">
        Every fiscal year the board has on record, from the 2017/18 founding to
        today. The most recent year is highlighted on each chart.
      </p>
      <div className="cdash-chart-grid">
        <Chart
          kind="line"
          title="Members"
          sub="Active chapter members at year end"
          color="var(--c-blue)"
          points={points("members")}
          fmtAxis={(v) => String(Math.round(v))}
          fmtPoint={(v) => String(Math.round(v))}
        />
        <Chart
          kind="bar"
          title="Revenue"
          sub="Total chapter revenue (USD)"
          color="var(--c-green)"
          points={points("revenue_usd")}
          fmtAxis={usdK}
          fmtPoint={usdK}
        />
        <Chart
          kind="line"
          title="Retention"
          sub="Member retention rate (%)"
          color="var(--c-orange)"
          points={points("retention_pct")}
          fmtAxis={(v) => `${Math.round(v)}%`}
          fmtPoint={(v) => `${Math.round(v)}%`}
        />
        <Chart
          kind="bar"
          title="Chapter events"
          sub="Events held per year (board record)"
          color="var(--c-pink)"
          points={points("chapter_events")}
          fmtAxis={(v) => String(Math.round(v))}
          fmtPoint={(v) => String(Math.round(v))}
        />
      </div>
    </section>
  );
}

type ChartPoint = { label: string; value: number | null };

function Chart({
  kind,
  title,
  sub,
  color,
  points,
  fmtAxis,
  fmtPoint,
}: {
  kind: "line" | "bar";
  title: string;
  sub: string;
  color: string;
  points: ChartPoint[];
  fmtAxis: (v: number) => string;
  fmtPoint: (v: number) => string;
}) {
  const W = 480;
  const H = 250;
  const padL = 52;
  const padR = 16;
  const padT = 22;
  const padB = 32;

  const vals = points
    .map((p) => p.value)
    .filter((v): v is number => v !== null);
  if (vals.length < 2) return null;

  const maxV = Math.max(...vals);
  const minV = Math.min(...vals);
  const range = maxV - minV || maxV || 1;
  const top = maxV + range * 0.15;
  const bot = kind === "bar" ? 0 : Math.max(0, minV - range * 0.15);
  const span = top - bot || 1;

  const n = points.length;
  const xCenter = (i: number) =>
    padL + (W - padL - padR) * (n === 1 ? 0.5 : i / (n - 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - bot) / span);

  // Last non-null index, for the highlighted callout
  let lastIdx = -1;
  points.forEach((p, i) => {
    if (p.value !== null) lastIdx = i;
  });

  const gridVals = [minV, (minV + maxV) / 2, maxV];

  const linePts = points
    .map((p, i) => (p.value !== null ? `${xCenter(i)},${y(p.value)}` : null))
    .filter((s): s is string => s !== null)
    .join(" ");

  const barW = ((W - padL - padR) / n) * 0.6;

  return (
    <div className="cdash-chart">
      <div className="cdash-chart-title">{title}</div>
      <div className="cdash-chart-sub">{sub}</div>
      <svg
        className="cdash-chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${title} from ${points[0].label} to ${points[n - 1].label}`}
      >
        {/* gridlines + y labels */}
        {gridVals.map((gv, gi) => (
          <g key={gi}>
            <line
              x1={padL}
              y1={y(gv)}
              x2={W - padR}
              y2={y(gv)}
              stroke="var(--c-border)"
              strokeWidth="1"
              strokeDasharray={gi === 0 ? undefined : "4"}
            />
            <text
              x={padL - 8}
              y={y(gv) + 4}
              textAnchor="end"
              fontSize="10"
              fill="var(--c-muted)"
            >
              {fmtAxis(gv)}
            </text>
          </g>
        ))}

        {/* x labels (every other + last) */}
        {points.map((p, i) =>
          i % 2 === 0 || i === n - 1 ? (
            <text
              key={`x-${p.label}`}
              x={xCenter(i)}
              y={H - 10}
              textAnchor="middle"
              fontSize="10"
              fill="var(--c-muted)"
            >
              {p.label}
            </text>
          ) : null,
        )}

        {kind === "bar"
          ? points.map((p, i) =>
              p.value !== null ? (
                <rect
                  key={`bar-${p.label}`}
                  x={xCenter(i) - barW / 2}
                  y={y(p.value)}
                  width={barW}
                  height={H - padB - y(p.value)}
                  rx="3"
                  fill={color}
                  opacity={i === lastIdx ? 1 : 0.45}
                />
              ) : null,
            )
          : (
            <>
              <polyline
                points={linePts}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {points.map((p, i) =>
                p.value !== null ? (
                  <circle
                    key={`pt-${p.label}`}
                    cx={xCenter(i)}
                    cy={y(p.value)}
                    r={i === lastIdx ? 5 : 3}
                    fill={color}
                  />
                ) : null,
              )}
            </>
          )}

        {/* highlighted callout on the most recent year */}
        {lastIdx >= 0 && points[lastIdx].value !== null && (
          <text
            x={xCenter(lastIdx)}
            y={y(points[lastIdx].value as number) - 12}
            textAnchor={lastIdx === n - 1 ? "end" : "middle"}
            fontSize="13"
            fontWeight="700"
            fill="var(--c-navy)"
          >
            {fmtPoint(points[lastIdx].value as number)}
          </text>
        )}
      </svg>
    </div>
  );
}

// ============================================================
// SAP pipeline
// ============================================================

function SapSection({ data }: { data: ChapterOverview }) {
  const { sap, wonPartners, current } = data;
  // Cash and the won list are scoped to the selected fiscal year (by each
  // deal's close-won date); the funnel is a live pipeline snapshot.
  const fyCash = wonPartners.reduce((s, p) => s + p.amountUsd, 0);
  const fyName = current ? `FY${current.fiscal_year}` : "this fiscal year";
  const funnel = [
    { label: "Leads", value: sap.leads, color: "var(--c-blue-soft)" },
    { label: "In discussion", value: sap.inDiscussion, color: "var(--c-yellow)" },
    { label: "Won", value: sap.active, color: "var(--c-green)" },
    { label: "Lost", value: sap.lost, color: "var(--c-pink)" },
  ];
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <section className="cdash-section">
      <div className="cdash-section-label">Strategic Alliance Partners</div>
      <h2>Chapter sponsorship pipeline</h2>
      <p className="cdash-section-desc">
        The chapter&apos;s Strategic Alliance Partner program tracks {sap.total}{" "}
        companies across the pipeline, with {usd(fyCash)} in cash secured in{" "}
        {fyName}.
      </p>

      <div className="cdash-split">
        <div>
          {funnel.map((f) => (
            <div key={f.label} className="cdash-funnel-row">
              <div className="cdash-funnel-label">{f.label}</div>
              <div className="cdash-funnel-track">
                <div
                  className="cdash-funnel-fill"
                  style={{
                    width: `${Math.max(3, (f.value / maxFunnel) * 100)}%`,
                    background: f.color,
                  }}
                />
              </div>
              <div className="cdash-funnel-val">{f.value}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="cdash-won-head">
            <strong>Won partners · {fyName}</strong>
            <span className="cdash-won-secured">
              <b>{usd(fyCash)}</b> cash secured
            </span>
          </div>
          {wonPartners.length === 0 && (
            <p className="cdash-section-desc">
              No partners closed-won in {fyName} yet
            </p>
          )}
          {wonPartners.map((p) => (
            <div key={p.name} className="cdash-won-row">
              <div className="cdash-won-name">{p.name}</div>
              {p.tier ? (
                <span className={`cdash-tier is-${p.tier}`}>
                  {SAP_DEAL_TYPE_LABEL[p.tier as SapDealType]}
                </span>
              ) : (
                <span />
              )}
              {p.amountUsd > 0 ? (
                <div className="cdash-won-amt">{usd(p.amountUsd)}</div>
              ) : (
                <div className="cdash-won-amt is-discount">In-kind</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Events (live operational view)
// ============================================================

const EVENT_TYPE_COLOR: Record<EventType, string> = {
  learning: "var(--c-blue)",
  membership: "var(--c-yellow)",
  social: "var(--c-pink)",
  my_eo: "var(--c-green)",
  forum: "var(--c-orange)",
};

function EventsSection({ events }: { events: EventsSummary }) {
  const maxType = Math.max(1, ...events.byType.map((t) => t.count));
  const eventValue =
    events.eventValue.responses > 0 && events.eventValue.average !== null
      ? `. Event value is ${events.eventValue.average.toFixed(1)}/5 across ${events.eventValue.responses} responses`
      : "";

  return (
    <section className="cdash-section">
      <div className="cdash-section-label">Events</div>
      <h2>Chapter events this year</h2>
      <p className="cdash-section-desc">
        Live from the events calendar: {events.held} events with{" "}
        {events.attendance.toLocaleString("en-US")} member registrations
        {eventValue}.
      </p>

      <div className="cdash-tiles" style={{ marginBottom: 28 }}>
        <div className="cdash-tile is-feature">
          <div className="cdash-tile-val">{events.held}</div>
          <div className="cdash-tile-label">Events</div>
        </div>
        <div className="cdash-tile">
          <div className="cdash-tile-val">
            {events.attendance.toLocaleString("en-US")}
          </div>
          <div className="cdash-tile-label">Total registrations</div>
        </div>
        {events.avgAttendance !== null && (
          <div className="cdash-tile">
            <div className="cdash-tile-val">{events.avgAttendance}</div>
            <div className="cdash-tile-label">Avg per event</div>
          </div>
        )}
        {events.eventValue.average !== null && (
          <div className="cdash-tile">
            <div className="cdash-tile-val">
              {events.eventValue.average.toFixed(1)}
              <span>/5</span>
            </div>
            <div className="cdash-tile-label">
              Event value · {events.eventValue.responses} responses
            </div>
          </div>
        )}
        {events.growth.average !== null && (
          <div className="cdash-tile">
            <div className="cdash-tile-val">
              {events.growth.average.toFixed(1)}
              <span>/5</span>
            </div>
            <div className="cdash-tile-label">
              Historical growth · {events.growth.responses} responses
            </div>
          </div>
        )}
      </div>

      <div className="cdash-split">
        <div>
          <div className="cdash-won-head">
            <strong>By type</strong>
          </div>
          {events.byType.map((t) => (
            <div key={t.type} className="cdash-funnel-row">
              <div className="cdash-funnel-label">{t.label}</div>
              <div className="cdash-funnel-track">
                <div
                  className="cdash-funnel-fill"
                  style={{
                    width: `${Math.max(3, (t.count / maxType) * 100)}%`,
                    background: EVENT_TYPE_COLOR[t.type],
                  }}
                />
              </div>
              <div className="cdash-funnel-val">{t.count}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="cdash-won-head">
            <strong>Best attended</strong>
            <span className="cdash-won-secured">registrations</span>
          </div>
          {events.topEvents.map((e, i) => (
            <div key={i} className="cdash-evt-row">
              <div>
                <div className="cdash-evt-title">{e.title}</div>
                <div className="cdash-evt-date">
                  {formatEventDate(e.startsAt).full}
                </div>
              </div>
              <span
                className="cdash-evt-type"
                style={{ color: EVENT_TYPE_COLOR[e.type] }}
              >
                {eventTypeLabel(e.type)}
              </span>
              <div className="cdash-evt-att">{e.attendees}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Marketing & reach
//
// Live from marketing_channel_metrics (027) via getChannelReach.
// Numbers are maintained on /board/marketing; this is a read-only
// mirror of the latest period.
// ============================================================

function MarketingSection({ reach }: { reach: ChannelReachResult }) {
  if (reach.channels.length === 0) return null;
  return (
    <section className="cdash-section">
      <div className="cdash-section-label">Marketing &amp; Reach</div>
      <h2>Digital reach this year</h2>
      <p className="cdash-section-desc">
        Social and web performance{reach.period ? ` for the ${reach.period}` : ""}.
        Full breakdown on the{" "}
        <Link className="cdash-link" href="/board/marketing">
          Marketing dashboard
        </Link>
        .
      </p>
      <div className="cdash-mkt-grid">
        {reach.channels.map((c) => (
          <div key={c.key} className="cdash-mkt-card">
            <div className="cdash-mkt-name">{c.name}</div>
            <div className="cdash-mkt-primary">{c.headline.value}</div>
            <div className="cdash-mkt-primary-label">{c.headline.label}</div>
            {c.stats[0] && (
              <div className="cdash-mkt-secondary">
                <span className="cdash-mkt-sec-val">{c.stats[0].value}</span>
                <span className="cdash-mkt-sec-label">{c.stats[0].label}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// Member sentiment (Pulse)
// ============================================================

function SentimentSection({
  data,
  current,
}: {
  data: ChapterOverview;
  current: ChapterMetric;
}) {
  const pulse = data.pulse!;

  return (
    <section className="cdash-section">
      <div className="cdash-section-label">Member Sentiment</div>
      <h2>How members feel about the year</h2>
      <p className="cdash-section-desc">
        From the Transformational Growth Pulse, {pulse.responses} member
        responses submitted during FY{current.fiscal_year}.
      </p>

      <div className="cdash-tiles">
        <div className="cdash-tile is-feature">
          <div className="cdash-tile-val">
            {pulse.avgRating !== null ? pulse.avgRating.toFixed(1) : "—"}
            <span>/5</span>
          </div>
          <div className="cdash-tile-label">Transformational growth rating</div>
        </div>
        <div className="cdash-tile">
          <div className="cdash-tile-val">
            {pulse.highSatPct !== null ? `${pulse.highSatPct}%` : "—"}
          </div>
          <div className="cdash-tile-label">Rated 4–5 stars</div>
        </div>
        <div className="cdash-tile">
          <div className="cdash-tile-val">{pulse.responses}</div>
          <div className="cdash-tile-label">Pulse responses</div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Year-end pending callout
// ============================================================

const PENDING_LABELS: { field: keyof ChapterMetric; label: string }[] = [
  { field: "retention_pct", label: "Member retention" },
  { field: "end_of_year_reserves_usd", label: "Year-end reserves" },
];

function PendingSection({ current }: { current: ChapterMetric }) {
  const pending = PENDING_LABELS.filter((p) => current[p.field] === null);
  if (pending.length === 0) return null;

  return (
    <section className="cdash-section">
      <div className="cdash-pending">
        <h3>Pending year-end close</h3>
        <p>
          These metrics are finalized after the fiscal year closes on 30 Jun{" "}
          {current.fiscal_year_start + 1}. They will populate here automatically
          once the board records them under Historical Metrics.
        </p>
        <div className="cdash-chips">
          {pending.map((p) => (
            <span key={p.field} className="cdash-chip">
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
