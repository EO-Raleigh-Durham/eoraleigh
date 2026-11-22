"use client";

import { useState } from "react";
import Link from "next/link";
import "./pulse.css";
import type { PulseDashboardData, PulsePeriodStats, PulseQuote, PulseRange } from "@/lib/pulse";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

type View = "current" | "alltime" | "trends";

const RANGE_OPTIONS: Array<{ value: PulseRange; label: string }> = [
  { value: "all", label: "All time" },
  { value: "fy", label: "This fiscal year" },
  { value: "last-fy", label: "Last fiscal year" },
  { value: "12m", label: "Rolling 12 months" },
];

type Props = {
  data: PulseDashboardData;
};

// ============================================================
// Static labels and helpers
// ============================================================

const TOPIC_DISPLAY_ORDER = [
  "Leadership",
  "Scaling my business",
  "Financial Management",
  "Technology and AI",
  "Company Culture",
  "Mindfulness",
  "Personal Health",
  "Family Office",
  "Travel & Leisure",
  "Other",
];

// Rating bars run blue (high) -> neutral -> pink (low), matching the admin palette.
function toneForBar(stars: number): React.CSSProperties {
  if (stars === 5) return { background: "var(--p-blue)" };
  if (stars === 4) return { background: "var(--p-blue-soft)" };
  if (stars === 3) return { background: "#C2C9D2" };
  if (stars === 2) return { background: "var(--p-pink-soft)" };
  return { background: "var(--p-pink)" };
}

// Priority bars are a single blue, fading by rank so the top priority reads strongest.
function toneForGoal(idx: number): React.CSSProperties {
  return { background: "var(--p-blue)", opacity: Math.max(0.4, 1 - idx * 0.1) };
}

function pctCellClass(value: number): string {
  if (value >= 50) return "pulse-cell-hot";
  if (value >= 30) return "pulse-cell-warm";
  if (value >= 10) return "pulse-cell-neutral";
  return "pulse-cell-cool";
}

function arrowFor(deltaPct: number) {
  if (deltaPct >= 30) return <span className="pulse-trend-arrow pulse-arrow-up">▲▲▲</span>;
  if (deltaPct >= 15) return <span className="pulse-trend-arrow pulse-arrow-up">▲▲</span>;
  if (deltaPct >= 5) return <span className="pulse-trend-arrow pulse-arrow-up">▲</span>;
  if (deltaPct <= -30) return <span className="pulse-trend-arrow pulse-arrow-down">▼▼▼</span>;
  if (deltaPct <= -15) return <span className="pulse-trend-arrow pulse-arrow-down">▼▼</span>;
  if (deltaPct <= -5) return <span className="pulse-trend-arrow pulse-arrow-down">▼</span>;
  return <span className="pulse-trend-arrow" style={{ color: "var(--p-faint)" }}>—</span>;
}

function Stars({ n }: { n: number }) {
  return <div className="pulse-quote-stars">{"★".repeat(n) + "☆".repeat(5 - n)}</div>;
}

// ============================================================
// Reusable subcomponents
// ============================================================

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="pulse-kpi">
      <div className="pulse-kpi-label">{label}</div>
      <div className="pulse-kpi-val">{value}</div>
      {note && <div className="pulse-kpi-note">{note}</div>}
    </div>
  );
}

function RatingBars({ stats }: { stats: PulsePeriodStats }) {
  return (
    <div className="pulse-bars">
      {[5, 4, 3, 2, 1].map((stars) => {
        const pct = stats.starPct[stars as 1 | 2 | 3 | 4 | 5];
        return (
          <div key={stars} className="pulse-bar-row">
            <div className="pulse-bar-label">{stars} ★</div>
            <div className="pulse-bar-track">
              <div className="pulse-bar-fill" style={{ ...toneForBar(stars), width: `${pct}%` }} />
            </div>
            <div className="pulse-bar-pct">{Math.round(pct)}%</div>
          </div>
        );
      })}
    </div>
  );
}

function GoalBars({ stats }: { stats: PulsePeriodStats }) {
  // Filter out "Other" (a fallback bucket) and order by display order
  const ordered = TOPIC_DISPLAY_ORDER
    .map((label) => stats.topicPct.find((t) => t.topic === label))
    .filter((t): t is { topic: string; pct: number } => !!t && t.topic !== "Other" && t.pct > 0);

  // Sort highest first within the displayed set
  ordered.sort((a, b) => b.pct - a.pct);

  return (
    <div className="pulse-goals">
      {ordered.map((g, i) => (
        <div key={g.topic} className="pulse-goal-row">
          <div className="pulse-goal-name">{g.topic}</div>
          <div className="pulse-goal-track">
            <div className="pulse-goal-fill" style={{ ...toneForGoal(i), width: `${g.pct}%` }} />
          </div>
          <div className="pulse-goal-pct">{g.pct}%</div>
        </div>
      ))}
    </div>
  );
}

function QuoteCard({ q }: { q: PulseQuote }) {
  return (
    <div className={`pulse-quote-card ${q.featured ? "pulse-quote-featured" : ""}`.trim()}>
      <div className="pulse-quote-theme">{q.topics[0] ?? "Member voice"}</div>
      <div className="pulse-quote-text">&ldquo;{q.comment}&rdquo;</div>
      <Stars n={q.rating} />
    </div>
  );
}

// ============================================================
// Views
// ============================================================

function CurrentView({ data }: { data: PulseDashboardData }) {
  const s = data.current;
  return (
    <div>
      <div className="pulse-kpis">
        <Kpi label="Avg rating" value={s.avgRating.toFixed(1)} note="out of 5" />
        <Kpi label="Responses" value={String(s.responses)} note={s.label} />
        <Kpi label="Rated 4-5 stars" value={`${s.highSatPct}%`} note="high satisfaction" />
        <Kpi label="Perfect 5 stars" value={`${s.perfectPct}%`} />
      </div>

      <section style={{ marginTop: 36 }}>
        <h2 className="admin-section-title">Rating breakdown</h2>
        <p className="admin-section-desc">
          {s.highSatPct}% of respondents in {s.label} rated their transformational growth at 4 or 5 stars
        </p>
        <div className="pulse-rating-layout">
          <RatingBars stats={s} />
          <div className="pulse-rating-summary">
            <div className="pulse-big-rating">{s.avgRating.toFixed(1)}<span>/5</span></div>
            <div className="pulse-big-rating-label">Average rating this quarter</div>
            <div className="pulse-mini-metrics">
              <div className="pulse-mini"><div className="pulse-mini-val">{s.responses}</div><div className="pulse-mini-label">Responses</div></div>
              <div className="pulse-mini"><div className="pulse-mini-val">{s.highSatPct}%</div><div className="pulse-mini-label">High satisfaction</div></div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 className="admin-section-title">Member voices</h2>
        <p className="admin-section-desc">Direct from {CHAPTER_NAME} members this quarter, in their words</p>
        <div className="pulse-quote-grid">
          {data.currentQuotes.map((q, i) => (
            <QuoteCard key={i} q={q} />
          ))}
        </div>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 className="admin-section-title">What members want next</h2>
        <p className="admin-section-desc">Where members say they want EO to help them grow this quarter</p>
        <GoalBars stats={s} />
      </section>
    </div>
  );
}

function AllTimeView({ data }: { data: PulseDashboardData }) {
  const s = data.allTime;
  const waves = data.byPeriod.filter((p) => p.responses > 0).length;
  return (
    <div>
      <div className="pulse-kpis">
        <Kpi label="Avg rating" value={s.avgRating.toFixed(2)} note="out of 5" />
        <Kpi label="Total responses" value={String(s.responses)} note={`${data.uniqueRespondents} unique members`} />
        <Kpi label="Rated 4-5 stars" value={`${s.highSatPct}%`} note="high satisfaction" />
        <Kpi label="Perfect 5 stars" value={`${s.perfectPct}%`} />
      </div>

      <section style={{ marginTop: 36 }}>
        <h2 className="admin-section-title">Rating breakdown</h2>
        <p className="admin-section-desc">
          Across all survey waves, {s.highSatPct}% of {CHAPTER_NAME} members report strong transformational growth
        </p>
        <div className="pulse-rating-layout">
          <RatingBars stats={s} />
          <div className="pulse-rating-summary">
            <div className="pulse-big-rating">{s.avgRating.toFixed(2)}<span>/5</span></div>
            <div className="pulse-big-rating-label">{s.label} average</div>
            <div className="pulse-mini-metrics">
              <div className="pulse-mini"><div className="pulse-mini-val">{data.uniqueRespondents}</div><div className="pulse-mini-label">Unique members</div></div>
              <div className="pulse-mini"><div className="pulse-mini-val">{s.responses}</div><div className="pulse-mini-label">Total responses</div></div>
              <div className="pulse-mini"><div className="pulse-mini-val">{s.highSatPct}%</div><div className="pulse-mini-label">High satisfaction</div></div>
              <div className="pulse-mini"><div className="pulse-mini-val">{waves}</div><div className="pulse-mini-label">Survey waves</div></div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 className="admin-section-title">Member voices</h2>
        <p className="admin-section-desc">The most impactful testimonials from across the entire survey period</p>
        <div className="pulse-quote-grid">
          {data.allTimeQuotes.map((q, i) => (
            <QuoteCard key={i} q={q} />
          ))}
        </div>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 className="admin-section-title">Where members want to grow</h2>
        <p className="admin-section-desc">Topics members consistently flag as their growth focus, all time</p>
        <GoalBars stats={s} />
      </section>
    </div>
  );
}

function TrendsView({ data }: { data: PulseDashboardData }) {
  const periods = data.byPeriod;
  const activeWaves = periods.filter((p) => p.responses > 0).length;
  const allTopics = Array.from(
    new Set(periods.flatMap((p) => p.topicPct.map((t) => t.topic))),
  ).filter((t) => t !== "Other");

  // Build a topic-by-period table
  const topicMatrix = allTopics
    .map((topic) => ({
      topic,
      cells: periods.map((p) => p.topicPct.find((t) => t.topic === topic)?.pct ?? 0),
    }))
    .filter((row) => row.cells.some((v) => v > 0))
    .sort((a, b) => Math.max(...b.cells) - Math.max(...a.cells));

  // Y mapping for charts: avg rating 3.0 -> y=200, 5.0 -> y=20 (linear)
  const ratingY = (rating: number) => 200 - (rating - 3) * 90;
  // Y mapping for high sat: 50 -> 200, 100 -> 20
  const satY = (pct: number) => 200 - (pct - 50) * 3.6;

  // X positions for 4 datapoints
  const xs = [160, 320, 480, 640];

  return (
    <div>
      <div className="pulse-period-cards">
        {periods.map((p, i) => (
          <div key={p.label} className={`pulse-period-card ${["is-blue", "is-teal", "is-pink", "is-blue"][i] ?? "is-blue"}`}>
            <div className="pulse-period-label">{p.label}</div>
            <div className="pulse-period-avg">{p.avgRating.toFixed(2)}<span>/5</span></div>
            <div className="pulse-period-meta">{p.responses} responses, {p.highSatPct}% high satisfaction, {p.perfectPct}% perfect scores</div>
          </div>
        ))}
      </div>

      <section style={{ marginTop: 8 }}>
        <h2 className="admin-section-title">Satisfaction over time</h2>
        <p className="admin-section-desc">
          How {CHAPTER_NAME}&apos;s growth sentiment and priorities have evolved across {activeWaves} survey waves
        </p>

        <div className="pulse-chart-block">
          <div className="pulse-chart-title">Average rating over time</div>
          <div className="pulse-chart-sub">Average member-rated transformational growth across {activeWaves} waves</div>
          <svg className="pulse-chart-svg" viewBox="0 0 700 240">
            <line x1="80" y1="20" x2="80" y2="200" stroke="var(--p-border)" strokeWidth="1" />
            <line x1="80" y1="200" x2="660" y2="200" stroke="var(--p-border)" strokeWidth="1" />
            <line x1="80" y1="110" x2="660" y2="110" stroke="var(--p-border)" strokeWidth="0.5" strokeDasharray="4" />
            <line x1="80" y1="20" x2="660" y2="20" stroke="var(--p-border)" strokeWidth="0.5" strokeDasharray="4" />
            <text x="70" y="205" textAnchor="end" fontSize="11" fill="var(--p-muted)">3.0</text>
            <text x="70" y="115" textAnchor="end" fontSize="11" fill="var(--p-muted)">4.0</text>
            <text x="70" y="25" textAnchor="end" fontSize="11" fill="var(--p-muted)">5.0</text>
            {periods.map((p, i) => (
              <text key={`x-${p.label}`} x={xs[i]} y="225" textAnchor="middle" fontSize="12" fill="var(--p-muted)">{p.label}</text>
            ))}
            <polyline
              points={periods.map((p, i) => `${xs[i]},${ratingY(p.avgRating)}`).join(" ")}
              fill="none"
              stroke="var(--p-blue)"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {periods.map((p, i) => (
              <g key={`pt-${p.label}`}>
                <circle cx={xs[i]} cy={ratingY(p.avgRating)} r="6" fill="var(--p-blue)" />
                <text x={xs[i]} y={ratingY(p.avgRating) - 12} textAnchor="middle" fontWeight="700" fontSize="14" fill="var(--p-navy)">{p.avgRating.toFixed(2)}</text>
              </g>
            ))}
          </svg>
        </div>

        <div className="pulse-chart-block">
          <div className="pulse-chart-title">High satisfaction rate (4-5 stars)</div>
          <div className="pulse-chart-sub">Share of responses rated 4 or 5 stars in each wave</div>
          <svg className="pulse-chart-svg" viewBox="0 0 700 240">
            <line x1="80" y1="20" x2="80" y2="200" stroke="var(--p-border)" strokeWidth="1" />
            <line x1="80" y1="200" x2="660" y2="200" stroke="var(--p-border)" strokeWidth="1" />
            <line x1="80" y1="110" x2="660" y2="110" stroke="var(--p-border)" strokeWidth="0.5" strokeDasharray="4" />
            <line x1="80" y1="20" x2="660" y2="20" stroke="var(--p-border)" strokeWidth="0.5" strokeDasharray="4" />
            <text x="70" y="205" textAnchor="end" fontSize="11" fill="var(--p-muted)">50%</text>
            <text x="70" y="115" textAnchor="end" fontSize="11" fill="var(--p-muted)">75%</text>
            <text x="70" y="25" textAnchor="end" fontSize="11" fill="var(--p-muted)">100%</text>
            {periods.map((p, i) => (
              <text key={`x-${p.label}`} x={xs[i]} y="225" textAnchor="middle" fontSize="12" fill="var(--p-muted)">{p.label}</text>
            ))}
            <polyline
              points={periods.map((p, i) => `${xs[i]},${satY(p.highSatPct)}`).join(" ")}
              fill="none"
              stroke="var(--p-teal)"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {periods.map((p, i) => (
              <g key={`pt-${p.label}`}>
                <circle cx={xs[i]} cy={satY(p.highSatPct)} r="6" fill="var(--p-teal)" />
                <text x={xs[i]} y={satY(p.highSatPct) - 12} textAnchor="middle" fontWeight="700" fontSize="14" fill="var(--p-navy)">{p.highSatPct}%</text>
              </g>
            ))}
          </svg>
        </div>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 className="admin-section-title">Priority shifts by quarter</h2>
        <p className="admin-section-desc">
          How member growth priorities evolved across waves. Stronger blue indicates higher demand
        </p>
        <div className="admin-table-wrap">
          <table className="pulse-trend-table">
            <thead>
              <tr>
                <th>Goal</th>
                {periods.map((p) => <th key={p.label}>{p.label}</th>)}
                <th>Direction</th>
              </tr>
            </thead>
            <tbody>
              {topicMatrix.map((row) => {
                const first = row.cells[0];
                const last = row.cells[row.cells.length - 1];
                return (
                  <tr key={row.topic}>
                    <td>{row.topic}</td>
                    {row.cells.map((v, i) => (
                      <td key={i}><span className={`pulse-cell-badge ${pctCellClass(v)}`}>{v}%</span></td>
                    ))}
                    <td>{arrowFor(last - first)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ============================================================
// Top-level dashboard component
// ============================================================

export function PulseDashboard({ data }: Props) {
  const [view, setView] = useState<View>("current");
  const waves = data.byPeriod.filter((p) => p.responses > 0).length;

  return (
    <div className="pulse">
      <div className="admin-page-head">
        <div className="admin-breadcrumb">
          <Link href="/board/chapter-dashboard">Chapter Dashboard</Link>
          <span>/</span>
          <span>Member Engagement</span>
        </div>
        <h1 className="admin-page-title">Transformational Growth Pulse</h1>
        <p className="admin-page-sub">
          Member-reported transformational growth, live from {data.allTime.responses} survey responses
          across {waves} {waves === 1 ? "wave" : "waves"} ({data.uniqueRespondents} unique members)
        </p>
      </div>

      <nav className="pulse-range">
        <span className="pulse-range-label">Period</span>
        {RANGE_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={opt.value === "all" ? "?" : `?range=${opt.value}`}
            className={`pulse-range-link ${data.range === opt.value ? "is-active" : ""}`.trim()}
          >
            {opt.label}
          </Link>
        ))}
      </nav>

      <nav className="pulse-tabs">
        <button
          type="button"
          className={`pulse-tab ${view === "current" ? "is-active" : ""}`.trim()}
          onClick={() => setView("current")}
        >
          Current quarter
        </button>
        <button
          type="button"
          className={`pulse-tab ${view === "alltime" ? "is-active" : ""}`.trim()}
          onClick={() => setView("alltime")}
        >
          {data.range === "all" ? "All time" : data.rangeLabel}
        </button>
        <button
          type="button"
          className={`pulse-tab ${view === "trends" ? "is-active" : ""}`.trim()}
          onClick={() => setView("trends")}
        >
          Trends
        </button>
      </nav>

      {view === "current" && <CurrentView data={data} />}
      {view === "alltime" && <AllTimeView data={data} />}
      {view === "trends" && <TrendsView data={data} />}

      <p className="pulse-foot">
        Live from chapter survey responses. {data.allTime.responses} responses from {data.uniqueRespondents} unique
        members across {waves} {waves === 1 ? "wave" : "waves"}.
      </p>
    </div>
  );
}
