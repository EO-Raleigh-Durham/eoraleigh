"use server";

import { revalidatePath } from "next/cache";
import { requireBoardOrAbove } from "@/lib/auth";
import { requireArea } from "@/lib/access-grants-server";
import {
  SAP_DEAL_TYPE_AMOUNT,
  createSapPartner,
  deleteSapPartner,
  updateCompany,
  updateSapDeal,
  SAP_PIPELINE_STAGES,
  type SapDealStatus,
  type SapDealType,
  type SapPipelineStage,
} from "@/lib/sap";
import { supabase } from "@/lib/supabase";
import { vnToday } from "@/lib/access-grants";
import { addDays } from "@/lib/sap-pipeline";

// Server actions for the Strategic Alliance Partners admin.
// All actions return a result instead of redirecting so the form can run
// from either a dedicated page or an inline shelf — the caller decides
// whether to navigate or just close + refresh.

type SaveResult =
  | { ok: true; dealId: string }
  | { ok: false; error: string };

type StatusResult = { ok: true } | { ok: false; error: string };

const STATUSES: SapDealStatus[] = ["lead", "in_discussion", "active", "lost"];
const TYPES: SapDealType[] = ["platinum", "gold", "silver"];

function s(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function nullable(v: string): string | null {
  return v === "" ? null : v;
}

function parseStatus(v: string): SapDealStatus | null {
  return STATUSES.includes(v as SapDealStatus) ? (v as SapDealStatus) : null;
}

function parseType(v: string): SapDealType | null {
  return TYPES.includes(v as SapDealType) ? (v as SapDealType) : null;
}

function parseStage(v: string): SapPipelineStage | null {
  return SAP_PIPELINE_STAGES.includes(v as SapPipelineStage) ? (v as SapPipelineStage) : null;
}

// "" -> null; otherwise a non-negative whole number, or an error string.
function parseMoney(v: string, label: string): number | null | string {
  if (v === "") return null;
  const n = Number(v.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return `${label} must be a non-negative number`;
  return Math.round(n);
}

// ============================================================
// Create
// ============================================================
export async function createPartner(formData: FormData): Promise<SaveResult> {
  await requireArea("sap_pipeline", { edit: true });
  const name = s(formData.get("name"));
  const industry = s(formData.get("industry"));
  const website = s(formData.get("website"));
  const statusRaw = s(formData.get("status"));
  const dealTypeRaw = s(formData.get("deal_type"));
  const discount = s(formData.get("discount_note"));
  const owner = s(formData.get("deal_owner"));
  const intro = s(formData.get("introduced_by"));
  const motiv = s(formData.get("motivation"));
  const notes = s(formData.get("notes"));

  if (!name) return { ok: false, error: "Partner name is required" };
  const status = parseStatus(statusRaw);
  if (!status) return { ok: false, error: "Status is required" };
  const dealType = dealTypeRaw === "" ? null : parseType(dealTypeRaw);

  try {
    const { dealId } = await createSapPartner({
      name,
      industry: nullable(industry),
      website: nullable(website),
      status,
      deal_type: dealType,
      discount_note: nullable(discount),
      deal_owner: nullable(owner),
      introduced_by: nullable(intro),
      motivation: nullable(motiv),
      notes: nullable(notes),
    });
    revalidatePath("/board/strategic-alliance-partners");
    return { ok: true, dealId };
  } catch (err) {
    const e = err as Error;
    return { ok: false, error: e.message ?? "Failed to create partner" };
  }
}

// ============================================================
// Update (full edit form)
// ============================================================
export async function updatePartner(
  dealId: string,
  companyId: string,
  formData: FormData,
): Promise<SaveResult> {
  const user = await requireArea("sap_pipeline", { edit: true });
  const name = s(formData.get("name"));
  const industry = s(formData.get("industry"));
  const website = s(formData.get("website"));
  const companyNotes = s(formData.get("company_notes"));
  const statusRaw = s(formData.get("status"));
  const dealTypeRaw = s(formData.get("deal_type"));
  const amountRaw = s(formData.get("amount_usd"));
  const discount = s(formData.get("discount_note"));
  const owner = s(formData.get("deal_owner"));
  const intro = s(formData.get("introduced_by"));
  const motiv = s(formData.get("motivation"));
  const dealNotes = s(formData.get("deal_notes"));
  const lastContact = s(formData.get("last_contact_at"));
  const nextFollowup = s(formData.get("next_followup_at"));
  const closedWon = s(formData.get("closed_won_at"));
  const stageRaw = s(formData.get("pipeline_stage"));
  const nextStep = s(formData.get("next_step"));
  const cash = parseMoney(s(formData.get("cash_usd")), "Cash");
  const inKind = parseMoney(s(formData.get("in_kind_usd")), "In-kind");
  if (typeof cash === "string") return { ok: false, error: cash };
  if (typeof inKind === "string") return { ok: false, error: inKind };

  if (!name) return { ok: false, error: "Partner name is required" };
  const status = parseStatus(statusRaw);
  if (!status) return { ok: false, error: "Status is required" };
  const dealType = dealTypeRaw === "" ? null : parseType(dealTypeRaw);

  let amount = 0;
  if (amountRaw !== "") {
    const n = Number(amountRaw);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: "Amount must be a non-negative number" };
    }
    amount = Math.round(n);
  } else if (dealType) {
    amount = SAP_DEAL_TYPE_AMOUNT[dealType];
  }
  // When a cash/in-kind split is entered, the total follows it.
  if (cash !== null || inKind !== null) amount = (cash ?? 0) + (inKind ?? 0);

  try {
    // The company ID comes from the browser: only the deal's own company may
    // be edited through this form.
    const { data: deal, error: dealError } = await supabase
      .from("sap_deals")
      .select("company_id")
      .eq("id", dealId)
      .maybeSingle();
    if (dealError) throw dealError;
    if (!deal) return { ok: false, error: "Deal not found" };
    if ((deal as { company_id: string }).company_id !== companyId) {
      return { ok: false, error: "Company does not match this deal" };
    }
    await updateCompany(companyId, {
      name,
      industry: nullable(industry),
      website: nullable(website),
      notes: nullable(companyNotes),
    });
    await updateSapDeal(dealId, {
      status,
      deal_type: dealType,
      amount_usd: amount,
      discount_note: nullable(discount),
      deal_owner: nullable(owner),
      introduced_by: nullable(intro),
      motivation: nullable(motiv),
      notes: nullable(dealNotes),
      last_contact_at: nullable(lastContact),
      next_followup_at: nullable(nextFollowup),
      closed_won_at: nullable(closedWon),
      pipeline_stage: status === "in_discussion" ? parseStage(stageRaw) : null,
      cash_usd: cash,
      in_kind_usd: inKind,
      next_step: nullable(nextStep),
    }, user.id);
    revalidatePath("/board/strategic-alliance-partners");
    revalidatePath(`/board/strategic-alliance-partners/${dealId}`);
    return { ok: true, dealId };
  } catch (err) {
    const e = err as Error;
    return { ok: false, error: e.message ?? "Failed to update partner" };
  }
}

// ============================================================
// Status-only change (used by kanban quick-move)
// ============================================================
export async function changeStatus(
  dealId: string,
  statusRaw: string,
): Promise<StatusResult> {
  const user = await requireArea("sap_pipeline", { edit: true });
  const status = parseStatus(statusRaw);
  if (!status) return { ok: false, error: "Invalid status" };
  try {
    await updateSapDeal(dealId, { status }, user.id);
    revalidatePath("/board/strategic-alliance-partners");
    return { ok: true };
  } catch (err) {
    const e = err as Error;
    return { ok: false, error: e.message ?? "Failed to update status" };
  }
}

// ============================================================
// Quick actions (Today queue): one click, no form
// ============================================================
//   contacted: last contact = today (chapter timezone)
//   snooze:    next follow-up = 7 days after today or the current date,
//              whichever is later
export async function quickAction(
  dealId: string,
  kindRaw: string,
): Promise<StatusResult> {
  await requireArea("sap_pipeline", { edit: true });
  if (kindRaw !== "contacted" && kindRaw !== "snooze") {
    return { ok: false, error: "Unknown action" };
  }
  const today = vnToday();
  try {
    if (kindRaw === "contacted") {
      await updateSapDeal(dealId, { last_contact_at: today });
    } else {
      const { data, error } = await supabase
        .from("sap_deals")
        .select("next_followup_at")
        .eq("id", dealId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { ok: false, error: "Deal not found" };
      const current = (data as { next_followup_at: string | null }).next_followup_at;
      const base = current && current > today ? current : today;
      await updateSapDeal(dealId, { next_followup_at: addDays(base, 7) });
    }
    revalidatePath("/board/strategic-alliance-partners");
    return { ok: true };
  } catch (err) {
    const e = err as Error;
    return { ok: false, error: e.message ?? "Failed to update deal" };
  }
}

// ============================================================
// Delete
// ============================================================
export async function deletePartner(dealId: string): Promise<StatusResult> {
  // Delete stays board-only: contractors can edit but never delete.
  await requireBoardOrAbove();
  try {
    await deleteSapPartner(dealId);
    revalidatePath("/board/strategic-alliance-partners");
    return { ok: true };
  } catch (err) {
    const e = err as Error;
    return { ok: false, error: e.message ?? "Failed to delete partner" };
  }
}
