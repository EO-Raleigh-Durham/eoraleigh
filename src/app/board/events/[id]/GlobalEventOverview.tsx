import Link from "next/link";
import type {
  GlobalEventParticipant,
  GlobalEventParticipationCounts,
} from "@/lib/global-event-participation";
import type { EventRow } from "@/lib/events";
import { TabLink } from "./EventTabs";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

function SummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <article className="global-cohort-summary-card">
      <span className="global-cohort-summary-label">{label}</span>
      <strong className="global-cohort-summary-value">{value}</strong>
      <span className="global-cohort-summary-note">{note}</span>
    </article>
  );
}

export function GlobalEventOverview({
  event,
  participants,
  counts,
  available,
}: {
  event: EventRow;
  participants: GlobalEventParticipant[];
  counts: GlobalEventParticipationCounts;
  available: boolean;
}) {
  const preview = participants.slice(0, 6);

  return (
    <div className="global-event-overview">
      <section className="global-event-context" aria-labelledby="global-event-context-title">
        <div>
          <span className="hub-section-label">Externally managed EO event</span>
          <h2 id="global-event-context-title">{CHAPTER_NAME} participation context</h2>
          <p>
            Track chapter members for coordination and confirmed engagement here. EO remains
            responsible for registration, payment, and event access.
          </p>
        </div>
        {event.cta_href && (
          <Link
            href={event.cta_href}
            className="admin-btn admin-btn--primary"
            target="_blank"
            rel="noreferrer"
          >
            {event.cta_label || "Open EO event page"}
          </Link>
        )}
      </section>

      {!available ? (
        <div className="admin-banner admin-banner--warn" role="status">
          Cohort tracking is temporarily unavailable. Event settings remain available.
        </div>
      ) : (
        <>
          <div className="global-cohort-summary" aria-label={`${CHAPTER_NAME} cohort summary`}>
            <SummaryCard
              label="Going"
              value={counts.going}
              note="Coordination signal only"
            />
            <SummaryCard
              label="Attended"
              value={counts.attended}
              note="Confirmed engagement"
            />
          </div>

          <section className="hub-snapshot" aria-labelledby="global-cohort-preview-title">
            <div className="hub-snapshot-head">
              <span id="global-cohort-preview-title" className="hub-section-label">
                {CHAPTER_NAME} cohort
              </span>
              <TabLink tab="people" className="admin-link-action">
                Manage people
              </TabLink>
            </div>
            {preview.length === 0 ? (
              <div className="admin-stub global-cohort-empty">
                <strong>No {CHAPTER_NAME} members are tracked yet</strong>
                <TabLink tab="people" className="admin-btn admin-btn--primary">
                  Add members
                </TabLink>
              </div>
            ) : (
              <ul className="hub-snapshot-list">
                {preview.map((participant) => (
                  <li key={participant.id} className="hub-snapshot-row">
                    <span className="hub-snapshot-name">{participant.name}</span>
                    <span
                      className={`hub-chip ${
                        participant.status === "attended"
                          ? "hub-chip--ok"
                          : "hub-chip--neutral"
                      }`}
                    >
                      {participant.status === "attended" ? "Attended" : "Going"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="global-cohort-truth-note">
            Statuses change only through an explicit board action. Event time never changes
            Going to Attended automatically.
          </p>
        </>
      )}
    </div>
  );
}
