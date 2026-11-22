"use server";

// The chapter app's version of edge8-web's goals actions (EO-owned): the chapter
// priorities (objectives), their key results and the chairs' goals that ladder
// to them. Every objective is a chapter priority for one fiscal year; a key
// result is accountable to one board member.
import { revalidatePath } from "next/cache";
import { companyOs } from "@/kernel/data/supabase";
import { readOr } from "@/kernel/data/read";
import { requirePermission } from "@/kernel/identity/access-request";
import { recordAudit } from "@/kernel/audit/audit";
import { toPatch } from "@/kernel/config/patch";
import type { Result } from "@/kernel/data/result";
import {
  DELIVERY_MIXES,
  KR_STATUSES,
  OBJECTIVE_LEVELS,
  OFFICES,
  type DeliveryMix,
  type KrStatus,
  type ObjectiveLevel,
} from "@/entities/org/lib/company/edges-shared";

function refresh() {
  revalidatePath("/board/goals");
  revalidatePath("/member/priorities");
}

// Empty strings become null so cleared fields don't persist as "".

export type ObjectiveInput = {
  level: ObjectiveLevel;
  title: string;
  office?: string;
  brand?: string;
  parent_kr_id?: string;
  quarter?: string;
  year: number;
  strategy_id?: string;
  owner_agent?: string;
  sort_order?: number;
};

export async function createObjective(input: ObjectiveInput): Promise<Result & { id?: string }> {
  const { user: admin } = await requirePermission("org.company");

  const title = input.title?.trim();
  if (!title) return { ok: false, error: "Objective title is required." };
  if (!OBJECTIVE_LEVELS.includes(input.level)) return { ok: false, error: "Invalid level." };
  if (input.level !== "company" && !input.parent_kr_id) {
    return { ok: false, error: "Pick the parent key result this objective serves. Only company objectives may float free." };
  }
  if (input.level === "office" && !OFFICES.includes(input.office as (typeof OFFICES)[number])) {
    return { ok: false, error: "Pick which office owns this objective." };
  }

  const row = {
    ...toPatch({ ...input }),
    title,
    // toPatch makes every key optional, so the two NOT NULL columns are named
    // again here. Same values it already carried — this only tells the checker
    // they are always present.
    level: input.level,
    year: input.year,
    office: input.level === "office" ? input.office : null,
    parent_kr_id: input.level === "company" ? null : input.parent_kr_id,
  };
  const { data, error } = await companyOs.from("objectives").insert(row).select("id").single();
  if (error) return { ok: false, error: error.message };

  await recordAudit({ table: "objectives", recordId: data.id, operation: "insert", actor: admin.email, newData: row });
  refresh();
  return { ok: true, id: data.id };
}

export async function updateObjective(
  id: string,
  patch: { title?: string; status?: string; brand?: string; owner_agent?: string },
): Promise<Result> {
  const { user: admin } = await requirePermission("org.company");
  if (patch.title !== undefined && !patch.title.trim()) {
    return { ok: false, error: "Objective title can't be empty." };
  }
  const updates = { ...toPatch(patch), updated_at: new Date().toISOString() };
  const { error } = await companyOs.from("objectives").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await recordAudit({ table: "objectives", recordId: id, operation: "update", actor: admin.email, newData: patch });
  refresh();
  return { ok: true };
}

export type KrInput = {
  objective_id: string;
  title: string;
  target_value?: number | null;
  unit?: string;
  direction?: "up" | "down";
  delivery_mix: DeliveryMix;
  accountable_person_id: string;
  executing_agent?: string;
  sort_order?: number;
};

export async function createKr(input: KrInput): Promise<Result & { id?: string }> {
  const { user: admin } = await requirePermission("org.company");

  const title = input.title?.trim();
  if (!title) return { ok: false, error: "Key result title is required." };
  if (!DELIVERY_MIXES.includes(input.delivery_mix)) return { ok: false, error: "Invalid delivery mix." };
  if (!input.accountable_person_id) {
    return { ok: false, error: "Every key result needs one accountable human." };
  }
  if (!(await isBoardPerson(input.accountable_person_id))) {
    return { ok: false, error: "The accountable person must be on the board roster." };
  }

  // Same as createObjective: toPatch optionalises everything, so the NOT NULL
  // columns are restated with the values they already had.
  const row = {
    ...toPatch({ ...input }),
    title,
    objective_id: input.objective_id,
    accountable_person_id: input.accountable_person_id,
  };
  const { data, error } = await companyOs.from("key_results").insert(row).select("id").single();
  if (error) return { ok: false, error: error.message };

  await recordAudit({ table: "key_results", recordId: data.id, operation: "insert", actor: admin.email, newData: row });
  refresh();
  return { ok: true, id: data.id };
}

export async function updateKr(id: string, patch: Partial<Omit<KrInput, "objective_id">>): Promise<Result> {
  const { user: admin } = await requirePermission("org.company");
  if (patch.title !== undefined && !patch.title.trim()) {
    return { ok: false, error: "Key result title can't be empty." };
  }
  if (patch.delivery_mix !== undefined && !DELIVERY_MIXES.includes(patch.delivery_mix)) {
    return { ok: false, error: "Invalid delivery mix." };
  }
  if (patch.accountable_person_id !== undefined && !(await isBoardPerson(patch.accountable_person_id))) {
    return { ok: false, error: "The accountable person must be on the board roster." };
  }
  const updates = { ...toPatch(patch), updated_at: new Date().toISOString() };
  const { error } = await companyOs.from("key_results").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await recordAudit({ table: "key_results", recordId: id, operation: "update", actor: admin.email, newData: patch });
  refresh();
  return { ok: true };
}

export async function checkInKr(id: string, input: { current_value: number; status: KrStatus }): Promise<Result> {
  const { user: admin } = await requirePermission("org.company");
  if (!KR_STATUSES.includes(input.status)) return { ok: false, error: "Invalid status." };
  if (!Number.isFinite(input.current_value)) return { ok: false, error: "Enter a number for the current value." };

  const updates = {
    current_value: input.current_value,
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  // The value the key result stood at before this check-in, read first so the
  // audit row carries both sides of the move. Anything downstream that wants
  // to say what a key result did between two dates — the coaching ladder's
  // company rung (K.43) is the first — needs the old value, and the trail is
  // the only place it survives. A failed read only costs the old side of the
  // row, so it never blocks the check-in itself.
  const before = readOr(
    await companyOs.from("key_results").select("current_value").eq("id", id).maybeSingle(),
    "[org/goals] key_results (audit old value)",
    null,
  );
  const { error } = await companyOs.from("key_results").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await recordAudit({
    table: "key_results",
    recordId: id,
    operation: "update",
    actor: admin.email,
    oldData: before ? { current_value: before.current_value } : null,
    newData: updates,
  });
  refresh();
  return { ok: true };
}

// The picker only offers the roster, but the action is the boundary: a person
// id that is not an active team member (board tier and up) is refused here.
async function isBoardPerson(personId: string): Promise<boolean> {
  if (!personId) return false;
  const { data } = await companyOs.from("team_members").select("id").eq("person_id", personId).eq("status", "active").maybeSingle();
  return Boolean(data);
}

// ---- Chair goals (board_priorities): a seat's goals, laddered to a rung ----

export type ChairGoalInput = { title: string; detail?: string; objective_id?: string; key_result_id?: string };

// A chair goal ladders to one key result, else to one objective, else to
// nothing. A key result implies its objective, so only one id is stored.
async function ladderOf(input: { objective_id?: string; key_result_id?: string }): Promise<Result & { objective_id?: string | null; key_result_id?: string | null }> {
  if (input.key_result_id) {
    const { data } = await companyOs.from("key_results").select("id").eq("id", input.key_result_id).maybeSingle();
    if (!data) return { ok: false, error: "That key result no longer exists." };
    return { ok: true, objective_id: null, key_result_id: input.key_result_id };
  }
  if (input.objective_id) {
    const { data } = await companyOs.from("objectives").select("id").eq("id", input.objective_id).maybeSingle();
    if (!data) return { ok: false, error: "That priority no longer exists." };
    return { ok: true, objective_id: input.objective_id, key_result_id: null };
  }
  return { ok: true, objective_id: null, key_result_id: null };
}

export async function createChairGoal(appointmentId: string, input: ChairGoalInput): Promise<Result & { id?: string }> {
  const { user: admin } = await requirePermission("org.company");
  const title = input.title?.trim();
  if (!title) return { ok: false, error: "Say what the goal is." };
  const { data: seat } = await companyOs.from("board_appointments").select("id").eq("id", appointmentId).maybeSingle();
  if (!seat) return { ok: false, error: "That board seat does not exist." };
  const ladder = await ladderOf(input);
  if (!ladder.ok) return ladder;
  const { data: last } = await companyOs
    .from("board_priorities")
    .select("position")
    .eq("board_appointment_id", appointmentId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = {
    board_appointment_id: appointmentId,
    position: (last?.position ?? 0) + 1,
    title,
    detail: input.detail?.trim() || null,
    objective_id: ladder.objective_id ?? null,
    key_result_id: ladder.key_result_id ?? null,
  };
  const { data, error } = await companyOs.from("board_priorities").insert(row).select("id").single();
  if (error) return { ok: false, error: error.message };
  await recordAudit({ table: "board_priorities", recordId: data.id, operation: "insert", actor: admin.email, newData: row });
  refresh();
  return { ok: true, id: data.id };
}

export async function updateChairGoal(id: string, input: ChairGoalInput): Promise<Result> {
  const { user: admin } = await requirePermission("org.company");
  const title = input.title?.trim();
  if (!title) return { ok: false, error: "Say what the goal is." };
  const ladder = await ladderOf(input);
  if (!ladder.ok) return ladder;
  const updates = {
    title,
    detail: input.detail?.trim() || null,
    objective_id: ladder.objective_id ?? null,
    key_result_id: ladder.key_result_id ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await companyOs.from("board_priorities").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await recordAudit({ table: "board_priorities", recordId: id, operation: "update", actor: admin.email, newData: updates });
  refresh();
  return { ok: true };
}

export async function deleteChairGoal(id: string): Promise<Result> {
  const { user: admin } = await requirePermission("org.company");
  const { error } = await companyOs.from("board_priorities").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await recordAudit({ table: "board_priorities", recordId: id, operation: "delete", actor: admin.email });
  refresh();
  return { ok: true };
}
