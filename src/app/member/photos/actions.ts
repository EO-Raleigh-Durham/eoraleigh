"use server";

import { requireMemberOrAbove } from "@/lib/auth";
import { MAX_PHOTOS_PER_BATCH, refusePhoto, uploadPath, type PhotoClaim } from "@/lib/chapter-photos";
import { createUploadTicket, deleteChapterPhoto, saveUploadedPhoto } from "@/lib/chapter-photos-server";

type Ticket = { path: string; signedUrl: string } | { error: string };

// Step 1: hand the browser one signed upload URL per photo, so photos go
// straight to private storage instead of through the 4.5 MB function limit.
// Name, type and size here are only the browser's claims; step 2 checks the
// bytes that actually arrived.
export async function startPhotoUploads(
  files: PhotoClaim[],
  consent?: unknown,
): Promise<{ ok: true; tickets: Ticket[] } | { ok: false; error: string }> {
  const user = await requireMemberOrAbove();
  if (consent !== true) return { ok: false, error: "Tick the box to give permission before uploading." };
  if (!Array.isArray(files) || files.length === 0) return { ok: false, error: "Add at least one photo." };
  if (files.length > MAX_PHOTOS_PER_BATCH) {
    return { ok: false, error: `Upload up to ${MAX_PHOTOS_PER_BATCH} photos at a time.` };
  }

  const tickets = await Promise.all(
    files.map(async (file): Promise<Ticket> => {
      const claim = {
        name: String(file?.name ?? ""),
        type: String(file?.type ?? ""),
        size: Number(file?.size),
      };
      const refusal = refusePhoto(claim);
      if (refusal) return { error: refusal };
      const path = uploadPath(user.userId, crypto.randomUUID(), claim.type);
      const ticket = await createUploadTicket(path);
      if (!ticket) return { error: "Could not start this upload. Try again." };
      return { path, signedUrl: ticket.signedUrl };
    }),
  );
  return { ok: true, tickets };
}

// Step 2: check what arrived, re-encode it without metadata, and record it.
export async function savePhoto(
  path: string,
  caption: string,
  consent?: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireMemberOrAbove();
  if (consent !== true) return { ok: false, error: "Tick the box to give permission before uploading." };
  const saved = await saveUploadedPhoto(user, path, caption);
  return saved.ok ? { ok: true } : saved;
}

// The uploader, or anyone on the board, can take a photo down.
export async function deletePhoto(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireMemberOrAbove();
  return deleteChapterPhoto(user, id);
}
