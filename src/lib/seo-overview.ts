import { supabase } from "./supabase";
import { STATIC_PAGES } from "@/content/seo-static-pages";

// ============================================================
// Unified SEO entry type for the /board/seo overview page
// ============================================================

export type SeoEntryKind = "page" | "blog" | "event";

export type SeoEntry = {
  kind: SeoEntryKind;
  id: string;             // unique id for the row (slug for static, UUID for DB rows)
  path: string;           // URL path (e.g. "/about")
  slug: string | null;    // shown as the human-readable slug column
  title: string | null;
  description: string | null;
  ogImageUrl: string | null;
  primaryKeyword: string | null;
  editHref: string | null; // link into the admin to edit this entry, when applicable
  status?: string;        // for events: published/draft/etc; for blogs: status; null for pages
};

function pathToSlug(path: string): string {
  if (path === "/") return "home";
  return path.replace(/^\//, "");
}

function staticEntries(): SeoEntry[] {
  return STATIC_PAGES.map((p) => ({
    kind: "page",
    id: `page:${p.path}`,
    path: p.path,
    slug: pathToSlug(p.path),
    title: p.title,
    description: p.description,
    // null = page has no image of its own and relies on the site-wide backup
    // (DEFAULT_OG_IMAGE). Surfaced as a gap so each page earns a real image.
    ogImageUrl: p.ogImageUrl ?? null,
    primaryKeyword: p.primaryKeyword,
    editHref: null,              // static pages are edited in code
  }));
}

async function blogEntries(): Promise<SeoEntry[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, slug, title, meta_title, excerpt, meta_description, og_image_url, hero_image_url, primary_keyword, status, external_url",
    )
    .order("published_at", { ascending: false, nullsFirst: false });
  if (error) {
    console.warn("blogEntries:", error.message);
    return [];
  }
  return (data ?? []).map((p) => {
    const path = p.external_url ?? `/post/${p.slug}`;
    return {
      kind: "blog",
      id: `blog:${p.id}`,
      path,
      slug: p.slug,
      title: p.meta_title ?? p.title ?? null,
      description: p.meta_description ?? p.excerpt ?? null,
      ogImageUrl: p.og_image_url ?? p.hero_image_url ?? null,
      primaryKeyword: p.primary_keyword ?? null,
      editHref: `/board/blogs/${p.id}`,
      status: p.status,
    } as SeoEntry;
  });
}

// Only events that are actually served to the public belong in an SEO
// overview. Drafts return notFound on the public detail page, and cancelled
// events are pulled down, so neither is indexable. Excluding them keeps the
// "missing metadata" counts focused on pages search engines can really see.
const PUBLIC_EVENT_STATUSES = ["published", "open", "closed", "completed"];

async function eventEntries(): Promise<SeoEntry[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, blurb, cover_image_url, status, starts_at, primary_keyword")
    .in("status", PUBLIC_EVENT_STATUSES)
    .order("starts_at", { ascending: false });
  if (error) {
    console.warn("eventEntries:", error.message);
    return [];
  }
  return (data ?? []).map((e) => ({
    kind: "event",
    id: `event:${e.id}`,
    path: `/events/${e.id}`,
    slug: e.id, // events use UUIDs; surface that fact in the slug column
    title: e.title ?? null,
    description: e.blurb ?? null,
    ogImageUrl: e.cover_image_url ?? null,
    primaryKeyword: e.primary_keyword ?? null,
    editHref: `/board/events/${e.id}`,
    status: e.status,
  }));
}

export async function getAllSeoEntries(): Promise<SeoEntry[]> {
  const [blogs, events] = await Promise.all([blogEntries(), eventEntries()]);
  return [...staticEntries(), ...blogs, ...events];
}

// ============================================================
// Health summary
// ============================================================

export type SeoHealth = {
  total: number;
  missingTitle: number;
  missingDescription: number;
  missingOgImage: number;
  missingPrimaryKeyword: number;
};

export function summarizeHealth(entries: SeoEntry[]): SeoHealth {
  const summary: SeoHealth = {
    total: entries.length,
    missingTitle: 0,
    missingDescription: 0,
    missingOgImage: 0,
    missingPrimaryKeyword: 0,
  };
  for (const e of entries) {
    if (!e.title) summary.missingTitle++;
    if (!e.description) summary.missingDescription++;
    if (!e.ogImageUrl) summary.missingOgImage++;
    // Primary keyword counted for content (blogs + events), not static pages
    // (which track keywords in code). Past events are evergreen content and
    // should rank, so a missing keyword is a real gap.
    if (e.kind !== "page" && !e.primaryKeyword) summary.missingPrimaryKeyword++;
  }
  return summary;
}
