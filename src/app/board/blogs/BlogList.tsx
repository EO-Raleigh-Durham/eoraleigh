"use client";

import { formatBlogDate, type BlogPost, type BlogStatus } from "@/lib/blog";

type Props = {
  posts: BlogPost[];
  emptyMessage: string;
  onSelect: (id: string) => void;
};

const STATUS_LABEL: Record<BlogStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

function statusToneClass(status: BlogStatus): string {
  switch (status) {
    case "published":
      return "admin-badge admin-badge--ok";
    case "draft":
    case "scheduled":
      return "admin-badge admin-badge--neutral";
    case "archived":
      return "admin-badge admin-badge--muted";
    default:
      return "admin-badge";
  }
}

export function BlogList({ posts, emptyMessage, onSelect }: Props) {
  if (posts.length === 0) {
    return emptyMessage ? <div className="admin-stub">{emptyMessage}</div> : null;
  }
  return (
    <div className="admin-table-wrap">
      <table className="admin-table admin-table--clickable">
        <thead>
          <tr>
            <th>Title</th>
            <th>Primary keyword</th>
            <th>SEO</th>
            <th>Status</th>
            <th>Views</th>
            <th>Published</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => {
            const seoComplete = !!(
              p.meta_title &&
              p.meta_description &&
              p.og_image_url &&
              p.primary_keyword
            );
            return (
              <tr
                key={p.id}
                onClick={() => onSelect(p.id)}
                tabIndex={0}
                role="button"
                aria-label={`Open shelf for ${p.title}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(p.id);
                  }
                }}
              >
                <td>
                  <span className="admin-table-link">{p.title}</span>
                  {p.featured && (
                    <span className="admin-pill admin-pill--accent">Featured</span>
                  )}
                  {p.external_url && (
                    <span className="admin-pill admin-pill--neutral">External</span>
                  )}
                </td>
                <td className="admin-table-meta">
                  {p.primary_keyword ? (
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>
                      {p.primary_keyword}
                    </span>
                  ) : (
                    <span style={{ color: "var(--eo-pink, #FF346E)" }}>Missing</span>
                  )}
                </td>
                <td>
                  <span
                    className={`admin-badge ${seoComplete ? "admin-badge--ok" : "admin-badge--neutral"}`}
                  >
                    {seoComplete ? "Complete" : "Incomplete"}
                  </span>
                </td>
                <td>
                  <span className={statusToneClass(p.status)}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </td>
                <td className="admin-table-meta">{p.view_count}</td>
                <td className="admin-table-meta">{formatBlogDate(p.published_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
