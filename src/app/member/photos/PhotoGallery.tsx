"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { GalleryPhoto } from "@/lib/chapter-photos-server";
import { MAX_CAPTION_LENGTH } from "@/lib/chapter-photos";
import { deletePhoto } from "./actions";
import { updatePhotoCaption } from "../../board/photos/actions";

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function PhotoGallery({
  photos,
  viewerUserId,
  viewerIsBoard,
  admin = false,
}: {
  photos: GalleryPhoto[];
  viewerUserId: string;
  viewerIsBoard: boolean;
  // Board review (/board/photos): uploader email and a delete button per tile.
  admin?: boolean;
}) {
  const [removed, setRemoved] = useState<string[]>([]);
  // Board edits, keyed by photo id: saved captions and unsaved drafts.
  const [saved, setSaved] = useState<Record<string, string | null>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const list = photos
    .filter((p) => !removed.includes(p.id))
    .map((p) => (p.id in saved ? { ...p, caption: saved[p.id] } : p));
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (by: number) => setOpen((i) => (i === null ? i : (i + by + list.length) % list.length)),
    [list.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, close, step]);

  const current = open === null ? null : list[open];
  const canDelete = (p: GalleryPhoto) => viewerIsBoard || (!!p.uploadedByUserId && p.uploadedByUserId === viewerUserId);

  function onDelete(photo: GalleryPhoto) {
    if (!window.confirm("Delete this photo from the gallery? This can't be undone.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deletePhoto(photo.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRemoved((ids) => [...ids, photo.id]);
      setOpen(null);
    });
  }

  async function onSaveCaption(photo: GalleryPhoto) {
    setError(null);
    setSavingId(photo.id);
    const res = await updatePhotoCaption(photo.id, drafts[photo.id] ?? "");
    setSavingId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSaved((m) => ({ ...m, [photo.id]: res.caption }));
    setDrafts((m) => {
      const next = { ...m };
      delete next[photo.id];
      return next;
    });
  }

  return (
    <>
      {error && open === null && <p className="ptl-form-error">{error}</p>}
      <ul className="ptl-photo-grid">
        {list.map((photo, index) => (
          <li key={photo.id}>
            <button type="button" className="ptl-photo-tile" onClick={() => setOpen(index)}>
              {photo.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                <img
                  src={photo.thumbUrl}
                  alt={photo.caption ?? "Chapter photo"}
                  loading="lazy"
                  width={photo.width ?? undefined}
                  height={photo.height ?? undefined}
                />
              ) : (
                <span className="text-muted">Unavailable</span>
              )}
            </button>
            {!photo.emailMatchesMember && <span className="ptl-photo-flag">Unverified</span>}
            {!admin && photo.caption && <p className="ptl-photo-caption">{photo.caption}</p>}
            {admin && (
              <div className="ptl-photo-caption-edit">
                <input
                  type="text"
                  className="ptl-input"
                  aria-label="Caption"
                  placeholder="No caption"
                  maxLength={MAX_CAPTION_LENGTH}
                  value={drafts[photo.id] ?? photo.caption ?? ""}
                  onChange={(e) => setDrafts((m) => ({ ...m, [photo.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && photo.id in drafts) onSaveCaption(photo);
                  }}
                />
                {photo.id in drafts && (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    disabled={savingId === photo.id}
                    onClick={() => onSaveCaption(photo)}
                  >
                    {savingId === photo.id ? "Saving" : "Save"}
                  </button>
                )}
              </div>
            )}
            {admin && (
              <div className="ptl-photo-admin">
                <span className="ptl-photo-caption">{photo.uploaderEmail ?? photo.uploadedBy ?? "Unknown uploader"}</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={pending}
                  onClick={() => onDelete(photo)}
                >
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {current && (
        <div className="ptl-lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={close}>
          <div className="ptl-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            {current.fullUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
              <img src={current.fullUrl} alt={current.caption ?? "Chapter photo"} />
            )}
            <div className="ptl-lightbox-meta">
              <div>
                {current.caption && <p className="ptl-lightbox-caption">{current.caption}</p>}
                <p className="ptl-lightbox-by">
                  {!current.emailMatchesMember && "Unverified uploader · "}
                  {current.uploaderEmail ? `${current.uploaderEmail} · ` : ""}
                  {current.uploadedBy ? `${current.uploadedBy} · ` : ""}
                  {dateFormat.format(new Date(current.createdAt))}
                </p>
                {error && <p className="ptl-form-error">{error}</p>}
              </div>
              <div className="ptl-lightbox-actions">
                {current.fullUrl && (
                  <a href={current.fullUrl} target="_blank" rel="noopener noreferrer" className="btn btn--white btn--sm">
                    Open full size
                  </a>
                )}
                {canDelete(current) && (
                  <button
                    type="button"
                    className="btn btn--ghost-on-dark btn--sm"
                    disabled={pending}
                    onClick={() => onDelete(current)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
          {list.length > 1 && (
            <>
              <button
                type="button"
                className="ptl-lightbox-nav ptl-lightbox-prev"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="ptl-lightbox-nav ptl-lightbox-next"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
              >
                ›
              </button>
            </>
          )}
          <button type="button" className="ptl-lightbox-close" aria-label="Close" onClick={close}>
            ×
          </button>
        </div>
      )}
    </>
  );
}
