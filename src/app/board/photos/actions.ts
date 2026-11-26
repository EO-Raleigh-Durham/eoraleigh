"use server";

import { requireBoardOrAbove } from "@/lib/auth";
import { setPhotoCaption } from "@/lib/chapter-photos-server";

// Board review (/board/photos): fix or clear a photo's caption. Empty clears it.
export async function updatePhotoCaption(
  id: string,
  caption: string,
): Promise<{ ok: true; caption: string | null } | { ok: false; error: string }> {
  await requireBoardOrAbove();
  return setPhotoCaption(id, caption);
}
