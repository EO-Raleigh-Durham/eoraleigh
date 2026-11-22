"use server";

import { requireMemberOrAbove } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { REQUAL_FY_START } from "@/lib/requalification";

export type RequalSubmission = {
  name: string;
  email: string;
  phone: string;
  company: string;
  revenue: number | null;
  employees: number | null;
  ownershipPct: number | null;
  challenge: string;
  exitedOver8m: boolean | null;
  exitDetails: string;
};

export type RequalResult = { ok: boolean; persisted: boolean; error?: string };

// The calendar year members report revenue for: the year before the FY they
// re-qualify into. Doubles as the company_revenue_history fiscal_year label.
const REVENUE_YEAR = String(REQUAL_FY_START - 1);

// Persists one re-qualification row per member per fiscal year, keyed by the
// signed-in member's person_id. One submission only: a second attempt in the
// same fiscal year is rejected (the page shows the read-only summary instead).
// After the insert, the confirmed core fields are written back to the
// canonical person record, and the member's primary company (people.company_id)
// gets this year's employees + revenue plus a company_revenue_history row.
export async function submitRequalification(
  input: RequalSubmission,
): Promise<RequalResult> {
  const user = await requireMemberOrAbove();
  if (!user.personId) {
    return {
      ok: false,
      persisted: false,
      error:
        "Your account isn't linked to a member record yet. Contact the chapter team and we'll sort it out.",
    };
  }

  const { data: existing } = await supabase
    .from("member_requalifications")
    .select("id")
    .eq("person_id", user.personId)
    .eq("fiscal_year_start", REQUAL_FY_START)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      persisted: false,
      error: "You have already submitted your re-qualification for this membership year.",
    };
  }

  const { error } = await supabase.from("member_requalifications").insert({
    person_id: user.personId,
    fiscal_year_start: REQUAL_FY_START,
    confirmed_name: input.name.trim() || null,
    confirmed_email: input.email.trim() || null,
    confirmed_phone: input.phone.trim() || null,
    confirmed_company: input.company.trim() || null,
    revenue_2025: input.revenue,
    employee_count: input.employees,
    ownership_pct: input.ownershipPct,
    biggest_challenge: input.challenge.trim() || null,
    exited_over_8m: input.exitedOver8m,
    exit_details: input.exitDetails.trim() || null,
    submitted_at: new Date().toISOString(),
  });

  if (error) {
    // Unique (person_id, fiscal_year_start) is the backstop against a race.
    if (error.code === "23505") {
      return {
        ok: false,
        persisted: false,
        error: "You have already submitted your re-qualification for this membership year.",
      };
    }
    return { ok: false, persisted: false, error: error.message };
  }

  // Write the confirmed core fields back to the canonical person record so the
  // roster reflects the freshest details the member just confirmed.
  await supabase
    .from("people")
    .update({
      name: input.name.trim() || null,
      phone: input.phone.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.personId);

  await updatePrimaryCompany(user.personId, input);

  return { ok: true, persisted: true };
}

// Sync the member's primary company with this year's figures: current
// employees and revenue on the companies row, plus a per-year row in
// company_revenue_history (the model set out in migration 044). A member with
// no linked company gets one created from the name they typed. An existing
// company is never renamed from the free-text field; the typed name stays
// snapshotted on the requalification row.
async function updatePrimaryCompany(
  personId: string,
  input: RequalSubmission,
): Promise<void> {
  const { data: person } = await supabase
    .from("people")
    .select("company_id")
    .eq("id", personId)
    .maybeSingle();

  let companyId = person?.company_id ?? null;

  if (!companyId) {
    const companyName = input.company.trim();
    if (!companyName) return;
    const { data: created, error: createErr } = await supabase
      .from("companies")
      .insert({ name: companyName })
      .select("id")
      .single();
    if (createErr || !created) {
      console.warn("requalify createCompany:", createErr?.message);
      return;
    }
    companyId = created.id;
    await supabase
      .from("people")
      .update({ company_id: companyId, updated_at: new Date().toISOString() })
      .eq("id", personId);
  }

  // Only overwrite with real answers; never blank existing company data.
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.employees != null) patch.employees = input.employees;
  if (input.revenue != null) {
    patch.fiscal_year_gross_revenue = input.revenue;
    patch.fiscal_year = REVENUE_YEAR;
  }
  if (Object.keys(patch).length > 1) {
    const { error: updateErr } = await supabase
      .from("companies")
      .update(patch)
      .eq("id", companyId);
    if (updateErr) console.warn("requalify updateCompany:", updateErr.message);
  }

  if (input.revenue != null) {
    const { error: histErr } = await supabase
      .from("company_revenue_history")
      .upsert(
        {
          company_id: companyId,
          fiscal_year: REVENUE_YEAR,
          revenue_usd: input.revenue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id,fiscal_year" },
      );
    if (histErr) console.warn("requalify revenueHistory:", histErr.message);
  }
}
