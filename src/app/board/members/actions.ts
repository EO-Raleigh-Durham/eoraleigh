"use server";

import { revalidatePath } from "next/cache";
import { requireBoardOrAbove } from "@/lib/auth";
import { getMemberActivity } from "@/lib/member-activity";
import { supabase } from "@/lib/supabase";

// Lets the client member shelf lazily load one member's fiscal-year
// activity (events attended + survey responses) when it opens, instead of
// shipping every member's full survey text with the roster page.
export async function loadMemberActivity(personId: string) {
  await requireBoardOrAbove();
  return getMemberActivity(personId);
}

// Set a member's forum placement from the member shelf. `value` is either
// "placed:<forumId>" (assign to that forum) or a placement status
// ("waiting_ftp" | "no_forum" | "other_chapter" | "unclassified"). Writes both
// people.forum_id and people.forum_status so the data stays consistent with
// the import: a placed member has a forum_id + 'placed'; everyone else has a
// null forum_id and a status (or null for unclassified).
export async function setMemberForum(
  personId: string,
  value: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireBoardOrAbove();
  let forum_id: string | null = null;
  let forum_status: string | null = null;

  if (value.startsWith("placed:")) {
    forum_id = value.slice("placed:".length);
    forum_status = "placed";
  } else if (
    value === "forum_trained" ||
    value === "waiting_ftp" ||
    value === "no_forum" ||
    value === "other_chapter"
  ) {
    forum_status = value;
  }
  // else "unclassified" / unknown -> both stay null

  const { error } = await supabase
    .from("people")
    .update({ forum_id, forum_status })
    .eq("id", personId);

  if (error) {
    console.warn("setMemberForum:", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath("/board/members");
  revalidatePath("/board/forum");
  return { ok: true };
}

// Update a member's editable profile fields (name, phone, city) from the
// member detail page. Email stays read-only: it is the canonical match key
// across imports and HubSpot. Empty inputs clear the field to null, since the
// edit form always presents the current values, so a blank is intentional.
export async function updateMemberProfile(
  personId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireBoardOrAbove();
  const clean = (v: FormDataEntryValue | null) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s.length ? s : null;
  };
  const patch = {
    name: clean(formData.get("name")),
    phone: clean(formData.get("phone")),
    city: clean(formData.get("city")),
  };

  const { error } = await supabase
    .from("people")
    .update(patch)
    .eq("id", personId);

  if (error) {
    console.warn("updateMemberProfile:", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath("/board/members");
  revalidatePath("/board/forum");
  revalidatePath(`/board/members/${personId}`);
  return { ok: true };
}
