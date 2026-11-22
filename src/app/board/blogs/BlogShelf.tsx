"use client";

import { useEffect, useState } from "react";
import { formatBlogDate, type BlogPost, type BlogStatus } from "@/lib/blog";
import { BlogForm } from "./BlogForm";
import { SeoPreview } from "./SeoPreview";

type Props = {
  post: BlogPost;
  onClose: () => void;
};

type Tab = "overview" | "seo" | "edit";

const STATUS_LABEL: Record<BlogStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

export function BlogShelf({ post, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("overview");

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
        aria-label={`Blog post ${post.title}`}
      >
        <div className="admin-shelf-head">
          <div>
            <div className="admin-shelf-eyebrow">
              {STATUS_LABEL[post.status]}
            </div>
            <h2 className="admin-shelf-title">{post.title}</h2>
            <div className="admin-shelf-sub">/post/{post.slug}</div>
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
                ["seo", "SEO"],
                ["edit", "Edit"],
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
              <Section title="Summary">
                <Field label="Status" value={STATUS_LABEL[post.status]} />
                <Field label="Category" value={post.category ?? "—"} />
                <Field
                  label="Featured"
                  value={post.featured ? "Yes" : "No"}
                />
                <Field
                  label="External URL"
                  value={post.external_url ?? "—"}
                />
              </Section>
              <Section title="Authorship">
                <Field label="Author" value={post.author_name ?? "—"} />
                <Field label="Role" value={post.author_role ?? "—"} />
                <Field label="Series" value={post.series ?? "—"} />
              </Section>
              <Section title="Engagement">
                <Field label="Views" value={String(post.view_count)} />
                <Field
                  label="Read time"
                  value={
                    post.read_time_minutes != null
                      ? `${post.read_time_minutes} min`
                      : "—"
                  }
                />
                <Field
                  label="Published"
                  value={formatBlogDate(post.published_at) || "—"}
                />
              </Section>
              {post.excerpt && (
                <Section title="Excerpt">
                  <p className="admin-shelf-notes">{post.excerpt}</p>
                </Section>
              )}
            </>
          )}

          {tab === "seo" && <SeoPreview post={post} />}

          {tab === "edit" && <BlogForm post={post} />}
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
