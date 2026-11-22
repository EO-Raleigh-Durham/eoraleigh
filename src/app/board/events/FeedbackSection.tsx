import type { EventFeedbackRow } from "@/lib/events";
import {
  getFeedbackRating,
  summarizeFeedbackRatings,
} from "@/lib/event-feedback";
import type { FeedbackTrendPoint } from "@/lib/event-metrics";
import { CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

type Props = {
  feedback: EventFeedbackRow[];
  trend: FeedbackTrendPoint[];
  eventId: string;
  surveySentAt?: string | null;
  surveySentCount?: number | null;
};

function avg(values: Array<number | null>): number | null {
  const n = values.filter((v): v is number => v !== null);
  if (n.length === 0) return null;
  return Math.round((n.reduce((a, b) => a + b, 0) / n.length) * 100) / 100;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: CHAPTER_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type TextField = "loved_text" | "improve_text" | "comments";

const SCORE_COLOR: Record<number, string> = {
  5: "var(--eo-green)",
  4: "var(--eo-green)",
  3: "var(--eo-yellow)",
  2: "var(--eo-pink)",
  1: "var(--eo-pink)",
};

function ScoreBreakdownCard({ scores }: { scores: number[] }) {
  const average =
    Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  const dist = [5, 4, 3, 2, 1].map((value) => ({
    value,
    count: scores.filter((s) => s === value).length,
  }));
  const max = Math.max(1, ...dist.map((d) => d.count));

  return (
    <div className="admin-card" style={{ cursor: "default" }}>
      <div className="admin-card-label">Score breakdown</div>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              lineHeight: 1.1,
              color: "var(--base-blue)",
            }}
          >
            {average}
          </div>
          <div className="admin-card-desc">out of 5</div>
          <div className="admin-card-desc">{scores.length} rated</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {dist.map((d) => (
            <div
              key={d.value}
              className="emx-bar-row"
              style={{ gridTemplateColumns: "28px 1fr 28px", gap: 8 }}
            >
              <div className="emx-bar-label">{d.value} ★</div>
              <div className="emx-bar-track" style={{ height: 10 }}>
                <div
                  className="emx-bar-fill"
                  style={{
                    width: d.count === 0 ? 0 : `${Math.max(5, (d.count / max) * 100)}%`,
                    background: SCORE_COLOR[d.value],
                  }}
                />
              </div>
              <div
                className="emx-bar-val"
                style={{ fontSize: 13, color: d.count === 0 ? "var(--text-muted)" : undefined }}
              >
                {d.count}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const trendDateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: CHAPTER_TIME_ZONE,
  month: "short",
  day: "numeric",
});

function TrendCard({ trend, eventId }: { trend: FeedbackTrendPoint[]; eventId: string }) {
  const W = 320;
  const H = 132;
  const padX = 24;
  const top = 18;
  const bottom = 26;
  const innerH = H - top - bottom;
  const x = (i: number) =>
    trend.length === 1 ? W / 2 : padX + (i / (trend.length - 1)) * (W - padX * 2);
  const y = (rating: number) => top + (1 - (rating - 1) / 4) * innerH;
  const line = trend.map((p, i) => `${x(i)},${y(p.rating)}`).join(" ");

  return (
    <div className="admin-card" style={{ cursor: "default" }}>
      <div className="admin-card-label">Trend · last {trend.length} events</div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label="Average score of recent events"
      >
        {[1, 2, 3, 4, 5].map((r) => (
          <line
            key={r}
            x1={padX - 8}
            x2={W - padX + 8}
            y1={y(r)}
            y2={y(r)}
            stroke="var(--ink-100)"
            strokeWidth={1}
          />
        ))}
        <polyline
          points={line}
          fill="none"
          stroke="var(--eo-blue)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {trend.map((p, i) => {
          const current = p.id === eventId;
          return (
            <g key={p.id}>
              <title>{`${p.title} · ${p.rating}/5 (${p.responses} responses)`}</title>
              <circle
                cx={x(i)}
                cy={y(p.rating)}
                r={current ? 5 : 3.5}
                fill={current ? "var(--eo-pink)" : "var(--eo-blue)"}
                stroke="#fff"
                strokeWidth={1.5}
              />
              <text
                x={x(i)}
                y={y(p.rating) - 9}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill={current ? "var(--eo-pink)" : "var(--base-blue)"}
              >
                {p.rating}
              </text>
              <text
                x={x(i)}
                y={H - 8}
                textAnchor="middle"
                fontSize={9}
                fill="var(--text-muted)"
                fontWeight={current ? 700 : 400}
              >
                {trendDateFmt.format(new Date(p.startsAt))}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="admin-card-desc" style={{ marginTop: 4 }}>
        Average survey score per event · this event in pink
      </div>
    </div>
  );
}

function FeedbackList({
  title,
  items,
  field,
}: {
  title: string;
  items: EventFeedbackRow[];
  field: TextField;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "var(--base-blue)",
          margin: "0 0 10px",
        }}
      >
        {title} ({items.length})
      </div>
      <div className="admin-list">
        {items.map((f) => {
          const rating = getFeedbackRating(f);
          return (
            <div
              key={f.id}
              className="admin-list-item"
              style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <div className="admin-list-item-name">
                  {f.person?.name ?? "Anonymous"}
                  {rating ? ` · ${rating.value}/5 ${rating.label.toLowerCase()}` : ""}
                </div>
                <div className="admin-list-item-meta">{formatDate(f.created_at)}</div>
              </div>
              <div className="admin-table-meta" style={{ fontStyle: "italic" }}>
                &ldquo;{f[field]}&rdquo;
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function surveySentNote(sentAt: string | null | undefined, count: number | null | undefined): string {
  if (!sentAt) {
    return "The survey email goes out automatically 1 hour after the event ends.";
  }
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: CHAPTER_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(sentAt));
  return `Survey emailed on ${day} to ${count ?? 0} ${count === 1 ? "person" : "people"}.`;
}

export function FeedbackSection({
  feedback,
  trend,
  eventId,
  surveySentAt,
  surveySentCount,
}: Props) {
  const ratings = summarizeFeedbackRatings(feedback);
  const scores = feedback
    .map((f) => getFeedbackRating(f)?.value)
    .filter((v): v is number => v !== undefined);
  const speaker = avg(feedback.map((f) => f.rating_speaker));
  const hasSpeaker = feedback.some((f) => f.rating_speaker !== null);
  const recommendAnswered = feedback.filter((f) => f.would_recommend !== null);
  const recommendCount = feedback.filter((f) => f.would_recommend).length;
  const recommendPct = recommendAnswered.length
    ? Math.round((recommendCount / recommendAnswered.length) * 100)
    : 0;

  const mostValuable = feedback.filter(
    (f) => f.event_value_rating !== null && (f.loved_text ?? "").trim(),
  );
  const whatPeopleLoved = feedback.filter(
    (f) => f.event_value_rating === null && (f.loved_text ?? "").trim(),
  );
  const improve = feedback.filter((f) => (f.improve_text ?? "").trim());
  const comments = feedback.filter((f) => (f.comments ?? "").trim());

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2 className="admin-section-h2">Survey results ({feedback.length})</h2>
      </div>
      <p className="admin-table-meta">{surveySentNote(surveySentAt, surveySentCount)}</p>

      {feedback.length === 0 ? (
        <div className="admin-stub">
          No responses yet. Once attendees fill out the 3-question post-event
          survey, results land here.
        </div>
      ) : (
        <>
          {(scores.length > 0 || trend.length > 1) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 16,
                marginBottom: 16,
              }}
            >
              {scores.length > 0 && <ScoreBreakdownCard scores={scores} />}
              {trend.length > 1 && <TrendCard trend={trend} eventId={eventId} />}
            </div>
          )}

          <div className="admin-card-grid" style={{ marginBottom: 24 }}>
            {ratings.eventValue.responses > 0 && (
              <div className="admin-card" style={{ cursor: "default" }}>
                <div className="admin-card-label">Event value</div>
                <div className="admin-card-title">
                  {ratings.eventValue.average ?? "—"} / 5
                </div>
                <div className="admin-card-desc">
                  Overall value to the attendee · {ratings.eventValue.responses} responses
                </div>
              </div>
            )}
            {ratings.growth.responses > 0 && (
              <div className="admin-card" style={{ cursor: "default" }}>
                <div className="admin-card-label">Historical growth rating</div>
                <div className="admin-card-title">{ratings.growth.average ?? "—"} / 5</div>
                <div className="admin-card-desc">
                  Legacy personal-impact question · {ratings.growth.responses} responses
                </div>
              </div>
            )}
            {hasSpeaker && (
              <div className="admin-card" style={{ cursor: "default" }}>
                <div className="admin-card-label">Speaker rating</div>
                <div className="admin-card-title">{speaker ?? "—"} / 5</div>
                <div className="admin-card-desc">Where speaker was rated</div>
              </div>
            )}
            {recommendAnswered.length > 0 && (
              <div className="admin-card" style={{ cursor: "default" }}>
                <div className="admin-card-label">Would recommend</div>
                <div className="admin-card-title">{recommendPct}%</div>
                <div className="admin-card-desc">
                  {recommendCount} of {recommendAnswered.length} said yes
                </div>
              </div>
            )}
          </div>

          {mostValuable.length > 0 && (
            <FeedbackList
              title="Most valuable parts"
              items={mostValuable}
              field="loved_text"
            />
          )}
          {whatPeopleLoved.length > 0 && (
            <FeedbackList
              title="What people loved"
              items={whatPeopleLoved}
              field="loved_text"
            />
          )}
          {improve.length > 0 && (
            <FeedbackList title="What to improve" items={improve} field="improve_text" />
          )}
          {comments.length > 0 && (
            <FeedbackList title="Other comments" items={comments} field="comments" />
          )}
        </>
      )}
    </section>
  );
}
