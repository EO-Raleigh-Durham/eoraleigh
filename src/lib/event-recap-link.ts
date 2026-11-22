import { supabase } from "./supabase";
import { eventPath } from "./events";

// Server-only loaders for the blog-post <-> event link (migration 084).
//
// Both directions return the minimum needed to render a cross-link card, not
// whole rows: these feed public pages, so nothing sensitive is carried across.
// Every read is defensive about the column not existing yet, so the app can
// deploy before the migration is applied.

export type LinkedEvent = {
  id: string;
  slug: string | null;
  title: string;
  startsAt: string;
  location: string | null;
  coverImageUrl: string | null;
  href: string;
};

export type LinkedPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  heroImageUrl: string | null;
  readTimeMinutes: number | null;
  href: string;
};

// A missing event_id / recap column reads as "no link" rather than an error,
// so the pages keep rendering between deploy and migration.
function isMissingColumn(message: string): boolean {
  return /column .* does not exist/i.test(message);
}

export async function getEventForPost(postId: string): Promise<LinkedEvent | null> {
  const { data: postRow, error: postError } = await supabase
    .from("blog_posts")
    .select("event_id")
    .eq("id", postId)
    .maybeSingle();

  if (postError) {
    if (!isMissingColumn(postError.message)) {
      console.warn("getEventForPost:", postError.message);
    }
    return null;
  }

  const eventId = (postRow as { event_id: string | null } | null)?.event_id;
  if (!eventId) return null;

  const { data, error } = await supabase
    .from("events")
    .select("id, slug, title, starts_at, location, cover_image_url, status")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.warn("getEventForPost event:", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as {
    id: string;
    slug: string | null;
    title: string;
    starts_at: string;
    location: string | null;
    cover_image_url: string | null;
    status: string;
  };

  // Never point the public site at an event that is not itself public.
  if (row.status === "draft" || row.status === "cancelled") return null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    startsAt: row.starts_at,
    location: row.location,
    coverImageUrl: row.cover_image_url,
    href: eventPath({ id: row.id, slug: row.slug }),
  };
}

export async function getPostForEvent(eventId: string): Promise<LinkedPost | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, hero_image_url, read_time_minutes, status, audience")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    if (!isMissingColumn(error.message)) {
      console.warn("getPostForEvent:", error.message);
    }
    return null;
  }
  if (!data) return null;

  const row = data as {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    hero_image_url: string | null;
    read_time_minutes: number | null;
    status: string;
  };

  // Only a published post is worth linking to. Members-only posts are still
  // linked: the member gate on /post/[slug] is a conversion surface, and the
  // decision on 11 Aug was that a public recap still points at them.
  if (row.status !== "published") return null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    heroImageUrl: row.hero_image_url,
    readTimeMinutes: row.read_time_minutes,
    href: `/post/${row.slug}`,
  };
}

// Options for the board blog form's event picker: past and current events,
// newest first, so marketing tags the event they just ran.
export type EventPickerOption = {
  id: string;
  title: string;
  startsAt: string;
  takenByPostId: string | null;
};

export async function getEventPickerOptions(): Promise<EventPickerOption[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, starts_at, status")
    .not("status", "in", '("draft","cancelled")')
    .order("starts_at", { ascending: false })
    .limit(200);

  if (error) {
    console.warn("getEventPickerOptions:", error.message);
    return [];
  }

  const events = (data ?? []) as { id: string; title: string; starts_at: string }[];
  if (events.length === 0) return [];

  // One post per event, so mark the events already claimed. The unique index
  // is the real enforcement; this is only so the picker can say so up front.
  const { data: taken, error: takenError } = await supabase
    .from("blog_posts")
    .select("id, event_id")
    .in("event_id", events.map((e) => e.id));

  const claimed = new Map<string, string>();
  if (takenError) {
    if (!isMissingColumn(takenError.message)) {
      console.warn("getEventPickerOptions taken:", takenError.message);
    }
  } else {
    for (const row of (taken ?? []) as { id: string; event_id: string | null }[]) {
      if (row.event_id) claimed.set(row.event_id, row.id);
    }
  }

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    startsAt: e.starts_at,
    takenByPostId: claimed.get(e.id) ?? null,
  }));
}
