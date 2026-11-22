import { CHAPTER_TIME_ZONE } from "../kernel/config/chapter.ts";
import { supabase } from "./supabase";

// ============================================================
// Block vocabulary
// Discriminated union. The renderer in src/components/blog/BlockRenderer.tsx
// maps each tag to hand-styled JSX. Adding a new tag is a code change on
// purpose: brand stays consistent.
// ============================================================

export type Block =
  | { tag: "p" | "h2" | "h3" | "h4" | "blockquote" | "li"; text: string }
  | { tag: "pull-quote"; text: string; attribution?: string }
  | { tag: "emphasis-box"; text: string; label?: string }
  | { tag: "tl-dr"; items: string[] }
  | {
      tag: "stat-callout";
      stats: Array<{ value: string; label: string; color?: "blue" | "mint" | "magenta" }>;
    }
  | { tag: "callout"; label: string; text: string; tone?: "info" | "warn" | "success" }
  | { tag: "conclusion-box"; title: string; paragraphs: string[] }
  | { tag: "faq"; question: string; answer: string }
  | { tag: "image"; src: string; alt: string; caption?: string }
  | {
      tag: "photo-strip";
      images: Array<{ src: string; alt: string; caption?: string }>;
      label?: string;
    }
  | {
      tag: "photo-gallery";
      images: Array<{ src: string; alt: string; caption?: string }>;
      label?: string;
    }
  | {
      tag: "testimonial-row";
      items: Array<{
        quote: string;
        name: string;
        role?: string;
        rating?: number;
        photoUrl?: string;
      }>;
    }
  | { tag: "shipped-list"; title: string; items: string[] }
  | { tag: "step-card"; eyebrow?: string; title: string; body: Block[] }
  | { tag: "phase-lane"; lanes: Array<{ title: string; items: string[] }> }
  | { tag: "cta-button"; label: string; href: string; tone?: "primary" | "ghost" }
  | { tag: "html"; html: string };

export type BlogStatus = "draft" | "scheduled" | "published" | "archived";

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  blocks: Block[] | null;
  external_url: string | null;
  category: string | null;
  tags: string[];
  hero_image_url: string | null;
  read_time_minutes: number | null;
  featured: boolean;
  author_name: string | null;
  author_role: string | null;
  series: string | null;
  series_total: number | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  primary_keyword: string | null;
  secondary_keywords: string[];
  status: BlogStatus;
  // The event this post recaps (migration 084). Tagging a post to an event is
  // the trigger for the recap program. Optional on the type so a blog_posts row
  // read before the migration lands still satisfies BlogPost.
  event_id?: string | null;
  // 'public' (default) or 'members'. Filtered in JS (not in the query) so the
  // public blog keeps working even before migration 054 adds the column: a row
  // with no audience is treated as 'public'. See isMemberOnly / splitByAudience.
  audience?: "public" | "members" | null;
  published_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
};

// A post is member-only only when explicitly tagged. Anything else (including
// the column not existing yet) reads as public — the safe default.
export function isMemberOnly(post: Pick<BlogPost, "audience">): boolean {
  return post.audience === "members";
}

export function publicPosts(posts: BlogPost[]): BlogPost[] {
  return posts.filter((p) => !isMemberOnly(p));
}

// ============================================================
// Loaders
// ============================================================

export type BlogQuery = {
  status?: BlogStatus | BlogStatus[];
  category?: string;
  featured?: boolean;
  limit?: number;
  includeDrafts?: boolean;
};

export async function getBlogPosts(q: BlogQuery = {}): Promise<BlogPost[]> {
  let query = supabase.from("blog_posts").select("*");

  if (q.status !== undefined) {
    query = Array.isArray(q.status)
      ? query.in("status", q.status)
      : query.eq("status", q.status);
  } else if (!q.includeDrafts) {
    query = query.eq("status", "published");
  }

  if (q.category) query = query.eq("category", q.category);
  if (q.featured !== undefined) query = query.eq("featured", q.featured);

  query = query.order("published_at", { ascending: false, nullsFirst: false });
  if (q.limit) query = query.limit(q.limit);

  const { data, error } = await query;
  if (error) {
    console.warn("getBlogPosts:", error.message);
    return [];
  }
  return (data ?? []) as BlogPost[];
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.warn("getBlogPostBySlug:", error.message);
    return null;
  }
  return (data as BlogPost | null) ?? null;
}

// Minimal first read for the public /post/[slug] route. Member-only content is
// authorized from this descriptor before the service client loads the post
// body, keeping unauthorized guest requests away from the sensitive payload.
export async function getBlogPostAudienceBySlug(
  slug: string,
): Promise<Pick<BlogPost, "audience"> | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("audience")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.warn("getBlogPostAudienceBySlug:", error.message);
    return null;
  }
  return data as Pick<BlogPost, "audience"> | null;
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.warn("getBlogPostById:", error.message);
    return null;
  }
  return (data as BlogPost | null) ?? null;
}

export async function incrementBlogView(slug: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("increment_blog_view", {
    post_slug: slug,
  });
  if (error) {
    console.warn("incrementBlogView:", error.message);
    return null;
  }
  return (data as number | null) ?? null;
}

// ============================================================
// Display helpers
// ============================================================

export function formatBlogDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: CHAPTER_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
