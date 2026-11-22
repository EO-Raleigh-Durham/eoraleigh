"use client";

import { useMemo, useState, useTransition } from "react";
import { sendParticipantMessage } from "../actions";
import { buildReminderTemplate } from "@/lib/event-message-templates";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export type SegmentKey =
  | "all"
  | "registered"
  | "checked_in"
  | "no_show"
  | "waitlist";

const SEGMENTS: { key: SegmentKey; label: string }[] = [
  { key: "all", label: "Everyone registered" },
  { key: "registered", label: "Confirmed (registered + checked-in)" },
  { key: "checked_in", label: "Checked in" },
  { key: "no_show", label: "No-shows" },
  { key: "waitlist", label: "Waitlist" },
];

type Template = {
  key: string;
  label: string;
  segment: SegmentKey;
  render: (context: TemplateContext) => { subject: string; body: string };
};

type TemplateContext = {
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string | null;
  eventUrl: string;
  surveyUrl: string;
};

const TEMPLATES: Template[] = [
  {
    key: "reminder",
    label: "Reminder",
    segment: "registered",
    render: buildReminderTemplate,
  },
  {
    key: "logistics",
    label: "Logistics update",
    segment: "all",
    render: ({ eventTitle }) => ({
      subject: `Update for ${eventTitle}`,
      body: `A quick update on ${eventTitle}:\n\n[Add the change here — new time, venue, parking, or what to bring]\n\nReply to this email if you have any questions.\n\n${CHAPTER_NAME}`,
    }),
  },
  {
    key: "survey",
    label: "Survey nudge",
    segment: "checked_in",
    render: ({ eventTitle, surveyUrl }) => ({
      subject: `How was ${eventTitle}? (2 minutes)`,
      body: `Thanks for joining ${eventTitle}. We'd love your quick feedback — it shapes the next one.\n\nShare your thoughts here: ${surveyUrl}\n\nThank you,\n${CHAPTER_NAME}`,
    }),
  },
  {
    key: "thanks",
    label: "Thank-you",
    segment: "checked_in",
    render: ({ eventTitle }) => ({
      subject: `Thank you for coming to ${eventTitle}`,
      body: `It was great to have you at ${eventTitle}. Thank you for being part of it.\n\n[Add slides, photos, or next steps here]\n\nWarmly,\n${CHAPTER_NAME}`,
    }),
  },
];

export function MessageParticipants({
  eventId,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  eventUrl,
  surveyUrl,
  counts,
  emailConfigured,
}: {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string | null;
  eventUrl: string;
  surveyUrl: string;
  counts: Record<SegmentKey, number>;
  emailConfigured: boolean;
}) {
  const [segment, setSegment] = useState<SegmentKey>("registered");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ sent: number; failed: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const recipientCount = counts[segment] ?? 0;

  function applyTemplate(t: Template) {
    const context: TemplateContext = {
      eventTitle,
      eventDate,
      eventTime,
      eventLocation,
      eventUrl,
      surveyUrl,
    };
    const rendered = t.render(context);
    setSegment(t.segment);
    setSubject(rendered.subject);
    setBody(rendered.body);
    setDone(null);
    setError(null);
  }

  const ready = useMemo(
    () => subject.trim().length > 0 && body.trim().length > 0 && recipientCount > 0,
    [subject, body, recipientCount],
  );

  function send() {
    setError(null);
    const fd = new FormData();
    fd.set("segment", segment);
    fd.set("subject", subject);
    fd.set("body", body);
    startTransition(async () => {
      const res = await sendParticipantMessage(eventId, fd);
      if (res.ok) {
        setDone({ sent: res.sent, failed: res.failed });
        setConfirming(false);
      } else {
        setError(res.error);
        setConfirming(false);
      }
    });
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2 className="admin-section-h2">Message participants</h2>
      </div>
      <p className="admin-section-desc">
        Email a group of registrants. Recipients are resolved when you send, so
        the list is always current.
      </p>

      {!emailConfigured && (
        <div className="admin-banner admin-banner--warn" style={{ marginBottom: 16 }}>
          Email sending is not switched on yet. You can draft and preview here;
          messages will send once a verified sender is configured.
        </div>
      )}

      <div className="hub-msg-templates">
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={() => applyTemplate(t)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-form-row admin-form-row--2" style={{ marginTop: 16 }}>
        <label className="admin-field">
          <span className="admin-label">Send to</span>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value as SegmentKey)}
          >
            {SEGMENTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label} ({counts[s.key] ?? 0})
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span className="admin-label">Subject</span>
          <input
            type="text"
            value={subject}
            maxLength={200}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Reminder: ..."
          />
        </label>
      </div>

      <label className="admin-field" style={{ marginTop: 12 }}>
        <span className="admin-label">Message</span>
        <textarea
          value={body}
          rows={9}
          maxLength={5000}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Pick a template above, or write your own. Each person is greeted by name."
        />
      </label>

      {error && (
        <div className="admin-banner admin-banner--err" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
      {done && (
        <div className="admin-banner admin-banner--ok" style={{ marginTop: 12 }}>
          Sent to {done.sent} {done.sent === 1 ? "person" : "people"}
          {done.failed > 0 ? ` · ${done.failed} failed` : ""}.
        </div>
      )}

      {confirming ? (
        <div className="hub-msg-confirm">
          <p>
            Send this to <strong>{recipientCount}</strong>{" "}
            {recipientCount === 1 ? "person" : "people"} in{" "}
            <strong>{SEGMENTS.find((s) => s.key === segment)?.label}</strong>?
          </p>
          <div className="admin-form-actions">
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              Back
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={send}
              disabled={pending}
            >
              {pending ? "Sending..." : `Send to ${recipientCount}`}
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-form-actions" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={!ready || pending}
            onClick={() => {
              setDone(null);
              setConfirming(true);
            }}
          >
            Preview & send
          </button>
        </div>
      )}
    </section>
  );
}
