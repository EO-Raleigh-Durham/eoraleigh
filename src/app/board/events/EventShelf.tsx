"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  eventTypeLabel,
  formatEventDate,
  type EventRow,
  type EventStatus,
  type EventVisibility,
} from "@/lib/events";
import { EventForm } from "./EventForm";

type Props = {
  event: EventRow;
  rsvpCount: number;
  survey?: { url: string; qr: string };
  onClose: () => void;
};

type Tab = "overview" | "edit" | "survey";

const STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Draft",
  published: "Published",
  open: "Open for RSVP",
  closed: "RSVPs closed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const VISIBILITY_LABEL: Record<EventVisibility, string> = {
  members_only: "Members only",
  members_plus_spouses: "Members + spouses",
  public: "Public",
};

export function EventShelf({ event, rsvpCount, survey, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!survey) return;
    navigator.clipboard.writeText(survey.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [survey]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const date = formatEventDate(event.starts_at, event.ends_at);
  const cap = event.capacity ?? null;

  return (
    <div className="admin-shelf-portal">
      <button
        type="button"
        aria-label="Close"
        className="admin-shelf-backdrop"
        onClick={onClose}
      />
      <aside
        className="admin-shelf"
        role="dialog"
        aria-label={`Event ${event.title}`}
      >
        <div className="admin-shelf-head">
          <div>
            <div className="admin-shelf-eyebrow">
              {eventTypeLabel(event.type)} · {STATUS_LABEL[event.status]}
            </div>
            <h2 className="admin-shelf-title">{event.title}</h2>
            <div className="admin-shelf-sub">{date.full}</div>
          </div>
          <button
            type="button"
            className="admin-shelf-close"
            onClick={onClose}
            aria-label="Close shelf"
          >
            ✕
          </button>
        </div>

        <div className="admin-shelf-body">
          <div className="admin-shelf-tabs">
            {(
              [
                ["overview", "Overview"],
                ["edit", "Edit"],
                ...(survey ? [["survey", "Survey"]] : []),
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`admin-shelf-tab ${tab === id ? "is-active" : ""}`.trim()}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <>
              <Section title="Schedule">
                <Field label="Date" value={date.full} />
                <Field label="Location" value={event.location ?? "—"} />
                <Field
                  label="Visibility"
                  value={VISIBILITY_LABEL[event.visibility]}
                />
              </Section>
              <Section title="People">
                <Field label="Speaker" value={event.speaker ?? "—"} />
                <Field label="Champion" value={event.champion ?? "—"} />
              </Section>
              <Section title="Capacity & pricing">
                <Field
                  label="RSVPs"
                  value={`${rsvpCount}${cap !== null ? ` / ${cap}` : ""}`}
                />
                <Field
                  label="Price"
                  value={
                    event.price_amount > 0
                      ? `${event.currency} ${event.price_amount.toLocaleString()}`
                      : "Free"
                  }
                />
                <Field label="Featured" value={event.featured ? "Yes" : "No"} />
              </Section>
              {event.blurb && (
                <Section title="Blurb">
                  <p className="admin-shelf-notes">{event.blurb}</p>
                </Section>
              )}
              <Section title="Manage">
                <p className="admin-shelf-empty-tab">
                  Tickets, RSVPs, materials, and feedback live on the full
                  event page.
                </p>
                <Link
                  href={`/board/events/${event.id}`}
                  className="admin-btn admin-btn--ghost"
                >
                  Open full event page
                </Link>
              </Section>
            </>
          )}

          {tab === "edit" && <EventForm event={event} />}

          {tab === "survey" && survey && (
            <>
              <Section title="Survey link">
                <p className="admin-shelf-notes">
                  Share this link or QR with attendees after the event.
                </p>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                  <a
                    href={survey.url}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-link-action"
                    style={{ wordBreak: "break-all", flex: "1 1 auto" }}
                  >
                    {survey.url}
                  </a>
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost"
                    style={{ flexShrink: 0 }}
                    onClick={handleCopy}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </Section>
              <Section title="QR code">
                <div
                  className="evt-survey-qr"
                  dangerouslySetInnerHTML={{ __html: survey.qr }}
                />
              </Section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-shelf-section">
      <h3 className="admin-shelf-section-title">{title}</h3>
      <div className="admin-shelf-section-body">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-shelf-row">
      <div className="admin-shelf-row-label">{label}</div>
      <div className="admin-shelf-row-value">{value}</div>
    </div>
  );
}
