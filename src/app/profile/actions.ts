"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase-server";

export async function updateProfile(
  fullName: string,
  phone: string,
  whatsappPhone: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireAuth();

  const { error: profileErr } = await supabase
    .from("user_profiles")
    .update({ full_name: fullName || null, updated_at: new Date().toISOString() })
    .eq("user_id", user.userId);

  if (profileErr) return { ok: false, error: profileErr.message };

  if (user.personId) {
    const { error: peopleErr } = await supabase
      .from("people")
      .update({
        name: fullName || null,
        phone: phone || null,
        whatsapp_phone: whatsappPhone || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.personId);

    if (peopleErr) return { ok: false, error: peopleErr.message };
  }

  revalidatePath("/profile");
  return { ok: true };
}

export async function initiateEmailChange(
  newEmail: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = await createSessionClient();
  const { error } = await client.auth.updateUser({ email: newEmail });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function changePassword(
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  const client = await createSessionClient();
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut() {
  const client = await createSessionClient();
  await client.auth.signOut();
  redirect("/");
}
