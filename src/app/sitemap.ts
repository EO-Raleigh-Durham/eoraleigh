import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { canView } from "@/lib/access";
import { eventAudience } from "@/lib/events";
import { CHAPTER_SITE_URL } from "@/kernel/config/chapter";
import { STATIC_POST_SITEMAP } from "@/content/static-posts-sitemap";

const SITE_URL = CHAPTER_SITE_URL;

type StaticEntry = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

const STATIC_ROUTES: StaticEntry[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/board-of-directors", changeFrequency: "monthly", priority: 0.6 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
  { path: "/community-events", changeFrequency: "weekly", priority: 0.7 },
  { path: "/directory", changeFrequency: "monthly", priority: 0.6 },
  { path: "/events", changeFrequency: "weekly", priority: 0.9 },
  { path: "/forum", changeFrequency: "monthly", priority: 0.9 },
  { path: "/join", changeFrequency: "monthly", priority: 0.9 },
  { path: "/partners", changeFrequency: "monthly", priority: 0.6 },
  { path: "/past-events", changeFrequency: "monthly", priority: 0.6 },
  { path: "/path-of-leadership", changeFrequency: "monthly", priority: 0.7 },
  { path: "/podcast", changeFrequency: "weekly", priority: 0.7 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/training", changeFrequency: "monthly", priority: 0.7 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const [blogUrls, eventUrls] = await Promise.all([
    blogSitemapEntries(),
    eventSitemapEntries(),
  ]);

  return [...staticUrls, ...blogUrls, ...eventUrls];
}

async function blogSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const { data, error } = await supabase
    .from("blog_posts")
    // select('*') so a not-yet-migrated 'audience' column can never error the
    // query (it would just be absent -> treated as public below).
    .select("*")
    .eq("status", "published");

  if (error) {
    console.warn("sitemap blog:", error.message);
    return [];
  }

  const entries: MetadataRoute.Sitemap = (data ?? [])
    // Member-only posts are not indexed: keep them out of the public sitemap.
    .filter((p) => !p.external_url && p.audience !== "members")
    .map((p) => ({
      url: `${SITE_URL}/post/${p.slug}`,
      lastModified: new Date(p.updated_at ?? p.published_at ?? Date.now()),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  // Pinned editorial posts that live at /post/<slug> as static routes, not in
  // blog_posts. Kept in the sitemap by hand (src/content/static-posts-sitemap.ts).
  for (const post of STATIC_POST_SITEMAP) {
    entries.push({
      url: `${SITE_URL}/post/${post.slug}`,
      lastModified: new Date(post.lastModified),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return entries;
}

async function eventSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const { data, error } = await supabase
    .from("events")
    .select("id, slug, status, updated_at, starts_at, audience, visibility")
    .not("status", "eq", "draft");

  if (error) {
    console.warn("sitemap events:", error.message);
    return [];
  }

  return (data ?? [])
    .filter((e) => canView(null, eventAudience(e)))
    .map((e) => ({
      url: `${SITE_URL}/events/${e.slug ?? e.id}`,
      lastModified: new Date(e.updated_at ?? e.starts_at ?? Date.now()),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
}
