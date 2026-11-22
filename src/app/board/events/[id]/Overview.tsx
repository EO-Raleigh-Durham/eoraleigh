import type { EventRow, EventRegistration, RegistrationStatus } from "@/lib/events";
import { QuickActions } from "./QuickActions";
import { QrActions } from "./QrActions";
import { TabLink, type TabKey } from "./EventTabs";

export type EventStats = {
  registered: number; // confirmed seats (registered + attended)
  capacity: number | null;
  checkedIn: number; // attended
  waitlisted: number;
  guests: number; // sum of guest_count on confirmed seats
  responses: number;
  avgFeedback: number | null;
  feedbackLabel: string;
  feedbackNote: string;
  revenueUsd: number;
  paid: number;
  due: number;
  isPaidEvent: boolean;
};

const SNAPSHOT_CHIP: Record<RegistrationStatus, { text: string; tone: string }> = {
  attended: { text: "checked in", tone: "ok" },
  registered: { text: "registered", tone: "neutral" },
  pending_payment: { text: "payment due", tone: "warn" },
  waitlisted: { text: "waitlist", tone: "warn" },
  no_show: { text: "no-show", tone: "muted" },
  cancelled: { text: "cancelled", tone: "muted" },
};

function Kpi({
  label,
  value,
  note,
  tab,
}: {
  label: string;
  value: string;
  note?: string;
  tab?: TabKey;
}) {
  const body = (
    <>
      <div className="emx-kpi-label">{label}</div>
      <div className="emx-kpi-val">{value}</div>
      {note && <div className="emx-kpi-note">{note}</div>}
    </>
  );
  if (tab) {
    return (
      <TabLink tab={tab} className="emx-kpi emx-kpi--link">
        {body}
      </TabLink>
    );
  }
  return <div className="emx-kpi">{body}</div>;
}

export function Overview({
  event,
  stats,
  registrations,
  registerUrl,
  surveyUrl,
  registerSvg,
  surveySvg,
  surveyLive,
}: {
  event: EventRow;
  stats: EventStats;
  registrations: EventRegistration[];
  registerUrl: string;
  surveyUrl: string;
  registerSvg: string;
  surveySvg: string | null;
  surveyLive: boolean;
}) {
  const capNote =
    stats.capacity !== null
      ? `${Math.max(0, stats.capacity - stats.registered)} seats left`
      : stats.waitlisted > 0
        ? `${stats.waitlisted} on waitlist`
        : "no cap set";

  // Roster snapshot: most recent non-cancelled registrations, a quick read
  // before opening the full People tab.
  const snapshot = registrations
    .filter((r) => r.status !== "cancelled")
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 6);

  return (
    <>
      <QuickActions
        eventId={event.id}
        status={event.status}
        capacity={event.capacity}
        surveyEnabled={event.survey_enabled}
      />

      <div className="emx-kpis" style={{ marginTop: 20 }}>
        <Kpi
          label="Registered"
          value={
            stats.capacity !== null
              ? `${stats.registered}/${stats.capacity}`
              : String(stats.registered)
          }
          note={capNote}
        />
        {stats.isPaidEvent && (
          <Kpi
            label="Paid"
            value={String(stats.paid)}
            note={stats.due > 0 ? `${stats.due} payment due` : "all settled"}
          />
        )}
        <Kpi
          label="Checked in"
          value={String(stats.checkedIn)}
          note={
            stats.registered > 0
              ? `${Math.round((stats.checkedIn / stats.registered) * 100)}% of registered`
              : undefined
          }
        />
        <Kpi
          label="Responses"
          value={String(stats.responses)}
          note={
            stats.registered > 0
              ? `${Math.round((stats.responses / stats.registered) * 100)}% response rate`
              : undefined
          }
          tab="feedback"
        />
        <Kpi
          label={stats.feedbackLabel}
          value={stats.avgFeedback !== null ? `${stats.avgFeedback}/5` : "—"}
          note={stats.feedbackNote}
        />
        {stats.isPaidEvent && (
          <Kpi label="Revenue" value={`$${stats.revenueUsd.toLocaleString()}`} note="collected" />
        )}
      </div>

      <div className="hub-overview-grid">
        <div className="hub-snapshot">
          <div className="hub-snapshot-head">
            <span className="hub-section-label">Roster snapshot</span>
            <TabLink tab="people" className="admin-link-action">
              View all {stats.registered + stats.waitlisted} →
            </TabLink>
          </div>
          {snapshot.length === 0 ? (
            <div className="admin-stub">No registrations yet.</div>
          ) : (
            <ul className="hub-snapshot-list">
              {snapshot.map((r) => {
                const chip = SNAPSHOT_CHIP[r.status];
                const name = r.person?.name || r.person?.email || "Guest";
                return (
                  <li key={r.id} className="hub-snapshot-row">
                    <span className="hub-snapshot-name">
                      {name}
                      {r.guest_count > 0 && (
                        <span className="hub-snapshot-guests"> +{r.guest_count}</span>
                      )}
                    </span>
                    <span className={`hub-chip hub-chip--${chip.tone}`}>{chip.text}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="hub-qr-row">
          <QrActions
            label="Register"
            url={registerUrl}
            svg={registerSvg}
            filename={`${event.slug ?? event.id}-register-qr.png`}
          />
          <QrActions
            label="Feedback"
            url={surveyUrl}
            svg={surveySvg}
            filename={`${event.slug ?? event.id}-feedback-qr.png`}
            disabled={!surveyLive}
            disabledNote={
              event.status === "draft"
                ? "Publish the event to open the survey"
                : "Turn Survey on (above) to share feedback"
            }
          />
        </div>
      </div>

      <div className="hub-comms-strip">
        <div>
          <span className="hub-section-label">Message participants</span>
          <p className="hub-comms-sub">
            Send a reminder, a logistics update, a survey nudge, or a thank-you to
            everyone registered.
          </p>
        </div>
        <TabLink tab="messages" className="admin-btn admin-btn--primary">
          Compose
        </TabLink>
      </div>
    </>
  );
}
