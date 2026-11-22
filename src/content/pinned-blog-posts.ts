import type { BlogPost } from "@/lib/blog";

// One-off static posts (src/app/post/<slug>/page.tsx) pinned directly into the
// blog's regular "Blog" listing. getBlogPosts() only reads the blog_posts
// table, so a static post needs a listing record here to appear on /blog.
export const PINNED_BLOG_POSTS: BlogPost[] = [];
