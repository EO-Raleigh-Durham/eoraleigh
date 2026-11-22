"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addGlobalEventParticipants,
  removeGlobalEventParticipant,
  updateGlobalEventParticipant,
} from "../actions";
import type {
  GlobalEventParticipant,
  GlobalEventParticipationCandidate,
  GlobalEventParticipationCounts,
  GlobalEventParticipationStatus,
} from "@/lib/global-event-participation";
import { CHAPTER_NAME, CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

type Feedback = { tone: "ok" | "warn" | "error"; message: string } | null;

const STATUS_LABEL: Record<GlobalEventParticipationStatus, string> = {
  going: "Going",
  attended: "Attended",
};

export function GlobalEventCohort({
  eventId,
  eventStartsAt,
  canMarkAttended,
  participants,
  candidates,
  counts,
  available,
  loadError = false,
}: {
  eventId: string;
  eventStartsAt: string;
  canMarkAttended: boolean;
  participants: GlobalEventParticipant[];
  candidates: GlobalEventParticipationCandidate[];
  counts: GlobalEventParticipationCounts;
  available: boolean;
  loadError?: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initialStatus, setInitialStatus] =
    useState<GlobalEventParticipationStatus>("going");
  const [rosterFilter, setRosterFilter] = useState<
    "all" | GlobalEventParticipationStatus
  >("all");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return candidates;
    return candidates.filter((candidate) =>
      candidate.name.toLocaleLowerCase().includes(query),
    );
  }, [candidates, search]);
  const filteredParticipants = useMemo(
    () =>
      rosterFilter === "all"
        ? participants
        : participants.filter((participant) => participant.status === rosterFilter),
    [participants, rosterFilter],
  );

  function toggleCandidate(personId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }

  function addSelected() {
    setFeedback(null);
    startTransition(async () => {
      const result = await addGlobalEventParticipants(
        eventId,
        [...selected],
        initialStatus,
      );
      if (!result.ok) {
        setFeedback({ tone: "error", message: result.error });
        return;
      }

      const details = [
        result.added.length ? `${result.added.length} added` : null,
        result.alreadyTracked.length
          ? `${result.alreadyTracked.length} already tracked`
          : null,
        result.ineligible.length ? `${result.ineligible.length} no longer eligible` : null,
      ].filter(Boolean);
      setSelected(new Set());
      setFeedback({
        tone: result.ineligible.length ? "warn" : "ok",
        message: details.join(". ") || "No changes were needed",
      });
      router.refresh();
    });
  }

  function updateStatus(
    personId: string,
    status: GlobalEventParticipationStatus,
  ) {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateGlobalEventParticipant(eventId, personId, status);
      if (!result.ok) {
        setFeedback({ tone: "error", message: result.error });
        return;
      }
      setFeedback({ tone: "ok", message: `Status updated to ${STATUS_LABEL[status]}` });
      router.refresh();
    });
  }

  function removeParticipant(personId: string) {
    setFeedback(null);
    startTransition(async () => {
      const result = await removeGlobalEventParticipant(eventId, personId);
      if (!result.ok) {
        setFeedback({ tone: "error", message: result.error });
        return;
      }
      setConfirmingRemoval(null);
      setFeedback({ tone: "ok", message: "Member removed from the active cohort" });
      router.refresh();
    });
  }

  if (loadError) {
    return (
      <div className="admin-banner admin-banner--err" role="alert">
        The {CHAPTER_NAME} cohort could not be loaded. Try refreshing this page.
      </div>
    );
  }

  if (!available) {
    return (
      <div className="admin-banner admin-banner--warn" role="status">
        Cohort tracking is temporarily unavailable because its database schema is not ready.
        Event settings remain available.
      </div>
    );
  }

  return (
    <div className="global-cohort-manager" aria-busy={pending}>
      {pending && (
        <p className="global-cohort-loading" role="status">
          Saving cohort changes...
        </p>
      )}
      <section className="global-cohort-add" aria-labelledby="global-cohort-add-title">
        <div className="admin-section-head">
          <div>
            <h2 id="global-cohort-add-title" className="admin-section-h2">
              Add {CHAPTER_NAME} members
            </h2>
            <p className="admin-section-desc">
              Search the current chapter roster and select one or more members.
            </p>
          </div>
        </div>

        <div className="global-cohort-add-controls">
          <label className="admin-field global-cohort-search">
            <span className="admin-label">Search members</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by member name"
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Initial status</span>
            <select
              value={initialStatus}
              onChange={(event) =>
                setInitialStatus(event.target.value as GlobalEventParticipationStatus)
              }
            >
              <option value="going">Going</option>
              <option value="attended" disabled={!canMarkAttended}>
                Attended
              </option>
            </select>
          </label>
          <button
            type="button"
            className="admin-btn admin-btn--primary global-cohort-add-button"
            disabled={pending || selected.size === 0}
            onClick={addSelected}
          >
            {pending ? "Saving..." : `Add selected (${selected.size})`}
          </button>
        </div>

        {!canMarkAttended && (
          <p className="global-cohort-restriction" role="note">
            Attended becomes available after this event starts on{" "}
            {new Date(eventStartsAt).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: CHAPTER_TIME_ZONE,
            })}
            . Event time does not update anyone automatically.
          </p>
        )}

        <div className="global-cohort-candidates" role="group" aria-label="Current members">
          {filteredCandidates.length === 0 ? (
            <div className="admin-stub global-cohort-empty">
              {search ? "No current members match this search" : "No current members are available"}
            </div>
          ) : (
            filteredCandidates.map((candidate) => {
              const tracked = candidate.trackedStatus !== null;
              return (
                <label
                  key={candidate.personId}
                  className={`global-cohort-candidate${tracked ? " is-tracked" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(candidate.personId)}
                    disabled={tracked || pending}
                    onChange={() => toggleCandidate(candidate.personId)}
                  />
                  <span>
                    <strong>{candidate.name}</strong>
                    <small>
                      {candidate.membershipType} ·{" "}
                      {candidate.membershipStatus === "on_leave" ? "On leave" : "Active"}
                    </small>
                  </span>
                  {tracked && (
                    <span className="global-cohort-tracked">
                      {STATUS_LABEL[candidate.trackedStatus!]}
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>
      </section>

      {feedback && (
        <div
          className={`admin-banner admin-banner--${feedback.tone === "error" ? "err" : feedback.tone}`}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </div>
      )}

      <section className="admin-section global-cohort-roster" aria-labelledby="global-cohort-roster-title">
        <div className="admin-section-head">
          <div>
            <h2 id="global-cohort-roster-title" className="admin-section-h2">
              Active cohort
            </h2>
            <p className="admin-section-desc">
              {counts.going} Going · {counts.attended} Attended
            </p>
          </div>
          <label className="admin-field global-cohort-roster-filter">
            <span className="admin-label">Show</span>
            <select
              value={rosterFilter}
              onChange={(event) =>
                setRosterFilter(
                  event.target.value as "all" | GlobalEventParticipationStatus,
                )
              }
            >
              <option value="all">All tracked members</option>
              <option value="going">Going</option>
              <option value="attended">Attended</option>
            </select>
          </label>
        </div>

        {participants.length === 0 ? (
          <div className="admin-stub global-cohort-empty">
            <strong>No {CHAPTER_NAME} members are tracked yet</strong>
            Use Add members above to start the chapter cohort.
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="admin-stub global-cohort-empty">
            No members have this status
          </div>
        ) : (
          <ul className="global-cohort-roster-list">
            {filteredParticipants.map((participant) => (
              <li key={participant.id} className="global-cohort-roster-row">
                <div className="global-cohort-person">
                  <strong>{participant.name}</strong>
                  <small>
                    Updated {new Date(participant.updatedAt).toLocaleDateString("en-US")}
                    {participant.updatedByName ? ` by ${participant.updatedByName}` : ""}
                  </small>
                </div>
                <label className="admin-field global-cohort-status-control">
                  <span className="admin-label">Status for {participant.name}</span>
                  <select
                    value={participant.status}
                    disabled={pending}
                    onChange={(event) =>
                      updateStatus(
                        participant.personId,
                        event.target.value as GlobalEventParticipationStatus,
                      )
                    }
                  >
                    <option value="going">Going</option>
                    <option value="attended" disabled={!canMarkAttended}>
                      Attended
                    </option>
                  </select>
                </label>
                {confirmingRemoval === participant.personId ? (
                  <div className="global-cohort-remove-confirm" role="group" aria-label={`Remove ${participant.name}`}>
                    <span>Remove from the active cohort?</span>
                    <div>
                      <button
                        type="button"
                        className="admin-btn admin-btn--danger"
                        disabled={pending}
                        onClick={() => removeParticipant(participant.personId)}
                      >
                        Confirm remove
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost"
                        disabled={pending}
                        onClick={() => setConfirmingRemoval(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost"
                    disabled={pending}
                    onClick={() => setConfirmingRemoval(participant.personId)}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
