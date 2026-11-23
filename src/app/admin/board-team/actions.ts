"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { recordAudit } from "@/kernel/audit/audit";
import {
  addAppointment,
  copyYear,
  deleteAppointment,
  findOrCreatePerson,
  getAppointment,
  searchPeople,
} from "@/lib/board-team";
import { EDITABLE_POSITIONS, normaliseEmail, type EditablePosition, type TeamPerson } from "@/lib/board-team-model";

// Super admin only: an appointment grants board access for its year.

type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function validYear(year: number): boolean {
  return Number.isInteger(year) && year >= 2000 && year <= 2100;
}

export async function searchPeopleAction(query: string): Promise<TeamPerson[]> {
  await requireSuperAdmin();
  return searchPeople(String(query ?? "").slice(0, 80));
}

export async function appointAction(input: {
  year: number;
  roleId: string;
  position: EditablePosition;
  personId?: string;
  newName?: string;
  newEmail?: string;
}): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  if (!validYear(input.year)) return { ok: false, error: "Choose a board year." };
  if (!EDITABLE_POSITIONS.includes(input.position)) return { ok: false, error: "Choose Chair or Co-Chair." };
  if (!input.roleId) return { ok: false, error: "Choose a role." };

  let personId = input.personId ?? "";
  if (!personId) {
    const email = normaliseEmail(input.newEmail ?? "");
    const name = (input.newName ?? "").trim();
    if (!email || !name) return { ok: false, error: "Enter the person's name and email." };
    const person = await findOrCreatePerson(name, email);
    if (!person.ok) return person;
    personId = person.value.id;
  }

  const saved = await addAppointment(input.year, input.roleId, input.position, personId);
  if (!saved.ok) return saved;
  await recordAudit({
    table: "board_appointments",
    recordId: saved.value.id,
    operation: "insert",
    actor: admin.email,
    newData: { fiscal_year_start: input.year, board_role_id: input.roleId, position: input.position, person_id: personId },
  });
  revalidatePath("/admin/board-team");
  revalidatePath("/board-of-directors");
  return { ok: true };
}

export async function removeAppointmentAction(id: string): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const existing = await getAppointment(String(id ?? ""));
  if (!existing) return { ok: false, error: "That appointment no longer exists." };
  const removed = await deleteAppointment(existing.id);
  if (!removed.ok) return removed;
  await recordAudit({
    table: "board_appointments",
    recordId: existing.id,
    operation: "delete",
    actor: admin.email,
    oldData: existing,
  });
  revalidatePath("/admin/board-team");
  revalidatePath("/board-of-directors");
  return { ok: true };
}

export async function copyYearAction(from: number, to: number): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  if (!validYear(from) || !validYear(to) || from === to) return { ok: false, error: "Choose two different years." };
  const copied = await copyYear(from, to);
  if (!copied.ok) return copied;
  await recordAudit({
    table: "board_appointments",
    recordId: null,
    operation: "bulk_update",
    actor: admin.email,
    context: { action: "copy_year", from, to, copied: copied.value.copied },
  });
  revalidatePath("/admin/board-team");
  revalidatePath("/board-of-directors");
  return {
    ok: true,
    message: copied.value.copied === 0 ? "Nothing new to copy." : `Copied ${copied.value.copied} appointments.`,
  };
}
