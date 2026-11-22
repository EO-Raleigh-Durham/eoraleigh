"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import {
  EVENT_TYPE_ORDER,
  eventTypeLabel,
  isoToHcmInput,
  type EventRow,
  type EventScope,
  type EventStatus,
  type EventVisibility,
} from "@/lib/events";
import { createEvent, updateEvent, deleteEvent, generateRecap, unpublishRecap } from "./actions";
import { CHAPTER_CITY, CHAPTER_NAME, CHAPTER_TIME_ZONE_LABEL } from "@/kernel/config/chapter";

const RECAP_BLOCKS_PLACEHOLDER = `[
  { "tag": "p", "text": "What happened, in a sentence or two that hooks the reader." },
  { "tag": "h2", "text": "The room" },
  { "tag": "p", "text": "Body paragraph with <strong>emphasis</strong> and <a href=\\"/join\\">links</a>." },
  { "tag": "image", "src": "https://.../photo.jpg", "alt": "Speaker on stage", "caption": "Optional caption" },
  { "tag": "pull-quote", "text": "A line worth remembering from the night." }
]`;

const STATUSES: EventStatus[] = ["draft", "published", "open", "closed", "completed", "cancelled"];
const VISIBILITIES: EventVisibility[] = ["members_only", "members_plus_spouses", "public"];

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
const SCOPES: EventScope[] = ["local", "global"];
const SCOPE_LABEL: Record<EventScope, string> = {
  local: "Local (chapter)",
  global: "Global (EO / regional)",
};

type Props = {
  event?: EventRow | null;
  saved?: boolean;
  variant?: "local" | "global";
};

export function EventForm({ event, saved, variant = "local" }: Props) {
  const isEdit = !!event;
  const showRegistrationOperations = variant === "local";
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [recapNote, setRecapNote] = useState<string | null>(null);
  const [recapPending, startRecapTransition] = useTransition();

  // Generation publishes straight away, so both buttons are outside the form
  // submit path: they act on the saved event, not on unsaved edits.
  function runRecapAction(action: () => Promise<{ ok: boolean; error?: string }>) {
    setRecapNote(null);
    startRecapTransition(async () => {
      const res = await action();
      setRecapNote(res.ok ? "Done. Reload to see the new recap." : res.error ?? "Failed");
    });
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = isEdit ? await updateEvent(event!.id, formData) : await createEvent(formData);
      if (res && !res.ok) setError(res.error);
    });
  }

  function handleDelete() {
    if (!isEdit) return;
    if (!confirm(`Delete "${event!.title}"? This cannot be undone, and all RSVPs and materials for it will be removed.`)) {
      return;
    }
    startTransition(async () => {
      await deleteEvent(event!.id);
    });
  }

  const startsDefault = event ? isoToHcmInput(event.starts_at) : "";
  const endsDefault = event?.ends_at ? isoToHcmInput(event.ends_at) : "";

  return (
    <div>
      {saved && (
        <div className="admin-banner admin-banner--ok">Saved.</div>
      )}
      {error && (
        <div className="admin-banner admin-banner--err">{error}</div>
      )}

      <form action={handleSubmit} className="admin-form">
        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Title</span>
            <input
              name="title"
              type="text"
              required
              defaultValue={event?.title ?? ""}
              placeholder="Forum Reformation Workshop"
            />
          </label>
        </div>

        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">URL slug (/events/…)</span>
            <input
              name="slug"
              type="text"
              defaultValue={event?.slug ?? ""}
              placeholder="townhall-2026-2027 (leave blank to keep current; auto-generated on create)"
            />
          </label>
        </div>

        <div className="admin-form-row admin-form-row--3">
          <label className="admin-field">
            <span className="admin-label">Type</span>
            <select name="type" required defaultValue={event?.type ?? "learning"}>
              {EVENT_TYPE_ORDER.map((t) => (
                <option key={t} value={t}>{eventTypeLabel(t)}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span className="admin-label">Status</span>
            <select name="status" required defaultValue={event?.status ?? "draft"}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span className="admin-label">Visibility</span>
            <select name="visibility" required defaultValue={event?.visibility ?? "members_only"}>
              {VISIBILITIES.map((v) => (
                <option key={v} value={v}>{VISIBILITY_LABEL[v]}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-form-row">
          <label className="admin-field">
            <span className="admin-label">Scope</span>
            <select name="scope" required defaultValue={event?.scope ?? "local"}>
              {SCOPES.map((sc) => (
                <option key={sc} value={sc}>{SCOPE_LABEL[sc]}</option>
              ))}
            </select>
            <span className="admin-hint">Global events show only on /global-events, kept off the chapter calendar.</span>
          </label>
        </div>

        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Blurb</span>
            <textarea
              name="blurb"
              rows={3}
              defaultValue={event?.blurb ?? ""}
              placeholder="One or two sentences describing what this event is and why someone should come."
            />
          </label>
        </div>

        <div className="admin-form-row admin-form-row--3">
          <label className="admin-field">
            <span className="admin-label">Speaker</span>
            <input
              name="speaker"
              type="text"
              defaultValue={event?.speaker ?? ""}
              placeholder="Optional"
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Champion</span>
            <input
              name="champion"
              type="text"
              defaultValue={event?.champion ?? ""}
              placeholder="Member running point"
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Location</span>
            <input
              name="location"
              type="text"
              defaultValue={event?.location ?? ""}
              placeholder={`${CHAPTER_CITY || "City"}, online, etc.`}
            />
          </label>
        </div>

        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Starts ({CHAPTER_TIME_ZONE_LABEL})</span>
            <input
              name="starts_at"
              type="datetime-local"
              required
              defaultValue={startsDefault}
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Ends ({CHAPTER_TIME_ZONE_LABEL}, optional)</span>
            <input
              name="ends_at"
              type="datetime-local"
              defaultValue={endsDefault}
            />
          </label>
        </div>

        <div className="admin-form-row admin-form-row--3">
          {showRegistrationOperations && (
            <>
              <label className="admin-field">
                <span className="admin-label">Capacity</span>
                <input
                  name="capacity"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={event?.capacity ?? ""}
                  placeholder="Leave blank for unlimited"
                />
              </label>
              <label className="admin-field">
                <span className="admin-label">Default price (USD)</span>
                <input
                  name="price_dollars"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={
                    event && event.price_amount > 0
                      ? (event.price_amount / 100).toFixed(2)
                      : "0"
                  }
                  placeholder="0 for free"
                />
                <span className="admin-hint">Used when no ticket types are set. Add tickets below to enable tiered pricing.</span>
              </label>
              <label className="admin-field">
                <span className="admin-label">Fee label (display only)</span>
                <input
                  name="price_note"
                  type="text"
                  defaultValue={event?.price_note ?? ""}
                  placeholder="e.g. US$800/person"
                />
                <span className="admin-hint">Shown in place of the price on the public page. Does not charge online: leave the price above at 0 to keep RSVP free for fees paid offline.</span>
              </label>
            </>
          )}
          <label className="admin-field">
            <span className="admin-label">Tag label</span>
            <input
              name="tag_label"
              type="text"
              defaultValue={event?.tag_label ?? ""}
              placeholder="e.g. Members only, Featured, Forum"
            />
          </label>
        </div>

        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Cover image URL</span>
            <input
              name="cover_image_url"
              type="url"
              defaultValue={event?.cover_image_url ?? ""}
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">CTA label</span>
            <input
              name="cta_label"
              type="text"
              defaultValue={event?.cta_label ?? ""}
              placeholder="Apply now"
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">CTA href</span>
            <input
              name="cta_href"
              type="text"
              defaultValue={event?.cta_href ?? ""}
              placeholder="/training or https://..."
            />
          </label>
        </div>

        <div className="admin-form-row">
          <label className="admin-field admin-field--inline">
            <input
              name="featured"
              type="checkbox"
              defaultChecked={event?.featured ?? false}
            />
            <span>Featured event (pinned at top of the public page)</span>
          </label>
        </div>

        {showRegistrationOperations && (
          <>
            <div className="admin-form-row">
              <label className="admin-field admin-field--inline">
                <input
                  name="survey_enabled"
                  type="checkbox"
                  defaultChecked={event?.survey_enabled ?? true}
                />
                <span>Post-event survey open (the 3-question feedback form is live)</span>
              </label>
            </div>

            {/* GUESTS — let members add guests to their own RSVP for a per-guest fee */}
            <h2 className="admin-section-h2" style={{ marginTop: 32, marginBottom: 12 }}>Guests</h2>
            <div className="admin-form-row">
              <label className="admin-field admin-field--inline">
                <input
                  name="allow_guests"
                  type="checkbox"
                  defaultChecked={event?.allow_guests ?? false}
                />
                <span>Members can bring guests (adds a &ldquo;+ Add guest&rdquo; step to the RSVP)</span>
              </label>
            </div>
            <div className="admin-form-row admin-form-row--2">
              <label className="admin-field">
                <span className="admin-label">Max guests per member</span>
                <input
                  name="max_guests_per_member"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={event?.max_guests_per_member ?? ""}
                  placeholder="Blank = no limit"
                />
              </label>
              <label className="admin-field">
                <span className="admin-label">Cost per guest (USD)</span>
                <input
                  name="guest_price_dollars"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={
                    event && (event.guest_price_amount ?? 0) > 0
                      ? ((event.guest_price_amount ?? 0) / 100).toFixed(2)
                      : "0"
                  }
                  placeholder="0 for free"
                />
              </label>
            </div>
          </>
        )}

        {/* RECAP & SEO — turn a past event into ranking content */}
        <h2 className="admin-section-h2" style={{ marginTop: 32, marginBottom: 12 }}>Recap &amp; SEO</h2>
        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Primary keyword</span>
            <input
              name="primary_keyword"
              type="text"
              defaultValue={event?.primary_keyword ?? ""}
              placeholder="e.g. Maria Ozawa fireside chat"
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Secondary keywords (comma-separated)</span>
            <input
              name="secondary_keywords"
              type="text"
              defaultValue={(event?.secondary_keywords ?? []).join(", ")}
              placeholder={`founder event ${CHAPTER_CITY}, ${CHAPTER_NAME} recap`.replace(" ,", ",")}
            />
          </label>
        </div>
        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Recap (JSON array of blocks)</span>
            <textarea
              name="recap_blocks"
              rows={14}
              defaultValue={event?.recap_blocks ? JSON.stringify(event.recap_blocks, null, 2) : ""}
              placeholder={RECAP_BLOCKS_PLACEHOLDER}
              style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}
            />
            <span style={{ fontSize: 12, color: "var(--text-muted, #6B7280)" }}>
              Same block format as blog posts. Use {"{ tag: 'image', src, alt, caption }"} for photos.
              Leave empty for no recap.
            </span>
          </label>
        </div>
        <div className="admin-form-row">
          <label className="admin-field admin-field--inline">
            <input
              name="recap_published"
              type="checkbox"
              defaultChecked={event?.recap_published ?? false}
            />
            <span>Publish recap (shows publicly on the event page, even for members-only events)</span>
          </label>
        </div>

        {/* Generation acts on the saved event and publishes immediately. It
            overwrites the recap above, so it is kept away from the save path. */}
        {isEdit && event && (
          <div className="admin-form-row">
            <div className="admin-field admin-field--full">
              <span className="admin-label">Generate from the tagged blog post</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  disabled={recapPending}
                  onClick={() => runRecapAction(() => generateRecap(event.id))}
                >
                  {recapPending ? "Working..." : "Generate and publish recap"}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  disabled={recapPending}
                  onClick={() => runRecapAction(() => unpublishRecap(event.id))}
                >
                  Unpublish recap
                </button>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted, #6B7280)" }}>
                Overwrites the recap above and publishes it. Stats and testimonials are
                added from the database, not written by the model. Unsaved edits on this
                form are not included.
              </span>
              {recapNote && (
                <span style={{ fontSize: 13, marginTop: 6 }}>{recapNote}</span>
              )}
            </div>
          </div>
        )}

        <div className="admin-form-actions">
          <Link href="/board/events" className="admin-btn admin-btn--ghost">
            Cancel
          </Link>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={pending}>
            {pending ? "Saving..." : isEdit ? "Save changes" : "Create event"}
          </button>
        </div>
      </form>

      {isEdit && (
        <div className="admin-danger-zone">
          <div className="admin-danger-head">Danger zone</div>
          <p className="admin-danger-desc">
            Deleting an event removes its RSVPs, materials, feedback, and reminder history. Cancelling (set status to Cancelled) is usually safer.
          </p>
          <button
            type="button"
            className="admin-btn admin-btn--danger"
            onClick={handleDelete}
            disabled={pending}
          >
            Delete event
          </button>
        </div>
      )}
    </div>
  );
}
