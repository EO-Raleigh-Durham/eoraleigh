"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SeoEntry, SeoEntryKind } from "@/lib/seo-overview";

type Filter = "all" | SeoEntryKind;

const KIND_LABEL: Record<SeoEntryKind, string> = {
  page: "Page",
  blog: "Blog",
  event: "Event",
};

const KIND_TONE: Record<SeoEntryKind, string> = {
  page: "admin-badge--neutral",
  blog: "admin-badge--ok",
  event: "admin-badge--muted",
};

type Props = {
  entries: SeoEntry[];
};

export function SeoTable({ entries }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const acc: Record<SeoEntryKind | "all", number> = {
      all: entries.length,
      page: 0,
      blog: 0,
      event: 0,
    };
    for (const e of entries) acc[e.kind]++;
    return acc;
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filter !== "all" && e.kind !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = [e.title, e.path, e.slug, e.primaryKeyword, e.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, filter, query]);

  return (
    <div>
      <div className="seo-toolbar">
        <div className="seo-filters">
          {(["all", "page", "blog", "event"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`seo-filter ${filter === f ? "is-active" : ""}`.trim()}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : KIND_LABEL[f as SeoEntryKind] + "s"}
              <span className="seo-filter-count">({counts[f]})</span>
            </button>
          ))}
        </div>
        <input
          className="seo-search"
          type="search"
          placeholder="Search title, slug, path, or keyword"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="admin-table-wrap" style={{ marginTop: 16 }}>
        <table className="admin-table seo-table">
          <thead>
            <tr>
              <th style={{ width: 100 }}>Type</th>
              <th>Slug / Path</th>
              <th>Primary keyword</th>
              <th>Title</th>
              <th>Description</th>
              <th style={{ width: 90 }}>OG image</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <SeoRow key={e.id} entry={e} />
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="admin-stub" style={{ marginTop: 12 }}>
          No entries match.
        </div>
      )}
    </div>
  );
}

function SeoRow({ entry: e }: { entry: SeoEntry }) {
  const titleLen = (e.title ?? "").length;
  const descLen = (e.description ?? "").length;
  const titleTone =
    titleLen === 0 ? "missing" :
    titleLen > 70 ? "warn" : titleLen > 60 ? "warn" : "ok";
  const descTone =
    descLen === 0 ? "missing" :
    descLen > 170 ? "warn" : descLen > 155 ? "warn" : descLen < 80 ? "warn" : "ok";

  return (
    <tr>
      <td>
        <span className={`admin-badge ${KIND_TONE[e.kind]}`}>{KIND_LABEL[e.kind]}</span>
      </td>
      <td>
        <div className="seo-row-slug">{e.slug}</div>
        <div className="seo-row-path mono">{e.path}</div>
      </td>
      <td className="admin-table-meta">
        {e.primaryKeyword ? (
          <span style={{ fontWeight: 600, color: "var(--text)" }}>{e.primaryKeyword}</span>
        ) : (
          <span style={{ color: e.kind === "page" ? "var(--text-muted, #6B7280)" : "#B91C1C" }}>
            {e.kind === "page" ? "—" : "Missing"}
          </span>
        )}
      </td>
      <td>
        {e.title ? (
          <>
            <div className="seo-cell-text">{e.title}</div>
            <div className={`seo-cell-meta seo-cell-meta--${titleTone}`}>
              {titleLen} chars
            </div>
          </>
        ) : (
          <span style={{ color: "#B91C1C", fontSize: 13 }}>Missing</span>
        )}
      </td>
      <td>
        {e.description ? (
          <>
            <div className="seo-cell-text seo-cell-text--small">{e.description}</div>
            <div className={`seo-cell-meta seo-cell-meta--${descTone}`}>
              {descLen} chars
            </div>
          </>
        ) : (
          <span style={{ color: "#B91C1C", fontSize: 13 }}>Missing</span>
        )}
      </td>
      <td>
        {e.ogImageUrl ? (
          <div
            className="seo-thumb"
            style={{ backgroundImage: `url(${e.ogImageUrl})` }}
            title={e.ogImageUrl}
          />
        ) : (
          <div className="seo-thumb seo-thumb--empty" title="No custom image — uses the site default">
            <span>—</span>
          </div>
        )}
      </td>
      <td>
        {e.editHref && (
          <Link href={e.editHref} className="admin-link-action">
            Edit
          </Link>
        )}
      </td>
    </tr>
  );
}
