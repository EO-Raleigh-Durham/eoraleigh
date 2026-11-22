// Static editorial posts (src/app/post/<slug>/page.tsx) that are not rows in
// blog_posts, so the sitemap lists them by hand. lastModified is ISO 8601.
export const STATIC_POST_SITEMAP: { slug: string; lastModified: string }[] = [];
