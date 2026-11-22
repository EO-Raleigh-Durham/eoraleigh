import { getBlogPosts, publicPosts } from "@/lib/blog";
import { PINNED_BLOG_POSTS } from "@/content/pinned-blog-posts";
import { PINNED_RECAP_CARDS } from "@/content/blog-recap-cards";

export type SitePost = { title: string; href: string; date: string };

// Everything published on the public blog, newest first: blog editor posts,
// static posts under /post and event recap cards. Deduplicated by link.
export async function listPublishedSitePosts(): Promise<SitePost[]> {
  const dbPosts = await getBlogPosts({ status: "published" });
  const posts: SitePost[] = [
    ...publicPosts(dbPosts).map((p) => ({ title: p.title, href: `/blog/${p.slug}`, date: p.published_at ?? "" })),
    ...PINNED_BLOG_POSTS.map((p) => ({ title: p.title, href: `/post/${p.slug}`, date: p.published_at ?? "" })),
    ...PINNED_RECAP_CARDS.map((c) => ({ title: c.title, href: c.href, date: c.date ?? "" })),
  ]
    .filter((p) => p.date)
    .sort((a, b) => b.date.localeCompare(a.date));
  const seen = new Set<string>();
  return posts.filter((p) => (seen.has(p.href) ? false : (seen.add(p.href), true)));
}
