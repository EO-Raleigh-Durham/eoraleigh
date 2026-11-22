"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { expiryError, parseContractorForm } from "@/lib/contractor-admin";
import {
  grantContractorAccess,
  renewGrant,
  revokeGrant,
  setGrantEdit,
} from "@/lib/access-grants-admin";

// Contractor access: super admin only (plan 10, decided 17 Nov 2026). Every
// action authorises first, before reading the form or touching data.

type ActionResult = { ok: true } | { ok: false; error: string };

const PATH = "/admin/users/contractors";

function s(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v : "";
}

export async function addContractorAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const parsed = parseContractorForm({
    email: s(formData.get("email")),
    fullName: s(formData.get("full_name")),
    area: s(formData.get("area")),
    sponsorPersonId: s(formData.get("sponsor_person_id")),
    access: s(formData.get("access")),
    expiresAt: s(formData.get("expires_at")),
  });
  if (!parsed.ok) return parsed;
  const result = await grantContractorAccess(parsed.input, admin.id);
  if (result.ok) revalidatePath(PATH);
  return result;
}

export async function renewGrantAction(grantId: string, expiresAt: string): Promise<ActionResult> {
  await requireSuperAdmin();
  const dateError = expiryError(expiresAt);
  if (dateError) return { ok: false, error: dateError };
  const result = await renewGrant(grantId, expiresAt);
  if (result.ok) revalidatePath(PATH);
  return result;
}

export async function setGrantEditAction(grantId: string, canEdit: boolean): Promise<ActionResult> {
  await requireSuperAdmin();
  const result = await setGrantEdit(grantId, canEdit === true);
  if (result.ok) revalidatePath(PATH);
  return result;
}

export async function revokeGrantAction(grantId: string): Promise<ActionResult> {
  await requireSuperAdmin();
  const result = await revokeGrant(grantId);
  if (result.ok) revalidatePath(PATH);
  return result;
}
