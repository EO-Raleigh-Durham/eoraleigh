import type { Metadata } from "next";
import Link from "next/link";
import { requireBoardOrAbove } from "@/lib/auth";
import { listGalleryPhotos } from "@/lib/chapter-photos-server";
import { PhotoGallery } from "@/app/member/photos/PhotoGallery";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata: Metadata = {
  title: "Chapter photos",
  description: "Review every photo in the chapter gallery, see who uploaded it, and remove bad ones.",
};
export const dynamic = "force-dynamic";

// Board review of the chapter gallery. Shows each uploader's email and
// whether it matched an active member, which matters while the TEMPORARY
// public upload (/photos/upload, migration 128) is open.
export default async function BoardPhotosPage() {
  const user = await requireBoardOrAbove();
  const photos = await listGalleryPhotos({ limit: 1000, includeEmail: true });
  const unverified = photos.filter((p) => !p.emailMatchesMember).length;
  const viaPublic = photos.filter((p) => p.viaPublicUpload).length;
  const cleared = photos.filter((p) => p.marketingConsent).length;

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">Chapter photos</div>
        <h1 className="admin-page-title">Photo gallery review</h1>
        <p className="admin-page-sub">
          Every photo members see at <Link href="/member/photos">/member/photos</Link>. Photos marked Unverified came
          through the public upload with an email that matches no active member. Deleting removes the photo and its
          file for good. Every upload since 22 Nov 2026 carries the uploader&apos;s permission to use it in {CHAPTER_NAME} marketing. Public upload link: <Link href="/photos/upload">/photos/upload</Link>
        </p>
      </div>

      <div className="admin-card-grid" style={{ marginBottom: 32 }}>
        <Stat label="Photos" value={photos.length} />
        <Stat label="Unverified" value={unverified} />
        <Stat label="From the public upload" value={viaPublic} />
        <Stat label="Cleared for marketing" value={cleared} />
      </div>

      {photos.length === 0 ? (
        <p className="admin-page-sub">No photos yet.</p>
      ) : (
        <PhotoGallery photos={photos} viewerUserId={user.userId} viewerIsBoard admin />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="admin-card" style={{ cursor: "default" }}>
      <div className="admin-card-label">{label}</div>
      <div className="admin-card-title">{value}</div>
    </div>
  );
}
