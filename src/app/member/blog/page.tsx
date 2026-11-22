import type { Metadata } from "next";
import { BlogIndex } from "@/app/blog/BlogIndex";
import { getMemberBlogIndex } from "@/lib/member-blog";
import { requireMemberOrAbove } from "@/lib/auth";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata: Metadata = { title: "Blog" };
export const dynamic = "force-dynamic";

export default async function PortalBlogPage() {
  await requireMemberOrAbove();
  const { posts, eventRecaps } = await getMemberBlogIndex();

  return (
    <div className="blog-page">
      <section className="section section--tight">
        <div className="container">
          <span className="eyebrow eyebrow--accent">Blog</span>
          <h1 className="display-3" style={{ marginTop: 12, marginBottom: 8 }}>
            {CHAPTER_NAME} blog
          </h1>
          <p className="lead text-muted" style={{ marginBottom: 8 }}>
            Stories and playbooks from {CHAPTER_NAME} members.
          </p>
        </div>
      </section>

      {posts.length === 0 && eventRecaps.length === 0 ? (
        <section className="section section--tight">
          <div className="container container--text">
            <p className="text-muted">No posts yet. New writing will appear here.</p>
          </div>
        </section>
      ) : (
        <BlogIndex posts={posts} eventRecaps={eventRecaps} />
      )}
    </div>
  );
}
