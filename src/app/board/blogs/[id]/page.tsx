import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogForm } from "../BlogForm";
import { SeoPreview } from "../SeoPreview";
import { getBlogPostById } from "@/lib/blog";
import { getEventPickerOptions } from "@/lib/event-recap-link";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Edit post",
  description: `Edit, publish, or unpublish an existing post on the ${CHAPTER_NAME} blog.`,
};
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ saved?: string }>;

export default async function EditBlogPostPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const post = await getBlogPostById(id);
  if (!post) notFound();
  const eventOptions = await getEventPickerOptions();

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-breadcrumb">
          <Link href="/board/blogs">Blogs</Link>
          <span>/</span>
          <span>{post.title}</span>
        </div>
        <h1 className="admin-page-title">Edit post</h1>
        <p className="admin-page-sub">
          Public URL:{" "}
          {post.external_url ? (
            <a href={post.external_url} target="_blank" rel="noreferrer" className="admin-link-action">
              {post.external_url} ↗
            </a>
          ) : (
            <Link href={`/post/${post.slug}`} className="admin-link-action">
              /post/{post.slug}
            </Link>
          )}
          {" · "}Views: <strong>{post.view_count}</strong>
        </p>
      </div>
      <SeoPreview post={post} />

      <BlogForm post={post} saved={saved === "1"} eventOptions={eventOptions} />
    </div>
  );
}
