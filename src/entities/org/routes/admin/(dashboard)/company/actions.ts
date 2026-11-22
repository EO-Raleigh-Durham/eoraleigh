"use server";

// The chapter app's slice of edge8-web's company actions (EO-owned): the strategy
// edit. Edge8's file also edits members' personal goals, which the chapter app does
// not have (goals belong to chair seats; see edges/goals/actions.ts).
import { revalidatePath } from "next/cache";
import { companyOs } from "@/kernel/data/supabase";
import { requirePermission } from "@/kernel/identity/access-request";
import { recordAudit } from "@/kernel/audit/audit";
import { toPatch } from "@/kernel/config/patch";
import type { Result } from "@/kernel/data/result";

export async function updateStrategy(id: string, patch: { title?: string; body_md?: string }): Promise<Result> {
  const { user: admin } = await requirePermission("org.company");
  if (patch.title !== undefined && !patch.title.trim()) {
    return { ok: false, error: "The strategy line can't be empty." };
  }
  const updates = { ...toPatch(patch), updated_at: new Date().toISOString() };
  const { error } = await companyOs.from("strategies").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await recordAudit({ table: "strategies", recordId: id, operation: "update", actor: admin.email, newData: patch });
  revalidatePath("/board/strategy");
  return { ok: true };
}
