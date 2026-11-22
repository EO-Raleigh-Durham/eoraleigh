// Server-only data access for the chapter photo gallery. NEVER import from a
// client component: it uses the secret-key client, which bypasses RLS. Every
// caller must authorize first (requireMemberOrAbove()).

import { CHAPTER_NAME } from "../kernel/config/chapter.ts";
import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { supabase } from "./supabase";
import { postgrestLikeLiteral } from "./postgrest-like";
import {
  DISPLAY_MAX_DIMENSION,
  MAX_PHOTO_BYTES,
  CHAPTER_PHOTOS_BUCKET,
  PHOTO_CONTENT_TYPES,
  PUBLIC_MAX_PENDING,
  PUBLIC_UPLOAD_PREFIX,
  THUMB_MAX_DIMENSION,
  overHourlyCap,
  photoPaths,
  sniffImageType,
} from "./chapter-photos";

// Signed view links last an hour; reloading the gallery mints fresh ones.
const VIEW_SECONDS = 60 * 60;
// Refuse decompression bombs: about 100 megapixels.
const MAX_INPUT_PIXELS = 100_000_000;

export type GalleryPhoto = {
  id: string;
  caption: string | null;
  uploadedBy: string | null;
  uploadedByUserId: string | null;
  // False when a public upload's email matched no active member (128).
  emailMatchesMember: boolean;
  viaPublicUpload: boolean;
  // Uploader gave marketing permission (129). Older rows have none.
  marketingConsent: boolean;
  // Only filled for the board view (/board/photos), never sent to members.
  uploaderEmail: string | null;
  createdAt: string;
  width: number | null;
  height: number | null;
  thumbUrl: string | null;
  fullUrl: string | null;
};

const bucket = () => supabase.storage.from(CHAPTER_PHOTOS_BUCKET);

export async function listGalleryPhotos(
  { limit = 300, includeEmail = false }: { limit?: number; includeEmail?: boolean } = {},
): Promise<GalleryPhoto[]> {
  const { data, error } = await supabase
    .from("chapter_photos")
    .select(
      "id, caption, uploaded_by, created_at, width, height, storage_path, thumb_path, uploader_email, email_matches_member, via_public_upload, marketing_consent_at, uploader:user_profiles(full_name), person:people(name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[photos] listing", error.message);
    return [];
  }
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    caption: string | null;
    uploaded_by: string | null;
    created_at: string;
    uploader_email: string | null;
    email_matches_member: boolean;
    via_public_upload: boolean;
    marketing_consent_at: string | null;
    person: { name: string | null } | null;
    width: number | null;
    height: number | null;
    storage_path: string;
    thumb_path: string;
    uploader: { full_name: string | null } | null;
  }>;
  if (rows.length === 0) return [];

  const paths = rows.flatMap((r) => [r.thumb_path, r.storage_path]);
  const { data: signed, error: signError } = await bucket().createSignedUrls(paths, VIEW_SECONDS);
  if (signError) console.error("[photos] signing", signError.message);
  const urlFor = new Map<string, string>();
  for (const s of signed ?? []) if (s.path && s.signedUrl) urlFor.set(s.path, s.signedUrl);

  return rows.map((r) => ({
    id: r.id,
    caption: r.caption,
    uploadedBy: r.uploader?.full_name ?? r.person?.name ?? null,
    uploadedByUserId: r.uploaded_by,
    emailMatchesMember: r.email_matches_member,
    viaPublicUpload: r.via_public_upload,
    marketingConsent: Boolean(r.marketing_consent_at),
    uploaderEmail: includeEmail ? r.uploader_email : null,
    createdAt: r.created_at,
    width: r.width,
    height: r.height,
    thumbUrl: urlFor.get(r.thumb_path) ?? null,
    fullUrl: urlFor.get(r.storage_path) ?? null,
  }));
}

export async function createUploadTicket(path: string): Promise<{ signedUrl: string; token: string } | null> {
  const { data, error } = await bucket().createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[photos] signing an upload", error?.message);
    return null;
  }
  return { signedUrl: data.signedUrl, token: data.token };
}

type ProcessResult =
  | { ok: true; id: string; width: number; height: number; sizeBytes: number; storagePath: string; thumbPath: string }
  | { ok: false; error: string };

/**
 * Reads what actually arrived at `uploadPath`, proves it is a photo by
 * decoding it, and stores a re-encoded copy plus a thumbnail. The re-encode
 * applies EXIF rotation, then drops all metadata (GPS location included).
 * The original upload is always removed.
 */
export async function processUpload(uploadPath: string): Promise<ProcessResult> {
  try {
    const { data: blob, error } = await bucket().download(uploadPath);
    if (error || !blob) return { ok: false, error: "The photo hasn't arrived yet. Try again." };
    if (blob.size > MAX_PHOTO_BYTES) return { ok: false, error: "That photo is too large." };

    const input = Buffer.from(await blob.arrayBuffer());
    if (!sniffImageType(input.subarray(0, 16))) {
      return { ok: false, error: "That file isn't a photo we can show. Export it as JPG or PNG." };
    }
    const source = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" });
    const meta = await source.metadata();
    const format = meta.format === "jpeg" ? "image/jpeg" : `image/${meta.format}`;
    if (!PHOTO_CONTENT_TYPES[format] || !meta.width || !meta.height) {
      return { ok: false, error: "That file isn't a photo we can show. Export it as JPG or PNG." };
    }

    const display = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({ width: DISPLAY_MAX_DIMENSION, height: DISPLAY_MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    const thumb = await sharp(display.data)
      .resize({ width: THUMB_MAX_DIMENSION, height: THUMB_MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();

    const id = crypto.randomUUID();
    const paths = photoPaths(id);
    const up1 = await bucket().upload(paths.display, display.data, { contentType: "image/jpeg", upsert: false });
    if (up1.error) return { ok: false, error: "Could not save the photo. Try again." };
    const up2 = await bucket().upload(paths.thumb, thumb, { contentType: "image/webp", upsert: false });
    if (up2.error) {
      await bucket().remove([paths.display]);
      return { ok: false, error: "Could not save the photo. Try again." };
    }
    return {
      ok: true,
      id,
      width: display.info.width,
      height: display.info.height,
      sizeBytes: display.data.length,
      storagePath: paths.display,
      thumbPath: paths.thumb,
    };
  } catch (err) {
    console.error("[photos] processing", err instanceof Error ? err.message : err);
    return { ok: false, error: "That file isn't a photo we can show. Export it as JPG or PNG." };
  } finally {
    const { error } = await bucket().remove([uploadPath]);
    if (error) console.error("[photos] removing an original upload", error.message);
  }
}

export async function removeStoredPhoto(paths: string[]): Promise<boolean> {
  const { error } = await bucket().remove(paths);
  if (error) console.error("[photos] removing", error.message);
  return !error;
}

// ---------------------------------------------------------------------------
// TEMPORARY public upload (/photos/upload, migration 128). Remove with the
// route once members upload from the member section.
// ---------------------------------------------------------------------------

/** The active chapter member with this email, if any. Status active only. */
export async function matchActiveMember(email: string): Promise<{ personId: string; name: string | null } | null> {
  const like = postgrestLikeLiteral(email);
  const [primary, alias] = await Promise.all([
    supabase.from("people").select("id").ilike("email", like).limit(5),
    supabase.from("person_emails").select("person_id").ilike("email", like).limit(5),
  ]);
  const ids = [
    ...new Set([
      ...((primary.data ?? []) as Array<{ id: string }>).map((r) => r.id),
      ...((alias.data ?? []) as Array<{ person_id: string }>).map((r) => r.person_id),
    ]),
  ];
  if (ids.length === 0) return null;

  const { data: chapter } = await supabase
    .from("chapters")
    .select("id")
    .eq("chapter_name", CHAPTER_NAME)
    .maybeSingle();
  if (!chapter) return null;
  const { data: membership } = await supabase
    .from("chapter_memberships")
    .select("person_id, person:people!chapter_memberships_person_id_fkey(name)")
    .eq("chapter_id", chapter.id)
    .eq("status", "active")
    .in("person_id", ids)
    .limit(1)
    .maybeSingle();
  if (!membership) return null;
  const row = membership as unknown as { person_id: string; person: { name: string | null } | null };
  return { personId: row.person_id, name: row.person?.name ?? null };
}

/** Salted hash of the caller's IP, for rate limiting. The IP itself is never stored. */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.SUPABASE_SECRET_KEY ?? "chapter-photos";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Refuses a public upload batch when this email or IP has saved too many
 * photos in the last hour, or when too many unsaved uploads are waiting.
 * Unsaved uploads older than a day are cleared first, so abandoned tabs
 * can't block the route for good.
 */
export async function publicUploadRefusal(email: string, ipHash: string | null, count: number): Promise<string | null> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = async (column: string, value: string) => {
    const { count: n, error } = await supabase
      .from("chapter_photos")
      .select("id", { count: "exact", head: true })
      .eq(column, value)
      .gte("created_at", since);
    if (error) throw new Error(error.message);
    return n ?? 0;
  };
  try {
    const byEmail = await recent("uploader_email", email);
    const byIp = ipHash ? await recent("uploader_ip_hash", ipHash) : 0;
    if (overHourlyCap(byEmail, byIp, count)) {
      return "That's a lot of photos in one hour. Please try again later.";
    }

    const { data: pending, error } = await bucket().list(PUBLIC_UPLOAD_PREFIX, { limit: 1000 });
    if (error) throw new Error(error.message);
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const stale = (pending ?? []).filter((o) => o.created_at && Date.parse(o.created_at) < dayAgo);
    if (stale.length > 0) await bucket().remove(stale.map((o) => `${PUBLIC_UPLOAD_PREFIX}/${o.name}`));
    if ((pending ?? []).length - stale.length + count > PUBLIC_MAX_PENDING) {
      return "The upload is busy right now. Please try again in a little while.";
    }
    return null;
  } catch (err) {
    console.error("[photos] public upload gate", err instanceof Error ? err.message : err);
    return "Could not start the upload. Try again.";
  }
}
