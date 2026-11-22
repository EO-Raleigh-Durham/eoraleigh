"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  confirmDoorCheckIn,
  resolveCheckInByCode,
  setRsvpAttendance,
} from "@/app/board/events/actions";
import { EventPolicyNotice } from "@/components/events/EventPolicyNotice";
import { isNonRefundableEvent, noShowFeeForEvent } from "@/lib/event-fee-overrides";
import {
  checkInEligibility,
  checkInTotals,
  reconcileCheckInCandidate,
  searchCheckInCandidates,
  type CheckInCandidate,
} from "@/lib/check-in";
import { QrCamera } from "./QrCamera";

type ReviewState = {
  candidate: CheckInCandidate;
  outcome: "ready" | "already" | "blocked";
  reason?: string;
};

type SuccessState = {
  candidate: CheckInCandidate;
};

type Props = {
  eventId: string;
  eventType?: string | null;
  eventTitle: string;
  eventDate: string;
  initialRoster: CheckInCandidate[];
};

function statusLabel(status: CheckInCandidate["status"]): string {
  return status.replace("_", " ");
}

export function CheckInConsole({ eventId, eventType, eventTitle, eventDate, initialRoster }: Props) {
  const [roster, setRoster] = useState(initialRoster);
  const [query, setQuery] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const scanInFlight = useRef(false);
  const reviewHeading = useRef<HTMLHeadingElement | null>(null);

  const totals = useMemo(() => checkInTotals(roster), [roster]);
  const matches = useMemo(
    () => searchCheckInCandidates(roster, query),
    [query, roster],
  );

  useEffect(() => {
    if (review || success) reviewHeading.current?.focus();
  }, [review, success]);

  function openCandidate(candidate: CheckInCandidate) {
    const eligibility = checkInEligibility(candidate);
    setCameraActive(false);
    setCameraError(null);
    setMessage(null);
    setSuccess(null);
    setReview(
      eligibility.kind === "blocked"
        ? { candidate, outcome: "blocked", reason: eligibility.reason }
        : { candidate, outcome: eligibility.kind },
    );
  }

  async function resolveScan(value: string) {
    if (scanInFlight.current) return;
    scanInFlight.current = true;
    setCameraActive(false);
    setMessage("Reading ticket...");
    try {
      const result = await resolveCheckInByCode(eventId, value);
      setMessage(null);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setRoster((current) => reconcileCheckInCandidate(current, result.candidate));
      setSuccess(null);
      setReview({
        candidate: result.candidate,
        outcome: result.outcome === "checked_in" ? "already" : result.outcome,
        reason: result.reason,
      });
      navigator.vibrate?.(60);
    } catch {
      setMessage("Could not read this ticket. Use name or email search instead.");
    } finally {
      scanInFlight.current = false;
    }
  }

  function reset({ resumeCamera = false }: { resumeCamera?: boolean } = {}) {
    setReview(null);
    setSuccess(null);
    setMessage(null);
    setQuery("");
    setCameraError(null);
    setCameraActive(resumeCamera);
  }

  async function confirm() {
    if (!review || review.outcome !== "ready" || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await confirmDoorCheckIn(eventId, review.candidate.id);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setRoster((current) => reconcileCheckInCandidate(current, result.candidate));
      if (result.outcome !== "checked_in") {
        setReview({
          candidate: result.candidate,
          outcome: result.outcome === "ready" ? "blocked" : result.outcome,
          reason:
            result.reason ??
            (result.outcome === "ready" ? "Attendance changed. Search again." : undefined),
        });
        return;
      }

      const candidate = result.candidate;
      setSessionCount((count) => count + candidate.attendeeCount);
      setReview(null);
      setSuccess({ candidate });
      navigator.vibrate?.([60, 40, 60]);
    } catch {
      setMessage("Could not check in this registration. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function undo() {
    if (!success || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await setRsvpAttendance(success.candidate.id, eventId, false);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      const restored: CheckInCandidate = {
        ...success.candidate,
        status: "registered",
        checkedInAt: null,
        waiverAccepted: true,
      };
      setRoster((current) => reconcileCheckInCandidate(current, restored));
      setSessionCount((count) => Math.max(0, count - restored.attendeeCount));
      setSuccess(null);
      setMessage(`Check-in undone for ${restored.displayName}. Policy acceptance was kept.`);
    } catch {
      setMessage("Could not undo this check-in. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const activeCandidate = review?.candidate ?? success?.candidate ?? null;

  return (
    <div className="chk-console">
      <div className="chk-console-head">
        <div className="chk-title-block">
          <h1 className="admin-page-title">Door check-in</h1>
          <p className="admin-page-sub">
            {eventTitle} · {eventDate}
          </p>
        </div>

        <div className="chk-stats" aria-label="Live attendance totals">
          <div className="chk-stat is-feature">
            <div className="chk-stat-val">{totals.checkedIn}</div>
            <div className="chk-stat-label">Checked in</div>
          </div>
          <div className="chk-stat">
            <div className="chk-stat-val">{totals.confirmed}</div>
            <div className="chk-stat-label">Confirmed</div>
          </div>
          <div className="chk-stat">
            <div className="chk-stat-val">{totals.expected}</div>
            <div className="chk-stat-label">Remaining</div>
          </div>
        </div>
      </div>

      <div className="chk-layout">
        <section className="chk-panel" aria-labelledby="scan-heading">
          <div className="chk-panel-head">
            <div>
              <p className="chk-eyebrow">Fast lane</p>
              <h2 id="scan-heading">Scan ticket QR</h2>
            </div>
            <span className={`chk-live-dot${cameraActive ? " is-live" : ""}`}>
              {cameraActive ? "Camera on" : "Camera off"}
            </span>
          </div>

          {cameraActive ? (
            <QrCamera
              onScan={resolveScan}
              onError={() => {
                setCameraActive(false);
                setCameraError(
                  "Camera access failed. Check browser permission or use name and email search.",
                );
              }}
              paused={Boolean(review || success || submitting)}
            />
          ) : (
            <div className="chk-camera-idle" aria-hidden="true">
              <div className="chk-camera-mark">
                <span />
                <span />
                <span />
                <span />
              </div>
              <p>Position the guest&apos;s QR inside the frame</p>
            </div>
          )}

          <button
            type="button"
            className={`btn ${cameraActive ? "btn--outline" : "btn--primary"} chk-camera-button`}
            onClick={() => {
              setCameraError(null);
              setMessage(null);
              setCameraActive((active) => !active);
            }}
            disabled={submitting || Boolean(activeCandidate)}
          >
            {cameraActive ? "Stop camera" : "Start camera"}
          </button>
          {cameraError && <p className="chk-alert is-error">{cameraError}</p>}
        </section>

        <section className="chk-panel" aria-labelledby="search-heading">
          <div className="chk-panel-head">
            <div>
              <p className="chk-eyebrow">No QR?</p>
              <h2 id="search-heading">Find by name or email</h2>
            </div>
          </div>
          <label className="chk-search-label" htmlFor="check-in-search">
            Guest name or email
          </label>
          <input
            id="check-in-search"
            className="chk-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Start typing a name or email"
            autoComplete="off"
          />
          <div className="chk-search-results" aria-live="polite">
            {query.trim() && matches.length === 0 ? (
              <p className="chk-empty">No registrations found. Try another spelling or email.</p>
            ) : null}
            {matches.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                className="chk-person-row"
                onClick={() => openCandidate(candidate)}
              >
                <span>
                  <strong>{candidate.displayName}</strong>
                  <small>
                    {candidate.displayEmail} · {candidate.attendeeCount} {candidate.attendeeCount === 1 ? "attendee" : "attendees"}
                  </small>
                </span>
                <span className={`chk-status is-${candidate.status}`}>
                  {statusLabel(candidate.status)}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="chk-flow-card" aria-live="polite">
        {!review && !success ? (
          <div className="chk-ready-state">
            <div>
              <p className="chk-eyebrow">Next guest</p>
              <h2>Scan a ticket or find a guest</h2>
              <p>Ask the guest to confirm the event terms to check in.</p>
            </div>
            <div className="chk-session-count">
              <strong>{sessionCount}</strong>
              <span>people checked in this session</span>
            </div>
          </div>
        ) : null}

        {review ? (
          <div className="chk-review">
            <p className="chk-eyebrow">
              {review.outcome === "ready" ? "Guest confirmation" : "Registration status"}
            </p>
            <h2 ref={reviewHeading} tabIndex={-1}>{review.candidate.displayName}</h2>
            <p className="chk-review-meta">
              {review.candidate.displayEmail}
              {review.candidate.ticketType ? ` · ${review.candidate.ticketType}` : ""}
              {` · ${review.candidate.attendeeCount} ${review.candidate.attendeeCount === 1 ? "attendee" : "attendees"}`}
            </p>

            {review.outcome === "blocked" ? (
              <div className="chk-alert is-error">
                <strong>Cannot check in</strong>
                <span>{review.reason}</span>
              </div>
            ) : null}
            {review.outcome === "already" ? (
              <div className="chk-alert is-warning">
                <strong>Already checked in</strong>
                <span>This registration already has attendance recorded.</span>
              </div>
            ) : null}

            <div className="chk-policy rsvp-waiver">
              <div className="chk-policy-status">
                <strong>
                  {review.candidate.waiverAccepted
                    ? "Policy accepted during registration"
                    : "Please review and accept before check-in"}
                </strong>
                <span>
                  Event responsibility, photos and recordings, translation headset,
                  cancellation, and no-show terms apply.
                </span>
              </div>
              <EventPolicyNotice
                compact
                defaultOpen={!review.candidate.waiverAccepted}
                summary="Read the event responsibility policy"
                noShowFeeUsd={noShowFeeForEvent({ id: eventId, type: eventType, title: eventTitle })}
                nonRefundable={isNonRefundableEvent({ id: eventId })}
              />
            </div>

            {review.outcome === "ready" ? (
              <p className="chk-guest-prompt">
                Please turn the screen toward the guest. The guest should tap the
                button below.
              </p>
            ) : null}
            {message && <p className="chk-alert is-error">{message}</p>}
            <div className="chk-actions">
              {review.outcome === "ready" ? (
                <button
                  type="button"
                  className="btn btn--primary btn--lg"
                  onClick={confirm}
                  disabled={submitting}
                >
                  {submitting
                    ? "Checking in..."
                    : review.candidate.waiverAccepted
                      ? "OK, check me in"
                      : "I agree and check in"}
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => reset()}
                disabled={submitting}
              >
                {review.outcome === "ready" ? "Cancel without check-in" : "Done"}
              </button>
            </div>
          </div>
        ) : null}

        {success ? (
          <div className="chk-success">
            <div className="chk-success-mark" aria-hidden="true">✓</div>
            <div>
              <p className="chk-eyebrow">Checked in</p>
              <h2 ref={reviewHeading} tabIndex={-1}>{success.candidate.displayName}</h2>
              <p>
                {success.candidate.attendeeCount} {success.candidate.attendeeCount === 1 ? "person" : "people"} added to attendance.
              </p>
            </div>
            {message && <p className="chk-alert is-error">{message}</p>}
            <div className="chk-actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => reset({ resumeCamera: true })}
                disabled={submitting}
              >
                Scan next attendee
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={undo}
                disabled={submitting}
              >
                {submitting ? "Undoing..." : "Undo check-in"}
              </button>
            </div>
          </div>
        ) : null}

        {!review && !success && message ? (
          <p className={`chk-alert${message.startsWith("Check-in undone") ? " is-success" : " is-error"}`}>
            {message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
