import type { Metadata } from "next";
import Link from "next/link";
import { requireMemberOrAbove } from "@/lib/auth";
import { MAX_PHOTO_BYTES, MAX_PHOTOS_PER_BATCH } from "@/lib/chapter-photos";
import { PhotoUploader } from "./PhotoUploader";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata: Metadata = {
  title: "Upload photos",
  description: `Add photos to the ${CHAPTER_NAME} chapter gallery, with an optional caption for each.`,
};
export const dynamic = "force-dynamic";

export default async function UploadPhotosPage() {
  await requireMemberOrAbove();
  return (
    <section className="section">
      <div className="container container--text">
        <span className="eyebrow eyebrow--accent">Chapter photos</span>
        <h1 className="display-3" style={{ marginTop: 12, marginBottom: 8 }}>
          Upload photos
        </h1>
        <p className="lead text-muted" style={{ marginBottom: 32 }}>
          Drop up to {MAX_PHOTOS_PER_BATCH} photos at once (JPG, PNG, WebP or GIF, up to{" "}
          {MAX_PHOTO_BYTES / 1024 / 1024} MB each). Add a caption if you like. Location data is
          removed before anything is saved. <Link href="/member/photos">Back to the gallery</Link>
        </p>
        <PhotoUploader />
      </div>
    </section>
  );
}
