"use server";

import { revalidatePath } from "next/cache";
import { requireBoardOrAbove } from "@/lib/auth";
import { recordAudit } from "@/kernel/audit/audit";
import { addMember, getMembership, updateMembershipStatus } from "@/lib/membership-admin";
import { isMembershipStatus, isMembershipType, isoDate, memberEmail, statusChange } from "@/lib/membership-model";

type ActionResult = { ok: true; message: string; personId?: string } | { ok: false; error: string };

const today = () => new Date().toISOString().slice(0, 10);

export async function addMemberAction(formData: FormData): Promise<ActionResult> {
  const user = await requireBoardOrAbove();
  const name = String(formData.get("name") ?? "").trim();
  const email = memberEmail(String(formData.get("email") ?? ""));
  const type = String(formData.get("type") ?? "");
  const startDate = isoDate(String(formData.get("start_date") ?? "")) ?? today();
  if (!name) return { ok: false, error: "Enter the member's name." };
  if (!email) return { ok: false, error: "Enter a valid email address." };
  if (!isMembershipType(type)) return { ok: false, error: "Choose Primary or Secondary." };

  const added = await addMember({ name, email, type, startDate });
  if (!added.ok) return added;
  if (added.value.alreadyMember) {
    return { ok: true, personId: added.value.personId, message: `${name} is already a member, so nothing changed.` };
  }
  await recordAudit({
    table: "chapter_memberships",
    recordId: added.value.membershipId,
    operation: "insert",
    actor: user.email,
    newData: { person_id: added.value.personId, membership_type: type, status: "active", start_date: startDate },
  });
  revalidatePath("/board/members");
  return {
    ok: true,
    personId: added.value.personId,
    message: `${name} is now a member. They can sign in at /login with ${email}.`,
  };
}

export async function changeMembershipStatusAction(
  membershipId: string,
  status: string,
  endDate: string | null,
): Promise<ActionResult> {
  const user = await requireBoardOrAbove();
  if (!isMembershipStatus(status)) return { ok: false, error: "Choose a status." };
  const existing = await getMembership(String(membershipId ?? ""));
  if (!existing) return { ok: false, error: "That membership no longer exists." };

  const change = statusChange(status, isoDate(endDate), today());
  const saved = await updateMembershipStatus(existing.id, change);
  if (!saved.ok) return saved;
  await recordAudit({
    table: "chapter_memberships",
    recordId: existing.id,
    operation: "update",
    actor: user.email,
    oldData: { status: existing.status, end_date: existing.end_date },
    newData: change,
  });
  revalidatePath("/board/members");
  revalidatePath(`/board/members/${existing.person_id}`);
  return { ok: true, message: "Membership updated." };
}
