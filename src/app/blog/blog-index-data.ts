import "server-only";

import { getBlogPosts, publicPosts, type BlogPost } from "@/lib/blog";
import { getViewableEvents, eventPath } from "@/lib/events";
import { hasStaticRecap } from "@/content/event-recaps";
import { PINNED_RECAP_CARDS } from "@/content/blog-recap-cards";
import { PINNED_BLOG_POSTS } from "@/content/pinned-blog-posts";
import type { EventRecapCard } from "./BlogIndex";

// Events whose recap surfaces as its own pinned post card (see
// PINNED_RECAP_CARDS) instead of through the usual event-card link.
const RECAP_CARD_HIDES_EVENT_SLUGS = new Set([
  "build-your-first-ai-agent",
  "demystifying-dementia-with-dr-henry-brodaty",
  "tune-your-inner-voice",
]);

// The data behind the blog index, shared by the public /blog page and the
// member-area Blog page so both show the same posts and event recaps.
export async function getBlogIndexData(): Promise<{
  posts: BlogPost[];
  eventRecaps: EventRecapCard[];
}> {
  // Member-only posts are left off the public index.
  // Static one-off posts (PINNED_BLOG_POSTS) merge in alongside the normal
  // DB-backed posts, the non-recap counterpart to PINNED_RECAP_CARDS below.
  const posts = publicPosts(await getBlogPosts({ status: "published" }))
    .concat(PINNED_BLOG_POSTS)
    .sort(
      (a, b) =>
        new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime(),
    );

  // Past events with a recap (published DB recap or a static one) surface under
  // the "Event recaps" filter as cards that link out to the event page.
  const pastEvents = await getViewableEvents(null, {
    status: ["published", "open", "closed", "completed"],
    before: new Date(),
    order: "desc",
  });
  const eventRecaps = pastEvents
    .filter(
      (e) =>
        (e.recap_published || hasStaticRecap(e.slug)) &&
        !(e.slug && RECAP_CARD_HIDES_EVENT_SLUGS.has(e.slug)),
    )
    .map(
      (e): EventRecapCard => ({
        id: e.id,
        title: e.title,
        blurb: e.blurb,
        image: e.cover_image_url,
        href: eventPath(e),
        date: e.starts_at,
      }),
    )
    .concat(PINNED_RECAP_CARDS)
    .sort(
      (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime(),
    );

  return { posts, eventRecaps };
}
