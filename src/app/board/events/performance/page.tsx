import Link from "next/link";
import {
  listFiscalYears,
  getEventMetricsForFY,
  currentFyStart,
  fyLabel,
  fyWindowText,
  type CurrencyTotal,
} from "@/lib/event-metrics";
import { delta, type KpiDelta } from "@/lib/fiscal-year";
import { getMemberReachForFY } from "@/lib/engagement";
import { buildEventTrends, type EventTrends } from "@/lib/event-trends";
import FiscalYearSelect from "@/components/FiscalYearSelect";
import { eventTypeLabel, formatEventDate, type EventType } from "@/lib/events";
import { toUsd } from "@/lib/currency";
import EventLists, { type ListEvent, type PastEvent } from "./EventLists";
import type { ReactNode } from "react";
import { CHAPTER_LOCAL_CURRENCY, CHAPTER_LOCAL_PER_USD } from "@/kernel/config/chapter";

export const metadata = {
  title: "Event Performance",
  description: "Fiscal-year event results and upcoming event pipeline.",
};
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ fy?: string }>;

const EVENT_TYPE_COLOR: Record<EventType, string> = {
  learning: "#3D46F2",
  membership: "#EFB82E",
  social: "#FF346E",
  my_eo: "#1EA691",
  forum: "#FA653C",
};

// Board dashboards show money in US dollars only (the local currency converted at the
// planning rate in @/lib/currency).
function usdTotal(totals: CurrencyTotal[]): number {
  return totals.reduce((sum, t) => sum + (toUsd(t.amount, t.currency) ?? 0), 0);
}

function formatUsd(value: number, compact = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact ? 1 : 0,
    ...(compact ? { notation: "compact" as const } : {}),
  }).format(value);
}

// The Learning chair's FY goal (board meeting plan, Nov 2026). Shown as a
// marker on the Learning rating meter.
const RATING_GOALS: Partial<Record<EventType, number>> = { learning: 4.5 };

function RatingMeter({
  rating,
  goal,
  color,
}: {
  rating: number | null;
  goal?: number;
  color: string;
}) {
  // The survey scale runs 1 to 5, so 1 sits at the left edge.
  const pct = (value: number) => ((value - 1) / 4) * 100;
  return (
    <div className="emx-meter" aria-hidden>
      <div className="emx-meter-track">
        {rating !== null && (
          <div
            className="emx-meter-fill"
            style={{ width: `${pct(rating)}%`, background: color }}
          />
        )}
        {goal !== undefined && (
          <div
            className="emx-meter-goal"
            style={{ left: `${pct(goal)}%` }}
            title={`Goal ${goal}`}
          />
        )}
      </div>
      <div className="emx-meter-scale">
        <span>1</span>
        <span>5</span>
      </div>
    </div>
  );
}

function DeltaChip({
  d,
  mode = "pct",
}: {
  d: KpiDelta;
  mode?: "pct" | "abs";
}) {
  if (d.abs === null) return null;
  const cls =
    d.direction === "up"
      ? "is-up"
      : d.direction === "down"
        ? "is-down"
        : "is-flat";
  const arrow = d.direction === "up" ? "▲" : d.direction === "down" ? "▼" : "—";
  const absText = Number.isInteger(d.abs)
    ? String(d.abs)
    : String(Math.round(d.abs * 10) / 10);
  const text =
    mode === "pct" && d.pct !== null
      ? `${d.pct > 0 ? "+" : ""}${d.pct}%`
      : `${d.abs > 0 ? "+" : ""}${absText}`;
  return (
    <span className={`emx-kpi-delta ${cls}`}>
      <span className="emx-arrow">{arrow}</span>
      {text}
    </span>
  );
}

function requestTimestamp() {
  return Date.now();
}

function niceMax(value: number): number {
  if (value <= 10) return 10;
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step) * step;
}

function TrendsSection({ t, fy, prevFy }: { t: EventTrends; fy: string; prevFy: string }) {
  const max = niceMax(Math.max(...t.months.map((p) => Math.max(p.thisYear ?? 0, p.lastYear))));
  const ticks = [max, max / 2, 0];
  const pct = (v: number) => `${(v / max) * 100}%`;
  return (
    <section className="emx-section">
      <h2 className="emx-h2">This year vs last year</h2>
      <div className="emx-trends">
        <div className="emx-trend-card">
          <div className="emx-trend-head">
            <div className="emx-trend-title">Registrations by month</div>
            <div className="emx-legend">
              <span><i className="emx-legend-bar" /> {fy}</span>
              <span><i className="emx-legend-tick" /> {prevFy}</span>
            </div>
          </div>
          <div className="emx-trend-chart" role="img" aria-label={`Registrations by month, ${fy} against ${prevFy}`}>
            <div className="emx-trend-grid" aria-hidden>
              {ticks.map((tick) => (
                <div key={tick} className="emx-trend-gridline" style={{ bottom: pct(tick) }}>
                  <span>{tick}</span>
                </div>
              ))}
            </div>
            <div className="emx-trend-cols">
              {t.months.map((p) => (
                <div key={p.month} className="emx-trend-col" tabIndex={0}>
                  <div className="emx-trend-plot">
                    {p.thisYear !== null && p.thisYear > 0 && (
                      <div className="emx-trend-bar" style={{ height: pct(p.thisYear) }} />
                    )}
                    {p.lastYear > 0 && (
                      <div className="emx-trend-tick" style={{ bottom: pct(p.lastYear) }} />
                    )}
                    <div className="emx-trend-tip" role="tooltip">
                      <strong>{p.month}</strong>
                      <span>{fy}: {p.thisYear ?? "not yet"}</span>
                      <span>{prevFy}: {p.lastYear}</span>
                    </div>
                  </div>
                  <div className={p.thisYear === null ? "emx-trend-month is-future" : "emx-trend-month"}>
                    {p.month}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <details className="emx-trend-table">
            <summary>Show as table</summary>
            <table className="admin-table">
              <thead>
                <tr><th>Month</th><th>{fy}</th><th>{prevFy}</th></tr>
              </thead>
              <tbody>
                {t.months.map((p) => (
                  <tr key={p.month}>
                    <td>{p.month}</td>
                    <td className="admin-table-meta">{p.thisYear ?? "—"}</td>
                    <td className="admin-table-meta">{p.lastYear}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>

        <div className="emx-trend-side">
          <div className="emx-trend-card">
            <div className="emx-trend-title">Same point last year</div>
            <div className="emx-trend-sub">Up to {t.asOf}, {fy} against {prevFy}</div>
            <ul className="emx-ytd">
              {t.ytd.map((c) => (
                <li key={c.label}>
                  <span className="emx-ytd-label">{c.label}</span>
                  <span className="emx-ytd-vals">
                    <strong>{c.thisYear.toLocaleString("en-US")}</strong>
                    <span className="emx-ytd-was">vs {c.lastYear.toLocaleString("en-US")}</span>
                    {c.pct !== null && (
                      <span className={`emx-ytd-chip ${c.pct > 0 ? "is-up" : c.pct < 0 ? "is-down" : ""}`}>
                        {c.pct > 0 ? "▲ +" : c.pct < 0 ? "▼ " : ""}
                        {c.pct}%
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="emx-trend-card">
            <div className="emx-trend-title">Highlights</div>
            <ul className="emx-highlights">
              {t.biggest && (
                <li>
                  <span className="emx-hl-label">Biggest event</span>
                  <Link href={`/board/events/${t.biggest.id}`} className="emx-hl-val">
                    {t.biggest.title}
                  </Link>
                  <span className="emx-hl-note">{t.biggest.registered} registered</span>
                </li>
              )}
              {t.topRated && (
                <li>
                  <span className="emx-hl-label">Top rated</span>
                  <Link href={`/board/events/${t.topRated.id}`} className="emx-hl-val">
                    {t.topRated.title}
                  </Link>
                  <span className="emx-hl-note">
                    {t.topRated.rating.toFixed(1)} / 5 from {t.topRated.responses} ratings
                  </span>
                </li>
              )}
              {t.busiestMonth && (
                <li>
                  <span className="emx-hl-label">Busiest month</span>
                  <span className="emx-hl-val">{t.busiestMonth.month}</span>
                  <span className="emx-hl-note">{t.busiestMonth.registered} registrations</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
      <p className="emx-trend-foot">
        Ratings are not compared: last year&apos;s survey asked a different question.
      </p>
    </section>
  );
}

function Stat({
  label,
  value,
  note,
  delta: d,
  deltaMode = "pct",
}: {
  label: string;
  value: ReactNode;
  note?: string;
  delta?: KpiDelta;
  deltaMode?: "pct" | "abs";
}) {
  return (
    <div className="emx-stat">
      <div className="emx-stat-label">{label}</div>
      <div className="emx-stat-val">
        {value}
        {d && <DeltaChip d={d} mode={deltaMode} />}
      </div>
      {note && <div className="emx-stat-note">{note}</div>}
    </div>
  );
}

export default async function EventPerformancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { fy } = await searchParams;
  const years = await listFiscalYears();
  const requested = fy ? Number(fy) : NaN;
  const selected = Number.isInteger(requested) ? requested : currentFyStart();
  // The selected year must be selectable even if it has no events yet.
  const options = Array.from(new Set([selected, ...years])).sort((a, b) => b - a);

  const [m, prev, reach] = await Promise.all([
    getEventMetricsForFY(selected),
    getEventMetricsForFY(selected - 1),
    getMemberReachForFY(selected),
  ]);
  const ratedEvents = m.rows.filter((r) => r.eventValueResponses > 0).length;

  // Year-over-year comparison. Only meaningful when the prior FY actually held
  // events; otherwise the chips would read as a bogus +100%.
  const selectedFyIsComplete = selected < currentFyStart();
  const fyEndMs = new Date(`${selected + 1}-07-01T00:00:00+07:00`).getTime() - 1;
  const listEvent = (e: { id: string; title: string; startsAt: string; endsAt?: string | null; type: EventType }): ListEvent => {
    const date = formatEventDate(e.startsAt, e.endsAt ?? null);
    return {
      id: e.id,
      title: e.title,
      day: date.day,
      month: date.month,
      dateLabel: date.full,
      typeLabel: eventTypeLabel(e.type),
      typeColor: EVENT_TYPE_COLOR[e.type],
    };
  };
  const upcomingList: ListEvent[] = [
    ...m.ongoingRows.map((e) => ({ ...listEvent(e), happeningNow: true })),
    ...m.upcomingRows.map(listEvent),
  ];
  const pastList: PastEvent[] = m.rows.map((r) => {
    const usd = usdTotal(r.revenueTotals);
    const legacy = r.eventValueRating === null && r.growthRating !== null;
    return {
      ...listEvent(r),
      registered: r.registered,
      checkedIn: r.checkedIn,
      revenue: usd > 0 ? formatUsd(usd) : null,
      rating: r.eventValueRating !== null
        ? r.eventValueRating.toFixed(1)
        : legacy
          ? (r.growthRating as number).toFixed(1)
          : null,
      ratingNote: r.eventValueRating !== null
        ? `${r.eventValueResponses} ${r.eventValueResponses === 1 ? "rating" : "ratings"}`
        : legacy
          ? "old survey"
          : null,
      surveyEnabled: r.surveyEnabled,
    };
  });
  const trends = buildEventTrends(m.rows, prev.rows, new Date(Math.min(requestTimestamp(), fyEndMs)));
  const hasPrior = selectedFyIsComplete && prev.held > 0;
  const d = {
    held: delta(m.held, prev.held),
    registrations: delta(m.registrations, prev.registrations),
    checkedIn: delta(m.checkedIn, prev.checkedIn),
    avgEventValue: delta(m.avgEventValue, prev.avgEventValue),
  };

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-breadcrumb">
          <Link href="/board/events">Events</Link>
          <span>/</span>
          <span>Performance</span>
        </div>
        <h1 className="admin-page-title">Event Performance</h1>
        <p className="admin-page-sub">
          Completed and past event results for {fyLabel(selected)} ({fyWindowText(selected)}),
          with ongoing and upcoming events reported separately. Pulled from the
          events calendar, registrations, payments, and survey responses
        </p>
        <FiscalYearSelect options={options} selected={selected} />
      </div>

      <p className="admin-section-desc" style={{ marginBottom: 16 }}>
        {!selectedFyIsComplete
          ? "Year-over-year change appears after the selected fiscal year closes"
          : hasPrior
          ? `Change shown against ${fyLabel(selected - 1)}`
          : `No ${fyLabel(selected - 1)} events to compare against yet`}
      </p>

      <section className="emx-hero" aria-label="Headline metrics">
        <div className="emx-hero-stat">
          <div className="emx-hero-label">Members at {reach.threshold}+ EO events</div>
          <div className="emx-hero-val">
            {reach.pct !== null ? reach.pct : "–"}
            {reach.pct !== null && <span className="emx-hero-unit">%</span>}
          </div>
          <div className="emx-hero-track">
            <div className="emx-hero-fill" style={{ width: `${reach.pct ?? 0}%` }} />
          </div>
          <div className="emx-hero-note">
            {reach.reached} of {reach.activeMembers} active members this fiscal year
          </div>
        </div>
        <div className="emx-hero-stat">
          <div className="emx-hero-label">Average event rating</div>
          <div className="emx-hero-val">
            {m.avgEventValue !== null ? m.avgEventValue.toFixed(1) : "–"}
            <span className="emx-hero-unit"> / 5</span>
            {hasPrior && d.avgEventValue && <DeltaChip d={d.avgEventValue} mode="abs" />}
          </div>
          <div className="emx-hero-track">
            <div
              className="emx-hero-fill"
              style={{
                width: `${m.avgEventValue !== null ? ((m.avgEventValue - 1) / 4) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="emx-hero-note">
            {m.eventValueResponses
              ? `${m.eventValueResponses} ratings across ${ratedEvents} ${ratedEvents === 1 ? "event" : "events"}`
              : "No ratings yet"}
          </div>
        </div>
      </section>

      <div className="emx-strip">
        <Stat label="Events held" value={String(m.held)} delta={hasPrior ? d.held : undefined} deltaMode="abs" />
        <Stat
          label="Registrations"
          value={m.registrations.toLocaleString("en-US")}
          delta={hasPrior ? d.registrations : undefined}
        />
        <Stat
          label="Checked in"
          value={m.checkedIn.toLocaleString("en-US")}
          note={m.attendanceRate !== null ? `${m.attendanceRate}% attendance` : undefined}
          delta={hasPrior ? d.checkedIn : undefined}
        />
        <Stat label="No-shows" value={String(m.noShows)} />
        <Stat
          label="Revenue"
          value={
            <span
              title={
                CHAPTER_LOCAL_CURRENCY && m.revenueTotals.some((t) => t.currency.toUpperCase() === CHAPTER_LOCAL_CURRENCY)
                  ? `${formatUsd(usdTotal(m.revenueTotals))}, ${CHAPTER_LOCAL_CURRENCY} converted at ${CHAPTER_LOCAL_PER_USD.toLocaleString("en-US")} per US dollar`
                  : formatUsd(usdTotal(m.revenueTotals))
              }
            >
              {formatUsd(usdTotal(m.revenueTotals), true)}
            </span>
          }
          note={`${m.paidEvents} paid · ${m.freeEvents} free`}
        />
        {m.growthResponses > 0 && (
          <Stat
            label="Historical growth"
            value={m.avgGrowthRating !== null ? `${m.avgGrowthRating} / 5` : "N/A"}
            note={`${m.growthResponses} legacy responses`}
          />
        )}
      </div>

      <TrendsSection t={trends} fy={fyLabel(selected)} prevFy={fyLabel(selected - 1)} />

      {m.ratingsByType.length > 0 && (
        <section className="emx-section">
          <h2 className="emx-h2">Event rating by type</h2>
          <p className="admin-section-desc" style={{ marginBottom: 14 }}>
            Chapter events held this year, rated 1 to 5 in the post-event
            survey. Each rated event counts equally.
          </p>
          <div className="emx-rating-cards">
            {m.ratingsByType.map((t) => {
              const goal = RATING_GOALS[t.type];
              const color = EVENT_TYPE_COLOR[t.type];
              const onGoal = goal !== undefined && t.avgRating !== null && t.avgRating >= goal;
              return (
                <div
                  key={t.type}
                  className="emx-rating-card"
                  style={{ borderTopColor: color }}
                >
                  <div className="emx-kpi-label">{t.label}</div>
                  {t.avgRating !== null ? (
                    <div className="emx-rating-val">
                      {t.avgRating.toFixed(2)}
                      <span className="emx-kpi-unit"> / 5</span>
                    </div>
                  ) : (
                    <div className="emx-rating-val is-empty">No ratings yet</div>
                  )}
                  <RatingMeter rating={t.avgRating} goal={goal} color={color} />
                  <div className="emx-kpi-note">
                    {t.ratedEvents} of {t.chapterEvents} events rated
                    {t.responses > 0 && ` · ${t.responses} ratings`}
                  </div>
                  {goal !== undefined && t.avgRating !== null && (
                    <div className={`emx-rating-status ${onGoal ? "is-on" : "is-below"}`}>
                      {onGoal
                        ? `At or above the ${goal} goal`
                        : `${(goal - t.avgRating).toFixed(2)} below the ${goal} goal`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <EventLists upcoming={upcomingList} past={pastList} />
    </div>
  );
}
