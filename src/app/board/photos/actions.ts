"use server";

import { revalidatePath } from "next/cache";
import { requireBoardOrAbove } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cleanCaption } from "@/lib/chapter-photos";

// Board review (/board/photos): fix or clear a photo's caption. Empty clears it.
export async function updatePhotoCaption(
  id: string,
  caption: string,
): Promise<{ ok: true; caption: string | null } | { ok: false; error: string }> {
  await requireBoardOrAbove();
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) return { ok: false, error: "Photo not found." };

  const clean = cleanCaption(caption);
  const { data, error } = await supabase
    .from("chapter_photos")
    .update({ caption: clean })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: "Could not save the caption. Try again." };
  if (!data) return { ok: false, error: "Photo not found." };
  revalidatePath("/member/photos");
  revalidatePath("/board/photos");
  return { ok: true, caption: clean };
}
