import type { Metadata } from "next";
import Link from "next/link";
import { requireMemberOrAbove } from "@/lib/auth";
import { roleAtLeast } from "@/lib/access";
import { listGalleryPhotos } from "@/lib/chapter-photos-server";
import { PhotoGallery } from "./PhotoGallery";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata: Metadata = {
  title: "Chapter photos",
  description: `Photos from ${CHAPTER_NAME} events and gatherings, shared by members and the board.`,
};
export const dynamic = "force-dynamic";

export default async function MemberPhotosPage() {
  const user = await requireMemberOrAbove();
  const photos = await listGalleryPhotos();

  return (
    <section className="section">
      <div className="container">
        <span className="eyebrow eyebrow--accent">Chapter photos</span>
        <div className="ptl-photo-head">
          <h1 className="display-3" style={{ marginTop: 12, marginBottom: 8 }}>
            Moments from the chapter
          </h1>
          <Link href="/member/photos/upload" className="btn btn--primary">
            Upload photos
          </Link>
        </div>
        <p className="lead text-muted" style={{ marginBottom: 32 }}>
          Photos shared by members and the board. Only signed-in members can see them.
        </p>

        {photos.length === 0 ? (
          <p className="text-muted">
            No photos yet. <Link href="/member/photos/upload">Upload the first ones</Link>
          </p>
        ) : (
          <PhotoGallery
            photos={photos}
            viewerUserId={user.userId}
            viewerIsBoard={roleAtLeast(user.role, "board")}
          />
        )}
      </div>
    </section>
  );
}
