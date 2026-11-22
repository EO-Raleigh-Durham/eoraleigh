import type { Metadata } from "next";
import Link from "next/link";
import { MAX_PHOTO_BYTES, MAX_PHOTOS_PER_BATCH } from "@/lib/chapter-photos";
import { PhotoUploader } from "@/app/member/photos/upload/PhotoUploader";
import { CHAPTER_DOMAIN, CHAPTER_NAME } from "@/kernel/config/chapter";

// TEMPORARY public upload (migration 128). Most members haven't signed in
// yet; once they have, this route goes and uploads live only at
// /member/photos/upload.
export const metadata: Metadata = {
  title: `Share your photos with ${CHAPTER_NAME}`,
  description: `Upload photos from ${CHAPTER_NAME} events to the chapter gallery, with an optional caption for each.`,
  robots: { index: false, follow: false },
  // Link preview for WhatsApp and social shares.
  openGraph: {
    title: `We want your photos! Share your ${CHAPTER_NAME} moments`,
    description: `Help grow the chapter. Upload your favourite ${CHAPTER_NAME} photos, no sign-in needed.`,
    url: "/photos/upload",
    type: "website",
    images: [
      {
        url: "/images/photos/we-want-your-photos.jpg",
        width: 1200,
        height: 630,
        alt: `We want your photos! Share your ${CHAPTER_NAME} moments at ${CHAPTER_DOMAIN}/photos/upload`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `We want your photos! Share your ${CHAPTER_NAME} moments`,
    description: `Help grow the chapter. Upload your favourite ${CHAPTER_NAME} photos, no sign-in needed.`,
    images: ["/images/photos/we-want-your-photos.jpg"],
  },
};

export default function PublicPhotoUploadPage() {
  return (
    <section className="section">
      <div className="container container--text">
        <span className="eyebrow eyebrow--accent">Chapter photos</span>
        <h1 className="display-3" style={{ marginTop: 12, marginBottom: 8 }}>
          Share your photos
        </h1>
        <p className="lead text-muted" style={{ marginBottom: 32 }}>
          Drop up to {MAX_PHOTOS_PER_BATCH} photos from a chapter event (JPG, PNG, WebP or GIF, up to{" "}
          {MAX_PHOTO_BYTES / 1024 / 1024} MB each) and add a caption if you like. They go to the members-only
          gallery. Location data is removed before anything is saved. Already signed in?{" "}
          <Link href="/member/photos/upload">Upload from your account</Link>
        </p>
        <PhotoUploader mode="public" />
      </div>
    </section>
  );
}
