"use client";

import { useState } from "react";
import type { BlogPost } from "@/lib/blog";
import { BlogList } from "./BlogList";
import { BlogShelf } from "./BlogShelf";

type Props = {
  posts: BlogPost[];
};

// Top-level client wrapper for the blog admin. Holds the selected post
// id, groups posts into the draft/published/archived sections, and
// renders one shelf shared across every section (mirrors MembersShell).

export function BlogsShell({ posts }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId
    ? posts.find((p) => p.id === selectedId) ?? null
    : null;

  const drafts = posts.filter(
    (p) => p.status === "draft" || p.status === "scheduled",
  );
  const published = posts.filter((p) => p.status === "published");
  const archived = posts.filter((p) => p.status === "archived");

  return (
    <>
      <h2 className="admin-section-title">
        Drafts &amp; scheduled ({drafts.length})
      </h2>
      <BlogList posts={drafts} emptyMessage="No drafts." onSelect={setSelectedId} />

      <h2 className="admin-section-title" style={{ marginTop: 40 }}>
        Published ({published.length})
      </h2>
      <BlogList
        posts={published}
        emptyMessage="No published posts yet."
        onSelect={setSelectedId}
      />

      {archived.length > 0 && (
        <>
          <h2 className="admin-section-title" style={{ marginTop: 40 }}>
            Archived ({archived.length})
          </h2>
          <BlogList posts={archived} emptyMessage="" onSelect={setSelectedId} />
        </>
      )}

      {selected && (
        <BlogShelf post={selected} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}
