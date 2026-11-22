"use server";

import { redirect } from "next/navigation";
import { requireSuperAdmin, createUser, deactivateUser, reactivateUser, updateUserRole } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";

type ActionResult = { ok: true } | { ok: false; error: string };

function s(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function inviteUserAction(formData: FormData): Promise<ActionResult> {
  const sessionUser = await requireSuperAdmin();

  const email = s(formData.get("email")).toLowerCase();
  const fullName = s(formData.get("full_name"));
  const role = s(formData.get("role")) as UserRole;

  if (!email || !email.includes("@")) return { ok: false, error: "Valid email is required" };
  if (!fullName) return { ok: false, error: "Full name is required" };
  if (!["super_admin", "board", "member"].includes(role)) {
    return { ok: false, error: "Invalid role" };
  }

  const result = await createUser(email, fullName, role, sessionUser.id);
  if (!result.ok) return result;

  redirect("/admin/users?invited=1");
}

export async function updateUserAction(profileId: string, formData: FormData): Promise<ActionResult> {
  await requireSuperAdmin();

  const role = s(formData.get("role")) as UserRole;
  if (!["super_admin", "board", "member", "guest"].includes(role)) {
    return { ok: false, error: "Invalid role" };
  }

  return updateUserRole(profileId, role);
}

export async function toggleActiveAction(profileId: string, currentlyActive: boolean): Promise<ActionResult> {
  await requireSuperAdmin();

  if (currentlyActive) {
    return deactivateUser(profileId);
  }
  return reactivateUser(profileId);
}
