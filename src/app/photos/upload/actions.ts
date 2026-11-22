"use server";

// TEMPORARY public photo upload (migration 128). Most members have not signed
// in yet, so anyone may upload after typing an email. Remove this route once
// members have accounts and upload from /member/photos/upload instead.
//
// Public by design, so no auth guard. What protects it: images only (checked
// by decoding on the server), size and count limits, a per-email and per-IP
// hourly cap, a global cap on unsaved uploads, server-chosen paths, and a
// private bucket. The member match is computed here, never sent by the
// browser, and is never returned (so the form can't be used to look up who
// is a member).

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { looksLikeBot } from "@/lib/spam-guard";
import {
  MARKETING_CONSENT_VERSION,
  MAX_PHOTOS_PER_BATCH,
  cleanCaption,
  isPublicUploadPath,
  normalizeEmail,
  publicUploadPath,
  refusePhoto,
  type PhotoClaim,
} from "@/lib/chapter-photos";
import {
  createUploadTicket,
  hashIp,
  matchActiveMember,
  processUpload,
  publicUploadRefusal,
  removeStoredPhoto,
} from "@/lib/chapter-photos-server";

type Ticket = { path: string; signedUrl: string } | { error: string };

async function callerIpHash(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return hashIp(ip);
}

export async function startPublicPhotoUploads(
  rawEmail: string,
  files: PhotoClaim[],
  trap?: { company_url?: unknown; elapsedMs?: unknown },
  consent?: unknown,
): Promise<{ ok: true; tickets: Ticket[] } | { ok: false; error: string }> {
  // Honeypot and too-fast submit (components/SpamTrap): issue nothing, and
  // don't say why.
  if (looksLikeBot({ honeypot: trap?.company_url, elapsedMs: trap?.elapsedMs })) {
    const count = Array.isArray(files) ? Math.min(files.length, MAX_PHOTOS_PER_BATCH) : 0;
    return { ok: true, tickets: Array.from({ length: count }, () => ({ error: "Could not start this upload. Try again." })) };
  }
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, error: "Enter a valid email address." };
  if (consent !== true) return { ok: false, error: "Tick the box to give permission before uploading." };
  if (!Array.isArray(files) || files.length === 0) return { ok: false, error: "Add at least one photo." };
  if (files.length > MAX_PHOTOS_PER_BATCH) {
    return { ok: false, error: `Upload up to ${MAX_PHOTOS_PER_BATCH} photos at a time.` };
  }
  const refusal = await publicUploadRefusal(email, await callerIpHash(), files.length);
  if (refusal) return { ok: false, error: refusal };

  const tickets = await Promise.all(
    files.map(async (file): Promise<Ticket> => {
      const claim = { name: String(file?.name ?? ""), type: String(file?.type ?? ""), size: Number(file?.size) };
      const refused = refusePhoto(claim);
      if (refused) return { error: refused };
      const path = publicUploadPath(crypto.randomUUID(), claim.type);
      const ticket = await createUploadTicket(path);
      if (!ticket) return { error: "Could not start this upload. Try again." };
      return { path, signedUrl: ticket.signedUrl };
    }),
  );
  return { ok: true, tickets };
}

export async function savePublicPhoto(
  path: string,
  caption: string,
  rawEmail: string,
  consent?: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, error: "Enter a valid email address." };
  if (consent !== true) return { ok: false, error: "Tick the box to give permission before uploading." };
  if (typeof path !== "string" || !isPublicUploadPath(path)) return { ok: false, error: "That upload wasn't found." };

  const stored = await processUpload(path);
  if (!stored.ok) return stored;

  const member = await matchActiveMember(email).catch(() => null);
  const { error } = await supabase.from("chapter_photos").insert({
    id: stored.id,
    uploaded_by: null,
    uploaded_by_profile: null,
    uploader_email: email,
    uploader_person_id: member?.personId ?? null,
    email_matches_member: Boolean(member),
    uploader_ip_hash: await callerIpHash(),
    via_public_upload: true,
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
    console.error("[photos] saving a public upload", error.message);
    await removeStoredPhoto([stored.storagePath, stored.thumbPath]);
    return { ok: false, error: "Could not save the photo. Try again." };
  }
  revalidatePath("/member/photos");
  revalidatePath("/board/photos");
  return { ok: true };
}
