"use server";

import { revalidatePath } from "next/cache";
import { requireMemberOrAbove } from "@/lib/auth";
import { roleAtLeast } from "@/lib/access";
import { supabase } from "@/lib/supabase";
import {
  MARKETING_CONSENT_VERSION,
  MAX_PHOTOS_PER_BATCH,
  cleanCaption,
  ownsUploadPath,
  refusePhoto,
  uploadPath,
  type PhotoClaim,
} from "@/lib/chapter-photos";
import { createUploadTicket, processUpload, removeStoredPhoto } from "@/lib/chapter-photos-server";

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
  if (typeof path !== "string" || !ownsUploadPath(user.userId, path)) {
    return { ok: false, error: "That upload doesn't belong to you." };
  }

  const stored = await processUpload(path);
  if (!stored.ok) return stored;

  const { error } = await supabase.from("chapter_photos").insert({
    id: stored.id,
    uploaded_by: user.userId,
    uploaded_by_profile: user.id,
    uploader_email: user.email.toLowerCase(),
    uploader_person_id: user.personId,
    marketing_consent_at: new Date().toISOString(),
    marketing_consent_version: MARKETING_CONSENT_VERSION,
    caption: cleanCaption(caption),
    storage_path: stored.storagePath,
    thumb_path: stored.thumbPath,
    width: stored.width,
    height: stored.height,
    size_bytes: stored.sizeBytes,
  });
  if (error) {
    console.error("[photos] saving", error.message);
    await removeStoredPhoto([stored.storagePath, stored.thumbPath]);
    return { ok: false, error: "Could not save the photo. Try again." };
  }
  revalidatePath("/member/photos");
  revalidatePath("/board/photos");
  return { ok: true };
}

// The uploader, or anyone on the board, can take a photo down.
export async function deletePhoto(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireMemberOrAbove();
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) return { ok: false, error: "Photo not found." };

  const { data: row, error } = await supabase
    .from("chapter_photos")
    .select("id, uploaded_by, storage_path, thumb_path")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, error: "Could not delete the photo. Try again." };
  if (!row) return { ok: false, error: "Photo not found." };
  if (row.uploaded_by !== user.userId && !roleAtLeast(user.role, "board")) {
    return { ok: false, error: "Only the person who uploaded this photo, or the board, can delete it." };
  }

  const { error: deleteError } = await supabase.from("chapter_photos").delete().eq("id", id);
  if (deleteError) return { ok: false, error: "Could not delete the photo. Try again." };
  await removeStoredPhoto([row.storage_path, row.thumb_path]);
  revalidatePath("/member/photos");
  revalidatePath("/board/photos");
  return { ok: true };
}
