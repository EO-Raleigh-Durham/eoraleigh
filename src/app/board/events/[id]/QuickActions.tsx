"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { EventStatus } from "@/lib/events";
import {
  setEventStatus,
  setEventCapacity,
  setEventSurveyEnabled,
} from "../actions";

const STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Draft",
  published: "Published",
  open: "Open for RSVP",
  closed: "RSVPs closed",
  completed: "Completed",
  cancelled: "Cancelled",
};
const STATUS_ORDER: EventStatus[] = [
  "draft",
  "published",
  "open",
  "closed",
  "completed",
  "cancelled",
];

// The Overview management bar: change the things a chair changes most — open /
// close registration, capacity, survey — plus jump to the door scanner and the
// projector view. Everything here writes immediately; the full edit form lives
// under the Settings tab.
export function QuickActions({
  eventId,
  status,
  capacity,
  surveyEnabled,
}: {
  eventId: string;
  status: EventStatus;
  capacity: number | null;
  surveyEnabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [capDraft, setCapDraft] = useState(
    capacity === null ? "" : String(capacity),
  );

  const capChanged = capDraft.trim() !== (capacity === null ? "" : String(capacity));

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong");
    });
  }

  return (
    <div className="hub-actions">
      <div className="hub-actions-row">
        <label className="hub-action">
          <span className="hub-action-label">Status</span>
          <select
            className="admin-inline-select"
            value={status}
            disabled={pending}
            onChange={(e) => run(() => setEventStatus(eventId, e.target.value))}
            aria-label="Event status"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="hub-action">
          <span className="hub-action-label">Capacity</span>
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="number"
              min={0}
              step={1}
              value={capDraft}
              placeholder="∞"
              disabled={pending}
              onChange={(e) => setCapDraft(e.target.value)}
              style={{ width: 90 }}
              aria-label="Capacity (blank for unlimited)"
            />
            {capChanged && (
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                disabled={pending}
                onClick={() => run(() => setEventCapacity(eventId, capDraft))}
              >
                Save
              </button>
            )}
          </span>
        </label>

        <label className="hub-action">
          <span className="hub-action-label">Survey</span>
          <button
            type="button"
            className={`hub-toggle${surveyEnabled ? " is-on" : ""}`}
            disabled={pending}
            onClick={() => run(() => setEventSurveyEnabled(eventId, !surveyEnabled))}
            aria-pressed={surveyEnabled}
          >
            {surveyEnabled ? "On" : "Off"}
          </button>
        </label>

        <div className="hub-actions-spacer" />

        <Link
          href={`/board/events/${eventId}/check-in`}
          className="admin-btn admin-btn--ghost"
        >
          Check-in scanner
        </Link>
        <Link
          href={`/board/events/${eventId}/present`}
          className="admin-btn admin-btn--ghost"
          target="_blank"
        >
          Present
        </Link>
      </div>
      {error && (
        <div className="admin-banner admin-banner--err" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}
    </div>
  );
}
