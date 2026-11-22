"use client";

import { useTransition, useState, useId } from "react";
import Link from "next/link";
import type { BlogPost, BlogStatus } from "@/lib/blog";
import type { EventPickerOption } from "@/lib/event-recap-link";
import { createBlogPost, updateBlogPost, deleteBlogPost } from "./actions";
import { CHAPTER_NAME, CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

const STATUSES: BlogStatus[] = ["draft", "scheduled", "published", "archived"];

const STATUS_LABEL: Record<BlogStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

type Props = {
  post?: BlogPost | null;
  saved?: boolean;
  eventOptions?: EventPickerOption[];
};

const BLOCKS_PLACEHOLDER = `[
  { "tag": "p", "text": "Opening paragraph that hooks the reader." },
  { "tag": "pull-quote", "text": "A magazine-style pull quote that frames the piece." },
  { "tag": "h2", "text": "First section heading" },
  { "tag": "p", "text": "Body paragraph with <strong>emphasis</strong> and <a href=\\"/about\\">links</a>." },
  { "tag": "tl-dr", "items": ["Key point one", "Key point two", "Key point three"] }
]`;

function isoDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  // Intl in en-CA gives YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHAPTER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function eventOptionLabel(option: EventPickerOption): string {
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: CHAPTER_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(option.startsAt));
  return `${date} — ${option.title}`;
}

function CharCount({ value, ideal, max }: { value: string; ideal: number; max: number }) {
  const len = value.length;
  let tone: "ok" | "warn" | "muted" = "muted";
  if (len > max) tone = "warn";
  else if (len > ideal) tone = "warn";
  else if (len > 0 && len >= ideal * 0.5) tone = "ok";
  const color =
    tone === "warn" ? "var(--eo-pink, #FF346E)" :
    tone === "ok" ? "var(--eo-green, #1EA691)" : "var(--text-muted, #6B7280)";
  return (
    <span style={{ fontSize: 12, color, fontFamily: "var(--font-mono, monospace)" }}>
      {len} / {ideal}
    </span>
  );
}

export function BlogForm({ post, saved, eventOptions = [] }: Props) {
  const isEdit = !!post;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Reactive char counts
  const [metaTitle, setMetaTitle] = useState(post?.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(post?.meta_description ?? "");
  const titleId = useId();
  const descId = useId();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = isEdit
        ? await updateBlogPost(post!.id, formData)
        : await createBlogPost(formData);
      if (res && !res.ok) setError(res.error);
    });
  }

  function handleDelete() {
    if (!isEdit) return;
    if (!confirm(`Delete "${post!.title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteBlogPost(post!.id);
    });
  }

  const blocksValue = post?.blocks ? JSON.stringify(post.blocks, null, 2) : "";

  return (
    <div>
      {saved && <div className="admin-banner admin-banner--ok">Saved.</div>}
      {error && <div className="admin-banner admin-banner--err">{error}</div>}

      <form action={handleSubmit} className="admin-form">

        {/* IDENTITY */}
        <h2 className="admin-section-h2" style={{ marginBottom: 12 }}>Identity</h2>
        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Title</span>
            <input name="title" type="text" required defaultValue={post?.title ?? ""} />
          </label>
        </div>
        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Slug</span>
            <input
              name="slug"
              type="text"
              required
              defaultValue={post?.slug ?? ""}
              placeholder="lowercase-with-dashes"
              pattern="[a-z0-9\-]+"
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Subtitle</span>
            <input name="subtitle" type="text" defaultValue={post?.subtitle ?? ""} />
          </label>
        </div>
        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Excerpt</span>
            <textarea name="excerpt" rows={2} defaultValue={post?.excerpt ?? ""} />
          </label>
        </div>

        {/* SOURCE */}
        <h2 className="admin-section-h2" style={{ marginTop: 32, marginBottom: 12 }}>Source</h2>
        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">External URL (Wix, Medium, etc.)</span>
            <input
              name="external_url"
              type="url"
              defaultValue={post?.external_url ?? ""}
              placeholder="Leave blank for native posts; set to redirect /blog/[slug] to an external URL"
            />
          </label>
        </div>
        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Body blocks (JSON array)</span>
            <textarea
              name="blocks"
              rows={14}
              defaultValue={blocksValue}
              placeholder={BLOCKS_PLACEHOLDER}
              style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}
            />
            <span style={{ fontSize: 12, color: "var(--text-muted, #6B7280)" }}>
              Each item is a Block object: {"{ tag: 'p' | 'h2' | 'pull-quote' | 'stat-callout' | ... }"}.
              Leave empty if this post uses an External URL instead.
            </span>
          </label>
        </div>

        {/* EVENT LINK — tagging a post to an event is the recap trigger */}
        <h2 className="admin-section-h2" style={{ marginTop: 32, marginBottom: 12 }}>Event</h2>
        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">This post recaps</span>
            <select name="event_id" defaultValue={post?.event_id ?? ""}>
              <option value="">Not an event write-up</option>
              {eventOptions.map((option) => {
                // An event already claimed by another post cannot be picked:
                // one post per event, enforced by a unique index.
                const takenByOther =
                  option.takenByPostId !== null && option.takenByPostId !== post?.id;
                return (
                  <option key={option.id} value={option.id} disabled={takenByOther}>
                    {eventOptionLabel(option)}
                    {takenByOther ? " — already has a post" : ""}
                  </option>
                );
              })}
            </select>
            <span style={{ fontSize: 12, color: "var(--text-muted, #6B7280)" }}>
              Links this post to the event both ways: the event page gains a recap and links
              here, this post gains a card back to the event. One post per event.
            </span>
          </label>
        </div>

        {/* DISPLAY */}
        <h2 className="admin-section-h2" style={{ marginTop: 32, marginBottom: 12 }}>Display</h2>
        <div className="admin-form-row admin-form-row--3">
          <label className="admin-field">
            <span className="admin-label">Category</span>
            <input name="category" type="text" defaultValue={post?.category ?? ""} placeholder="Leadership, AI, Event Recap..." />
          </label>
          <label className="admin-field">
            <span className="admin-label">Read time (minutes)</span>
            <input name="read_time_minutes" type="number" min={0} step={1} defaultValue={post?.read_time_minutes ?? ""} />
          </label>
          <label className="admin-field admin-field--inline" style={{ alignSelf: "flex-end" }}>
            <input
              name="featured"
              type="checkbox"
              defaultChecked={post?.featured ?? false}
            />
            <span>Featured</span>
          </label>
        </div>
        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Tags (comma-separated)</span>
            <input
              name="tags"
              type="text"
              defaultValue={(post?.tags ?? []).join(", ")}
              placeholder="leadership, ai, founder-story"
            />
          </label>
        </div>
        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Hero image URL</span>
            <input name="hero_image_url" type="url" defaultValue={post?.hero_image_url ?? ""} />
          </label>
        </div>

        {/* AUTHORING */}
        <h2 className="admin-section-h2" style={{ marginTop: 32, marginBottom: 12 }}>Author & series</h2>
        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Author name</span>
            <input name="author_name" type="text" defaultValue={post?.author_name ?? ""} />
          </label>
          <label className="admin-field">
            <span className="admin-label">Author role</span>
            <input name="author_role" type="text" defaultValue={post?.author_role ?? ""} placeholder={`Founder, ${CHAPTER_NAME}`} />
          </label>
        </div>
        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Series slug (optional)</span>
            <input name="series" type="text" defaultValue={post?.series ?? ""} />
          </label>
          <label className="admin-field">
            <span className="admin-label">Series total (optional)</span>
            <input name="series_total" type="number" min={0} step={1} defaultValue={post?.series_total ?? ""} />
          </label>
        </div>

        {/* SEO */}
        <h2 className="admin-section-h2" style={{ marginTop: 32, marginBottom: 12 }}>SEO</h2>
        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Primary keyword</span>
            <input
              name="primary_keyword"
              type="text"
              defaultValue={post?.primary_keyword ?? ""}
              placeholder="e.g. how founders should use AI"
            />
            <span style={{ fontSize: 12, color: "var(--text-muted, #6B7280)" }}>
              The single search-target phrase this post is built around. Should appear in title, opening paragraph, and ideally a H2.
            </span>
          </label>
        </div>
        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Secondary keywords (comma-separated)</span>
            <input
              name="secondary_keywords"
              type="text"
              defaultValue={(post?.secondary_keywords ?? []).join(", ")}
              placeholder="related terms, long-tail variants"
            />
          </label>
        </div>
        <div className="admin-form-row">
          <label className="admin-field admin-field--full" htmlFor={titleId}>
            <span className="admin-label" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Meta title (defaults to post title)</span>
              <CharCount value={metaTitle} ideal={60} max={70} />
            </span>
            <input
              id={titleId}
              name="meta_title"
              type="text"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              maxLength={120}
              placeholder="50-60 characters works best in Google SERPs"
            />
          </label>
        </div>
        <div className="admin-form-row">
          <label className="admin-field admin-field--full" htmlFor={descId}>
            <span className="admin-label" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Meta description (defaults to excerpt)</span>
              <CharCount value={metaDescription} ideal={155} max={170} />
            </span>
            <textarea
              id={descId}
              name="meta_description"
              rows={2}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              maxLength={300}
              placeholder="120-155 characters, leads with the primary keyword phrase"
            />
          </label>
        </div>
        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Open Graph / social share image</span>
            <input name="og_image_url" type="url" defaultValue={post?.og_image_url ?? ""} placeholder="https://... (1200x630 recommended)" />
            <span style={{ fontSize: 12, color: "var(--text-muted, #6B7280)" }}>
              Image shown when the post is shared on Twitter, LinkedIn, Facebook. Falls back to hero image if blank.
            </span>
          </label>
          <label className="admin-field">
            <span className="admin-label">Canonical URL</span>
            <input
              name="canonical_url"
              type="url"
              defaultValue={post?.canonical_url ?? ""}
              placeholder="Leave blank to default to /post/<slug>"
            />
          </label>
        </div>

        {/* LIFECYCLE */}
        <h2 className="admin-section-h2" style={{ marginTop: 32, marginBottom: 12 }}>Lifecycle</h2>
        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Status</span>
            <select name="status" required defaultValue={post?.status ?? "draft"}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span className="admin-label">Published date</span>
            <input
              name="published_at"
              type="date"
              defaultValue={isoDateInput(post?.published_at)}
            />
          </label>
        </div>

        <div className="admin-form-actions">
          <Link href="/board/blogs" className="admin-btn admin-btn--ghost">Cancel</Link>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={pending}>
            {pending ? "Saving..." : isEdit ? "Save changes" : "Create post"}
          </button>
        </div>
      </form>

      {isEdit && (
        <div className="admin-danger-zone">
          <div className="admin-danger-head">Danger zone</div>
          <p className="admin-danger-desc">
            Deleting a post is permanent. View counts and stats are lost too.
          </p>
          <button
            type="button"
            className="admin-btn admin-btn--danger"
            onClick={handleDelete}
            disabled={pending}
          >
            Delete post
          </button>
        </div>
      )}
    </div>
  );
}
