import Link from "next/link";
import { BlogForm } from "../BlogForm";
import { getEventPickerOptions } from "@/lib/event-recap-link";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "New post",
  description: `Write a new post for the ${CHAPTER_NAME} blog.`,
};
export const dynamic = "force-dynamic";

export default async function NewBlogPostPage() {
  const eventOptions = await getEventPickerOptions();

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-breadcrumb">
          <Link href="/board/blogs">Blogs</Link>
          <span>/</span>
          <span>New</span>
        </div>
        <h1 className="admin-page-title">Create post</h1>
        <p className="admin-page-sub">
          Save as draft to keep it private. Use Body blocks for native posts; or set External URL to redirect to a Wix or other external page.
        </p>
      </div>
      <BlogForm eventOptions={eventOptions} />
    </div>
  );
}
