"use server";

import { revalidatePath } from "next/cache";
import { requireBoardOrAbove } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getForumConstitution } from "@/lib/forum-constitutions";
import {
  FORUM_CONSTITUTIONS_BUCKET,
  MAX_CONSTITUTION_BYTES,
  CONSTITUTION_CONTENT_TYPES,
  constitutionPath,
  isConstitutionPathFor,
  validateConstitutionFile,
} from "@/lib/forum-constitution-files";

type Refused = { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const bucket = () => supabase.storage.from(FORUM_CONSTITUTIONS_BUCKET);

async function forumExists(forumId: string): Promise<boolean> {
  if (!UUID.test(forumId)) return false;
  const { data } = await supabase.from("forums").select("id").eq("id", forumId).maybeSingle();
  return Boolean(data);
}

// Step 1: hand the browser a one-time address to send the file to.
export async function startConstitutionUpload(
  forumId: string,
  file: { name: string; size: number },
): Promise<{ ok: true; signedUrl: string; path: string } | Refused> {
  await requireBoardOrAbove();
  if (!(await forumExists(forumId))) return { ok: false, error: "Pick a forum first." };
  const problem = validateConstitutionFile(file);
  if (problem) return { ok: false, error: problem };

  const path = constitutionPath(forumId, crypto.randomUUID(), file.name);
  const { data, error } = await bucket().createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Could not start the upload. Try again." };
  return { ok: true, signedUrl: data.signedUrl, path };
}

// Step 2: once the file has arrived, record it as the forum's constitution
// and remove the file it replaces. The stored size and type are the ones
// recorded, not the ones the browser declared.
export async function saveConstitution(
  forumId: string,
  path: string,
  fileName: string,
): Promise<{ ok: true } | Refused> {
  const user = await requireBoardOrAbove();
  if (!(await forumExists(forumId)) || !isConstitutionPathFor(forumId, path)) {
    return { ok: false, error: "That upload does not belong to this forum." };
  }

  const { data: info, error: infoError } = await bucket().info(path);
  if (infoError || !info) return { ok: false, error: "The file hasn't arrived yet. Try again." };
  const size = info.size ?? 0;
  const type = info.contentType ?? "";
  if (size <= 0 || size > MAX_CONSTITUTION_BYTES || !CONSTITUTION_CONTENT_TYPES.includes(type)) {
    await bucket().remove([path]);
    return { ok: false, error: "The constitution must be a PDF or Word file of up to 20 MB." };
  }

  const previous = await getForumConstitution(forumId);
  const { error } = await supabase.from("forum_constitutions").upsert({
    forum_id: forumId,
    file_name: fileName.trim().slice(0, 200) || "constitution",
    storage_path: path,
    content_type: type,
    size_bytes: size,
    uploaded_by: user.id,
    uploaded_by_name: user.fullName ?? user.email,
    uploaded_at: new Date().toISOString(),
  });
  if (error) {
    await bucket().remove([path]);
    return { ok: false, error: `Could not save the constitution: ${error.message}` };
  }
  if (previous && previous.storagePath !== path) {
    const { error: removeError } = await bucket().remove([previous.storagePath]);
    if (removeError) console.warn("saveConstitution: old file not removed:", removeError.message);
  }

  revalidatePath("/board/forum");
  return { ok: true };
}

export async function deleteConstitution(forumId: string): Promise<{ ok: true } | Refused> {
  await requireBoardOrAbove();
  if (!UUID.test(forumId)) return { ok: false, error: "Unknown forum." };
  const current = await getForumConstitution(forumId);
  if (!current) return { ok: true };

  // File first: a row without a file is a broken link, a file without a row
  // is a confidential document nobody can see or delete.
  const { error: removeError } = await bucket().remove([current.storagePath]);
  if (removeError) return { ok: false, error: "Could not delete the file. Try again." };
  const { error } = await supabase.from("forum_constitutions").delete().eq("forum_id", forumId);
  if (error) return { ok: false, error: `Could not delete the constitution: ${error.message}` };

  revalidatePath("/board/forum");
  return { ok: true };
}
