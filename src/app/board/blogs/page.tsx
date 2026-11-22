import Link from "next/link";
import { getBlogPosts } from "@/lib/blog";
import { BlogsShell } from "./BlogsShell";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Blogs",
  description: `All ${CHAPTER_NAME} blog posts, drafts and published, with publishing controls.`,
};
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ deleted?: string; error?: string }>;

export default async function BlogsAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const posts = await getBlogPosts({ includeDrafts: true });

  return (
    <div>
      <div className="admin-page-head admin-page-head--row">
        <div>
          <div className="admin-eyebrow">Blogs</div>
          <h1 className="admin-page-title">Blog posts</h1>
          <p className="admin-page-sub">
            Posts publish to /blog and individual posts live at /post/[slug]. External-URL posts (Wix) redirect from /post/[slug] to the original.
          </p>
        </div>
        <Link href="/board/blogs/new" className="admin-btn admin-btn--primary">
          New post
        </Link>
      </div>

      {sp.deleted && <div className="admin-banner admin-banner--ok">Post deleted.</div>}
      {sp.error && <div className="admin-banner admin-banner--err">{sp.error}</div>}

      <BlogsShell posts={posts} />
    </div>
  );
}
