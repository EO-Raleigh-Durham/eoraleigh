import { supabase } from "./supabase";

// ============================================================
// Strategic Alliance Partners (SAP)
// One sap_deal per company. People with membership_type='sap'
// can link to their company via people.company_id.
// ============================================================

export type SapDealStatus = "lead" | "in_discussion" | "active" | "lost";
export type SapDealType = "platinum" | "gold" | "silver";
export type SapPipelineStage = "contacted" | "meeting" | "proposal";

export const SAP_PIPELINE_STAGES: SapPipelineStage[] = ["contacted", "meeting", "proposal"];
export const SAP_PIPELINE_STAGE_LABEL: Record<SapPipelineStage, string> = {
  contacted: "Contacted",
  meeting: "Meeting",
  proposal: "Proposal",
};

// We keep the enum value 'active' in the DB so we don't have to migrate the
// schema, but everywhere in the UI we display it as "Won" to match how the
// chapter talks about closed sponsorship deals.
export const SAP_DEAL_STATUS_LABEL: Record<SapDealStatus, string> = {
  lead: "Lead",
  in_discussion: "In discussion",
  active: "Won",
  lost: "Lost",
};

export const SAP_DEAL_STATUS_ORDER: SapDealStatus[] = [
  "lead",
  "in_discussion",
  "active",
  "lost",
];

export const SAP_DEAL_TYPE_LABEL: Record<SapDealType, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
};

export const SAP_DEAL_TYPE_AMOUNT: Record<SapDealType, number> = {
  platinum: 5000,
  gold: 3000,
  silver: 0,
};

export type CompanyRow = {
  id: string;
  name: string;
  slug: string | null;
  industry: string | null;
  website: string | null;
  hubspot_company_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SapDealRow = {
  id: string;
  company_id: string;
  status: SapDealStatus;
  deal_type: SapDealType | null;
  amount_usd: number;
  discount_note: string | null;
  deal_owner: string | null;
  introduced_by: string | null;
  referred_by_person_id: string | null;
  motivation: string | null;
  notes: string | null;
  last_contact_at: string | null;
  next_followup_at: string | null;
  closed_won_at: string | null; // date the deal was closed-won; scopes SAP to a FY
  // Pipeline redesign (migration 111). pipeline_stage refines in_discussion.
  pipeline_stage: SapPipelineStage | null;
  cash_usd: number | null;
  in_kind_usd: number | null;
  next_step: string | null;
  stage_changed_at: string | null;
  hubspot_deal_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SapContact = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
};

export type SapPartner = {
  company: CompanyRow;
  deal: SapDealRow;
  contacts: SapContact[];
  referredBy: { id: string; name: string | null } | null;
};

// ============================================================
// Loaders
// ============================================================

export async function getAllSapPartners(): Promise<SapPartner[]> {
  const { data: deals, error: dealsErr } = await supabase
    .from("sap_deals")
    .select("*, company:companies!sap_deals_company_id_fkey(*)")
    .order("created_at", { ascending: true });
  if (dealsErr) {
    console.warn("getAllSapPartners deals:", dealsErr.message);
    return [];
  }
  if (!deals || deals.length === 0) return [];

  const companyIds = deals
    .map((d: { company: CompanyRow | null }) => d.company?.id)
    .filter((id): id is string => Boolean(id));

  const { data: contactRows, error: contactsErr } = await supabase
    .from("people")
    .select("id, name, email, phone, company_id")
    .eq("membership_type", "sap")
    .in("company_id", companyIds);
  if (contactsErr) {
    console.warn("getAllSapPartners contacts:", contactsErr.message);
  }

  const contactsByCompany = new Map<string, SapContact[]>();
  for (const c of contactRows ?? []) {
    const cid = (c as { company_id: string | null }).company_id;
    if (!cid) continue;
    const list = contactsByCompany.get(cid) ?? [];
    list.push({
      id: (c as { id: string }).id,
      name: (c as { name: string | null }).name,
      email: (c as { email: string }).email,
      phone: (c as { phone: string | null }).phone,
    });
    contactsByCompany.set(cid, list);
  }

  const referrerIds = Array.from(
    new Set(
      (deals as Array<SapDealRow>)
        .map((d) => d.referred_by_person_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const referrerById = new Map<string, { id: string; name: string | null }>();
  if (referrerIds.length > 0) {
    const { data: refRows } = await supabase
      .from("people")
      .select("id, name")
      .in("id", referrerIds);
    for (const r of refRows ?? []) {
      const row = r as { id: string; name: string | null };
      referrerById.set(row.id, { id: row.id, name: row.name });
    }
  }

  return (deals as Array<SapDealRow & { company: CompanyRow }>).map((d) => ({
    deal: stripCompany(d),
    company: d.company,
    contacts: contactsByCompany.get(d.company.id) ?? [],
    referredBy: d.referred_by_person_id
      ? referrerById.get(d.referred_by_person_id) ?? null
      : null,
  }));
}

export async function getSapPartnerById(
  dealId: string,
): Promise<SapPartner | null> {
  const { data, error } = await supabase
    .from("sap_deals")
    .select("*, company:companies!sap_deals_company_id_fkey(*)")
    .eq("id", dealId)
    .maybeSingle();
  if (error) {
    console.warn("getSapPartnerById:", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as SapDealRow & { company: CompanyRow };

  const { data: contactRows } = await supabase
    .from("people")
    .select("id, name, email, phone")
    .eq("membership_type", "sap")
    .eq("company_id", row.company.id)
    .order("name", { ascending: true });

  const contacts: SapContact[] = (contactRows ?? []).map((c) => ({
    id: (c as { id: string }).id,
    name: (c as { name: string | null }).name,
    email: (c as { email: string }).email,
    phone: (c as { phone: string | null }).phone,
  }));

  let referredBy: { id: string; name: string | null } | null = null;
  if (row.referred_by_person_id) {
    const { data: ref } = await supabase
      .from("people")
      .select("id, name")
      .eq("id", row.referred_by_person_id)
      .maybeSingle();
    if (ref) {
      const r = ref as { id: string; name: string | null };
      referredBy = { id: r.id, name: r.name };
    }
  }

  return { deal: stripCompany(row), company: row.company, contacts, referredBy };
}

function stripCompany(
  row: SapDealRow & { company?: unknown },
): SapDealRow {
  const { company: _omit, ...deal } = row as SapDealRow & { company?: unknown };
  void _omit;
  return deal;
}

// ============================================================
// Mutations
// ============================================================

export type SapDealPatch = {
  status?: SapDealStatus;
  deal_type?: SapDealType | null;
  amount_usd?: number;
  discount_note?: string | null;
  deal_owner?: string | null;
  introduced_by?: string | null;
  motivation?: string | null;
  notes?: string | null;
  last_contact_at?: string | null;
  next_followup_at?: string | null;
  closed_won_at?: string | null;
  pipeline_stage?: SapPipelineStage | null;
  cash_usd?: number | null;
  in_kind_usd?: number | null;
  next_step?: string | null;
};

export type CompanyPatch = {
  name?: string;
  industry?: string | null;
  website?: string | null;
  notes?: string | null;
};

export async function updateSapDeal(
  dealId: string,
  patch: SapDealPatch,
  changedBy: string | null = null,
): Promise<void> {
  const clean: Record<string, unknown> = { ...patch };

  // A sub-stage only exists while the deal is in discussion.
  if (patch.status !== undefined && patch.status !== "in_discussion") {
    clean.pipeline_stage = null;
  }

  // Stage history: when status or sub-stage changes, stamp stage_changed_at
  // and log the transition (feeds days-in-stage, later conversion rates).
  let transition: Record<string, unknown> | null = null;
  if (patch.status !== undefined || clean.pipeline_stage !== undefined) {
    const { data: before, error: readErr } = await supabase
      .from("sap_deals")
      .select("status, pipeline_stage")
      .eq("id", dealId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (before) {
      const prev = before as { status: SapDealStatus; pipeline_stage: SapPipelineStage | null };
      const nextStatus = (patch.status ?? prev.status) as SapDealStatus;
      const nextStage =
        nextStatus !== "in_discussion"
          ? null
          : clean.pipeline_stage !== undefined
            ? (clean.pipeline_stage as SapPipelineStage | null)
            : prev.pipeline_stage;
      if (nextStatus !== prev.status || nextStage !== prev.pipeline_stage) {
        clean.stage_changed_at = new Date().toISOString();
        transition = {
          deal_id: dealId,
          from_status: prev.status,
          to_status: nextStatus,
          from_stage: prev.pipeline_stage,
          to_stage: nextStage,
          changed_by: changedBy,
        };
      }
    }
  }

  // When deal_type is set, derive amount_usd from the canonical tier unless
  // the caller already provided an explicit amount.
  if (
    patch.deal_type &&
    patch.amount_usd === undefined &&
    patch.deal_type in SAP_DEAL_TYPE_AMOUNT
  ) {
    clean.amount_usd = SAP_DEAL_TYPE_AMOUNT[patch.deal_type];
  }

  const { error } = await supabase
    .from("sap_deals")
    .update(clean)
    .eq("id", dealId);
  if (error) throw error;

  if (transition) {
    // History is best-effort: a failed log must not undo a saved deal.
    const { error: logErr } = await supabase.from("sap_deal_stage_events").insert(transition);
    if (logErr) console.warn("sap stage event:", logErr.message);
  }
}

// The FY26/27 SAP cash key result. Falls back to the board's $30K target if
// the key result row is missing.
export async function getSapCashTarget(): Promise<number> {
  const { data, error } = await supabase
    .from("key_results")
    .select("target_value")
    .ilike("title", "Strategic Alliance Partner cash revenue%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return 30000;
  return Number((data as { target_value: number }).target_value) || 30000;
}

export async function updateCompany(
  companyId: string,
  patch: CompanyPatch,
): Promise<void> {
  const { error } = await supabase
    .from("companies")
    .update(patch)
    .eq("id", companyId);
  if (error) throw error;
}

export type NewSapPartnerInput = {
  name: string;
  industry?: string | null;
  website?: string | null;
  status: SapDealStatus;
  deal_type?: SapDealType | null;
  discount_note?: string | null;
  deal_owner?: string | null;
  introduced_by?: string | null;
  motivation?: string | null;
  notes?: string | null;
};

export async function createSapPartner(
  input: NewSapPartnerInput,
): Promise<{ companyId: string; dealId: string }> {
  const trimmedName = input.name.trim();
  if (!trimmedName) throw new Error("Partner name is required");

  const slug = slugify(trimmedName);

  // Insert company; if slug collides we reuse the existing row.
  const { data: existing } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  let companyId: string;
  if (existing) {
    companyId = (existing as { id: string }).id;
    await updateCompany(companyId, {
      name: trimmedName,
      industry: input.industry ?? null,
      website: input.website ?? null,
    });
  } else {
    const { data, error } = await supabase
      .from("companies")
      .insert({
        name: trimmedName,
        slug,
        industry: input.industry ?? null,
        website: input.website ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    companyId = (data as { id: string }).id;
  }

  const amount =
    input.deal_type && input.deal_type in SAP_DEAL_TYPE_AMOUNT
      ? SAP_DEAL_TYPE_AMOUNT[input.deal_type]
      : 0;

  const { data: deal, error: dealErr } = await supabase
    .from("sap_deals")
    .upsert(
      {
        company_id: companyId,
        status: input.status,
        deal_type: input.deal_type ?? null,
        amount_usd: amount,
        discount_note: input.discount_note ?? null,
        deal_owner: input.deal_owner ?? null,
        introduced_by: input.introduced_by ?? null,
        motivation: input.motivation ?? null,
        notes: input.notes ?? null,
      },
      { onConflict: "company_id" },
    )
    .select("id")
    .single();
  if (dealErr) throw dealErr;

  return { companyId, dealId: (deal as { id: string }).id };
}

export type SapNominationInput = {
  companyName: string;
  website?: string | null;
  industry?: string | null;
  motivation?: string | null;
  contactNote?: string | null;
  referredByPersonId: string;
  referredByName: string;
};

// Member-submitted SAP referral from the public /partners/suggest form.
// Safe by design: it never overwrites an existing deal. If the company is
// already in the pipeline we only append a referral note and backfill the
// referrer link when empty, leaving status, tier, amount, and owner intact.
export async function submitSapNomination(
  input: SapNominationInput,
): Promise<{ companyId: string; dealId: string; alreadyInPipeline: boolean }> {
  const name = input.companyName.trim();
  if (!name) throw new Error("Company name is required");
  const slug = slugify(name);

  // Resolve or create the company. Only backfill website/industry when the
  // existing row is missing them; never overwrite curated data.
  const { data: existingCompany } = await supabase
    .from("companies")
    .select("id, website, industry")
    .eq("slug", slug)
    .maybeSingle();

  let companyId: string;
  if (existingCompany) {
    const ec = existingCompany as {
      id: string;
      website: string | null;
      industry: string | null;
    };
    companyId = ec.id;
    const fill: Record<string, unknown> = {};
    if (input.website && !ec.website) fill.website = input.website;
    if (input.industry && !ec.industry) fill.industry = input.industry;
    if (Object.keys(fill).length > 0) {
      await supabase.from("companies").update(fill).eq("id", companyId);
    }
  } else {
    const { data, error } = await supabase
      .from("companies")
      .insert({
        name,
        slug,
        industry: input.industry ?? null,
        website: input.website ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    companyId = (data as { id: string }).id;
  }

  // Already tracked in the pipeline? Append a referral note and backfill the
  // referrer, but do not touch the deal's stage or commercial fields.
  const { data: existingDeal } = await supabase
    .from("sap_deals")
    .select("id, notes, referred_by_person_id")
    .eq("company_id", companyId)
    .maybeSingle();

  if (existingDeal) {
    const ed = existingDeal as {
      id: string;
      notes: string | null;
      referred_by_person_id: string | null;
    };
    const stamp = new Date().toISOString().slice(0, 10);
    const contactSuffix = input.contactNote
      ? `; contact: ${input.contactNote}`
      : "";
    const line = `Member referral from ${input.referredByName} (${stamp})${
      input.motivation ? `: ${input.motivation}` : ""
    }${contactSuffix}`;
    const patch: Record<string, unknown> = {
      notes: ed.notes ? `${ed.notes}\n${line}` : line,
    };
    if (!ed.referred_by_person_id) {
      patch.referred_by_person_id = input.referredByPersonId;
    }
    const { error } = await supabase
      .from("sap_deals")
      .update(patch)
      .eq("id", ed.id);
    if (error) throw error;
    return { companyId, dealId: ed.id, alreadyInPipeline: true };
  }

  const notes = input.contactNote
    ? `Member contact: ${input.contactNote}`
    : null;
  const { data: created, error: createErr } = await supabase
    .from("sap_deals")
    .insert({
      company_id: companyId,
      status: "lead",
      introduced_by: input.referredByName,
      referred_by_person_id: input.referredByPersonId,
      motivation: input.motivation ?? null,
      notes,
    })
    .select("id")
    .single();
  if (createErr) throw createErr;
  return {
    companyId,
    dealId: (created as { id: string }).id,
    alreadyInPipeline: false,
  };
}

export async function deleteSapPartner(dealId: string): Promise<void> {
  // Delete the deal; keep the company row so we don't orphan people linked
  // to it. Admin can later remove the company manually if it really is gone.
  const { error } = await supabase.from("sap_deals").delete().eq("id", dealId);
  if (error) throw error;
}

// ============================================================
// Helpers
// ============================================================

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

// Aggregated stats for the admin page header.
export type SapStats = {
  total: number;
  active: number;
  inDiscussion: number;
  leads: number;
  lost: number;
  activeRevenueUsd: number;
};

export function computeSapStats(partners: SapPartner[]): SapStats {
  let active = 0;
  let inDiscussion = 0;
  let leads = 0;
  let lost = 0;
  let activeRevenueUsd = 0;
  for (const p of partners) {
    switch (p.deal.status) {
      case "active":
        active += 1;
        activeRevenueUsd += p.deal.amount_usd ?? 0;
        break;
      case "in_discussion":
        inDiscussion += 1;
        break;
      case "lead":
        leads += 1;
        break;
      case "lost":
        lost += 1;
        break;
    }
  }
  return {
    total: partners.length,
    active,
    inDiscussion,
    leads,
    lost,
    activeRevenueUsd,
  };
}
