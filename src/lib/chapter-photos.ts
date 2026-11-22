// Pure rules for the chapter photo gallery (/member/photos): which files are
// accepted, where each one is kept in private storage, and how captions are
// cleaned. Only chapter config is imported, so the server code and the unit
// tests share one definition.

import { CHAPTER_COUNTRY, CHAPTER_MARKETING_EMAIL, CHAPTER_NAME } from "../kernel/config/chapter.ts";

// Private Supabase storage bucket (migration 127). No storage policies: only
// the server secret key reads or writes it, and viewers get short-lived
// signed URLs after the app's own member check.
export const CHAPTER_PHOTOS_BUCKET = "chapter-photos";

// One drop can hold up to this many photos.
export const MAX_PHOTOS_PER_BATCH = 30;
// 25 MB per original. Keep in step with file_size_limit in migration 127.
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
export const MAX_CAPTION_LENGTH = 500;

// Longest edge of the stored photo and of its grid thumbnail.
export const DISPLAY_MAX_DIMENSION = 2400;
export const THUMB_MAX_DIMENSION = 800;

// Keep in step with allowed_mime_types in migration 127. HEIC is left out:
// most browsers can't decode it, so the server can't check or re-encode it
// reliably and the gallery couldn't show it.
export const PHOTO_CONTENT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// The permission every uploader gives (migration 129). The version is stored
// with each photo, so change it whenever the wording changes.
export const MARKETING_CONSENT_VERSION = "2026-11-22";
export const MARKETING_CONSENT_LABEL =
  `I give ${CHAPTER_NAME} permission to use these photos in its marketing materials.`;
export const MARKETING_CONSENT_TERMS: string[] = [
  "By uploading, I confirm that I took these photos or have the right to share them, and that sharing them does not infringe anyone else's rights.",
  "I confirm that the people who can be identified in these photos have agreed to being photographed and to the photos being shared. Where anyone shown is under 18, I have the consent of their parent or legal guardian.",
  `I grant Entrepreneurs' Organization${CHAPTER_COUNTRY ? ` ${CHAPTER_COUNTRY}` : ""} ("${CHAPTER_NAME}") a free, non-exclusive, worldwide, perpetual licence to use, copy, edit, crop, adapt and publish these photos, with or without credit, in its member communications and marketing materials, including its website, social media, newsletters, advertising, presentations and printed materials, and to let its service providers do so on its behalf.`,
  `I keep ownership of my photos. I can ask ${CHAPTER_NAME} to remove a photo from the gallery, or to stop using it in new materials, by writing to ${CHAPTER_MARKETING_EMAIL}. Materials already published or printed may not be withdrawn.`,
];

export type PhotoClaim = { name: string; type: string; size: number };

/** Why a file the browser offered can't be uploaded, or null when it can. */
export function refusePhoto(file: PhotoClaim): string | null {
  const name = (file.name || "That file").slice(0, 120);
  if (!PHOTO_CONTENT_TYPES[file.type]) {
    return `${name} isn't a JPG, PNG, WebP or GIF photo.`;
  }
  if (!Number.isFinite(file.size) || file.size <= 0) return `${name} is empty.`;
  if (file.size > MAX_PHOTO_BYTES) {
    return `${name} is larger than ${MAX_PHOTO_BYTES / 1024 / 1024} MB.`;
  }
  return null;
}

/**
 * Where an upload lands. The first segment is the uploader's auth user id, so
 * the save step can check that a path belongs to the person saving it.
 */
export function uploadPath(userId: string, id: string, contentType: string): string {
  const ext = PHOTO_CONTENT_TYPES[contentType] ?? "bin";
  return `uploads/${userId}/${id}.${ext}`;
}

/** True when `path` is an upload this user was handed by uploadPath(). */
export function ownsUploadPath(userId: string, path: string): boolean {
  return new RegExp(
    `^uploads/${escapeRegExp(userId)}/[0-9a-f-]{36}\\.(jpg|png|webp|gif)$`,
  ).test(path);
}

// TEMPORARY public upload (/photos/upload, migration 128). Removed once
// members have accounts and upload from the member section.
export const PUBLIC_UPLOAD_PREFIX = "public-uploads";
// Saved public photos allowed per email, and per IP, in one hour.
export const PUBLIC_MAX_PER_HOUR = 60;
// Unsaved public uploads allowed in the bucket at once, across everyone.
export const PUBLIC_MAX_PENDING = 200;

/** Where a public upload lands. Nothing the browser sent is in the path. */
export function publicUploadPath(id: string, contentType: string): string {
  const ext = PHOTO_CONTENT_TYPES[contentType] ?? "bin";
  return `${PUBLIC_UPLOAD_PREFIX}/${id}.${ext}`;
}

export function isPublicUploadPath(path: string): boolean {
  return new RegExp(`^${PUBLIC_UPLOAD_PREFIX}/[0-9a-f-]{36}\\.(jpg|png|webp|gif)$`).test(path);
}

/** True when one more batch of `count` would pass the hourly cap for this email or IP. */
export function overHourlyCap(savedByEmail: number, savedByIp: number, count: number): boolean {
  return Math.max(savedByEmail, savedByIp) + count > PUBLIC_MAX_PER_HOUR;
}

/**
 * The photo type its first bytes prove, or null. Checked before decoding, so
 * a renamed PDF, HTML page or script is refused whatever its name or the type
 * the browser declared.
 */
export function sniffImageType(head: Uint8Array): string | null {
  const at = (i: number, bytes: number[]) => bytes.every((b, j) => head[i + j] === b);
  if (at(0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50])) return "image/webp";
  if (at(0, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  return null;
}

/** Lower-cased, trimmed email, or null when it doesn't look like one. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length > 320) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function photoPaths(id: string): { display: string; thumb: string } {
  return { display: `photos/${id}.jpg`, thumb: `thumbs/${id}.webp` };
}

/** Trimmed, single-spaced, length-capped caption, or null when empty. */
export function cleanCaption(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.replace(/\s+/g, " ").trim().slice(0, MAX_CAPTION_LENGTH);
  return text.length > 0 ? text : null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
