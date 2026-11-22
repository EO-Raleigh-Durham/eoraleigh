import { supabase } from "./supabase";
import { currentFyStart, fyStartForDate, fyWindow } from "./fiscal-year";
import type { EventTouch } from "./prospect-pipeline";

// ============================================================
// Deals (Member Acquisition + Onboarding Track pipelines)
//
// Server-only library for the new `deals` table (021_deals.sql).
// Mirrors the shape of src/lib/sap.ts but for the two HubSpot
// funnel pipelines that drive /board/prospects and
// /board/onboarding. SAP keeps its own table + lib (sap.ts).
// ============================================================

// ── Enums (verbatim from supabase/015_crm_enums.sql) ──────────
export type DealPipeline = "Member Acquisition" | "Onboarding Track";
export type DealStatus = "open" | "closed_won" | "closed_lost";

// Maps to the DB enum `chapter_membership_type` (deals.primary_interest).
// NOT the legacy people.membership_type enum (member/secondary_member/...).
export type MembershipType = "Primary Membership" | "Secondary Membership";

export type ChannelSource =
  | "Organic Search"
  | "Paid Search"
  | "Email Marketing"
  | "Organic Social"
  | "Referrals"
  | "Other Campaigns"
  | "Direct Traffic"
  | "Offline Sources"
  | "Paid Social"
  | "AI Referrals";

export type ClosedLostDescription =
  | "Not Qualified"
  | "Timing"
  | "Bad Timing"
  | "Too Busy / No Bandwidth"
  | "Value Not Clear"
  | "Price / Dues Objection"
  | "Forum Commitment Concern"
  | "Confidentiality / Trust Concern"
  | "Already in Another Peer Group"
  | "Chapter Fit Misalignment"
  | "Decision Maker Not Engaged"
  | "Process Stalled / Ghosted"
  | "Geography / Language Barrier"
  | "Chose Different Option"
  | "Other (Specify in Notes)";

export type DisqualificationReason =
  | "Revenue Too Low"
  | "Duplicate"
  | "Not a Majority Controller"
  | "No Response/Ghosted"
  | "Application Incomplete"
  | "Not a Good Fit"
  | "Referred to Accelerator"
  | "Declined to Pay"
  | "Already a Member"
  | "Blocked by EO"
  | "Withdrew Application"
  | "Rejected by Chapter - Assigning to New Chapter";

// ── Runtime enum lists (form dropdowns + server-side validation) ──
export const CHANNEL_SOURCES: ChannelSource[] = [
  "Organic Search",
  "Paid Search",
  "Email Marketing",
  "Organic Social",
  "Referrals",
  "Other Campaigns",
  "Direct Traffic",
  "Offline Sources",
  "Paid Social",
  "AI Referrals",
];

export const MEMBERSHIP_TYPES: MembershipType[] = [
  "Primary Membership",
  "Secondary Membership",
];

export const CLOSED_LOST_DESCRIPTIONS: ClosedLostDescription[] = [
  "Not Qualified",
  "Timing",
  "Bad Timing",
  "Too Busy / No Bandwidth",
  "Value Not Clear",
  "Price / Dues Objection",
  "Forum Commitment Concern",
  "Confidentiality / Trust Concern",
  "Already in Another Peer Group",
  "Chapter Fit Misalignment",
  "Decision Maker Not Engaged",
  "Process Stalled / Ghosted",
  "Geography / Language Barrier",
  "Chose Different Option",
  "Other (Specify in Notes)",
];

export const DISQUALIFICATION_REASONS: DisqualificationReason[] = [
  "Revenue Too Low",
  "Duplicate",
  "Not a Majority Controller",
  "No Response/Ghosted",
  "Application Incomplete",
  "Not a Good Fit",
  "Referred to Accelerator",
  "Declined to Pay",
  "Already a Member",
  "Blocked by EO",
  "Withdrew Application",
  "Rejected by Chapter - Assigning to New Chapter",
];

// ── Stage constants ───────────────────────────────────────────
export const MEMBER_ACQUISITION_STAGES = [
  "Connect & Qualify",
  "Experience EO",
  "Go <> No Go Call",
  "Revenue Verification Sent",
  "Interview",
  "Payment Request",
  "Closed Won",
  "Closed Lost",
] as const;

export const ONBOARDING_STAGES = [
  "Welcome Email",
  "President's Call",
  "Awaiting Forum Training",
  "Forum Trained",
  "Forum Placed",
  "Active Member",
] as const;

export type MemberAcquisitionStage = (typeof MEMBER_ACQUISITION_STAGES)[number];
export type OnboardingStage = (typeof ONBOARDING_STAGES)[number];

// ── Row + card shapes ─────────────────────────────────────────
// Every column from supabase/021_deals.sql. numeric -> number,
// date/timestamptz -> ISO string (as supabase-js returns them).
export type DealRow = {
  id: string;
  person_id: string | null;
  company_id: string | null;
  name: string;
  pipeline: DealPipeline;
  stage: string;
  deal_status: DealStatus;
  amount: number | null;
  currency: string;
  close_date: string | null;
  relationship_manager_id: string | null;
  primary_interest: MembershipType | null;
  channel_source: ChannelSource | null;
  closed_lost_description: ClosedLostDescription | null;
  closed_lost_reason: string | null;
  closed_won_reason: string | null;
  disqualification_reason: DisqualificationReason | null;
  disqualified_by: string | null;
  global_dues: number | null;
  membership_start_date: string | null;
  membership_end_date: string | null;
  description: string | null;
  ql_financial_commitment: boolean | null;
  ql_founder_controlling_owner: boolean | null;
  ql_revenue_verified: boolean | null;
  ql_time_commitment: boolean | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DealPerson = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  channel_source: ChannelSource | null;
};

// Typed creation fields for the board contact picker. The identity-aware
// implementation lives in the server-only deal-people module; this type stays
// here so client components can continue importing deal-related shapes safely.
export type NewPersonInput = {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email: string;
  phone?: string | null;
  city?: string | null;
};

export type DealCompany = {
  id: string;
  name: string | null;
  industry: string | null;
  fiscal_year_gross_revenue: number | null;
};

export type DealCard = {
  deal: DealRow;
  person: DealPerson | null;
  company: DealCompany | null;
  manager: DealPerson | null;
};

// ── Filters ───────────────────────────────────────────────────
export type DealFilters = {
  stages?: string[];
  managerId?: string;
  channels?: ChannelSource[];
  qualified?: boolean; // companies.fiscal_year_gross_revenue >= 1_000_000
  staleDays?: number; // last_activity_at < now() - staleDays
  q?: string; // ilike person name/email + company name + deal name
  // Fiscal-year scope for CLOSED deals only (Jul 1 -> Jun 30). Open deals
  // always show regardless; closed_won / closed_lost show only when their
  // close_date falls in this FY window. Undefined = no FY scoping (all years).
  fyStart?: number;
};

export type NewDealInput = {
  name: string;
  pipeline: DealPipeline;
  stage: string;
  person_id?: string | null;
  company_id?: string | null;
  amount?: number | null;
  currency?: string;
  channel_source?: ChannelSource | null;
  primary_interest?: MembershipType | null;
  relationship_manager_id?: string | null;
  description?: string | null;
  ql_financial_commitment?: boolean | null;
  ql_founder_controlling_owner?: boolean | null;
  ql_revenue_verified?: boolean | null;
  ql_time_commitment?: boolean | null;
};

// Two embeds of `people` (person + manager) need disambiguating FK
// hints; PostgREST cannot guess which FK to follow otherwise.
const DEAL_SELECT =
  "*, " +
  "person:people!deals_person_id_fkey(id, first_name, last_name, email, phone, city, channel_source), " +
  "company:companies!deals_company_id_fkey(id, name, industry, fiscal_year_gross_revenue), " +
  "manager:people!deals_relationship_manager_id_fkey(id, first_name, last_name, email, phone, city, channel_source)";

type DealRowWithJoins = DealRow & {
  person: DealPerson | null;
  company: DealCompany | null;
  manager: DealPerson | null;
};

function toCard(row: DealRowWithJoins): DealCard {
  const { person, company, manager, ...deal } = row;
  return { deal, person, company, manager };
}

// ============================================================
// Loaders
// ============================================================

export async function getDealsByPipeline(
  pipeline: DealPipeline,
  filters?: DealFilters,
): Promise<DealCard[]> {
  let query = supabase.from("deals").select(DEAL_SELECT).eq("pipeline", pipeline);

  if (filters?.stages?.length) query = query.in("stage", filters.stages);
  if (filters?.managerId)
    query = query.eq("relationship_manager_id", filters.managerId);
  if (filters?.channels?.length)
    query = query.in("channel_source", filters.channels);
  if (filters?.staleDays != null) {
    const cutoff = new Date(
      Date.now() - filters.staleDays * 86_400_000,
    ).toISOString();
    query = query.lt("last_activity_at", cutoff);
  }
  // Keep every open (prospect) deal, but only surface closed deals whose
  // close_date lands in the selected fiscal year. A closed deal with a NULL
  // close_date is not attributable to any FY, so it drops out of the view.
  if (filters?.fyStart != null) {
    const { start, end } = fyWindow(filters.fyStart);
    query = query.or(
      `deal_status.eq.open,and(close_date.gte.${start},close_date.lt.${end})`,
    );
  }
  const { data, error } = await query.order("last_activity_at", {
    ascending: false,
    nullsFirst: false,
  });
  if (error) {
    console.warn("getDealsByPipeline:", error.message);
    return [];
  }

  let cards = ((data ?? []) as unknown as DealRowWithJoins[]).map(toCard);

  // qualified + q span the joined company/person rows, so they are
  // applied in JS rather than as brittle PostgREST cross-table filters.
  if (filters?.qualified) {
    cards = cards.filter((c) => isRevenueEligible(c.company));
  }
  if (filters?.q) {
    const needle = filters.q.trim().toLowerCase();
    cards = cards.filter((c) => {
      const hay = [
        c.deal.name,
        c.person ? fullName(c.person) : "",
        c.person?.email ?? "",
        c.company?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }

  return cards;
}

export async function getDealById(id: string): Promise<DealCard | null> {
  const { data, error } = await supabase
    .from("deals")
    .select(DEAL_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.warn("getDealById:", error.message);
    return null;
  }
  if (!data) return null;
  return toCard(data as unknown as DealRowWithJoins);
}

// Fiscal years that have at least one closed deal in this pipeline, unioned
// with the current FY (so the dropdown always offers "this year"). Newest
// first. Powers the fiscal-year filter on /board/prospects.
export async function listDealFiscalYears(
  pipeline: DealPipeline,
): Promise<number[]> {
  const set = new Set<number>([currentFyStart()]);
  const { data, error } = await supabase
    .from("deals")
    .select("close_date")
    .eq("pipeline", pipeline)
    .not("close_date", "is", null);
  if (error) {
    console.warn("listDealFiscalYears:", error.message);
    return Array.from(set);
  }
  for (const r of (data ?? []) as { close_date: string | null }[]) {
    if (r.close_date) set.add(fyStartForDate(r.close_date));
  }
  return Array.from(set).sort((a, b) => b - a);
}

// ============================================================
// Mutations
//
// Thin primitives over the deals table (matches sap.ts: throw on
// error, let the calling server action map to {ok}/{error} and
// decide on revalidatePath). New-person / new-company creation is
// orchestrated in the prospects/onboarding actions, not here.
// ============================================================

export async function insertDeal(input: NewDealInput): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("deals")
    .insert({
      name: input.name,
      pipeline: input.pipeline,
      stage: input.stage,
      person_id: input.person_id ?? null,
      company_id: input.company_id ?? null,
      amount: input.amount ?? null,
      currency: input.currency ?? "USD",
      channel_source: input.channel_source ?? null,
      primary_interest: input.primary_interest ?? null,
      relationship_manager_id: input.relationship_manager_id ?? null,
      description: input.description ?? null,
      ql_financial_commitment: input.ql_financial_commitment ?? null,
      ql_founder_controlling_owner: input.ql_founder_controlling_owner ?? null,
      ql_revenue_verified: input.ql_revenue_verified ?? null,
      ql_time_commitment: input.ql_time_commitment ?? null,
      last_activity_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: (data as { id: string }).id };
}

export async function updateDeal(
  id: string,
  patch: Partial<DealRow>,
): Promise<void> {
  const { error } = await supabase.from("deals").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteDeal(id: string): Promise<void> {
  // tasks.deal_id is ON DELETE CASCADE, so linked tasks go with it.
  const { error } = await supabase.from("deals").delete().eq("id", id);
  if (error) throw error;
}

// Closed-Won handoff: stamps the source deal, creates the Onboarding
// Track card, and writes the chapter membership in one atomic RPC
// (supabase/024_close_won_rpc.sql). Idempotent on re-close. membershipId
// is null when the source deal has no linked person.
type HandoffRow = { onboarding_deal_id: string; membership_id: string | null };

export async function closeWonAndHandoff(
  dealId: string,
): Promise<
  | { ok: true; onboardingDealId: string; membershipId: string | null }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase.rpc("close_won_handoff", {
    source_deal_id: dealId,
  });
  if (error) return { ok: false, error: error.message };
  const row = ((data ?? []) as HandoffRow[])[0];
  return {
    ok: true,
    onboardingDealId: row?.onboarding_deal_id ?? "",
    membershipId: row?.membership_id ?? null,
  };
}

// ============================================================
// Helpers
// ============================================================

// No stage_entered_at column exists on deals, so updated_at is the
// closest available proxy: changeStage bumps it on every move, so
// this is accurate for drag-to-move; any other edit also resets it.
// (Decision 2026-05-29: updated_at proxy, no schema migration.)
export function daysInStage(deal: DealRow): number {
  const ts = deal.updated_at ?? deal.created_at;
  if (!ts) return 0;
  const diff = Date.now() - new Date(ts).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

export function fullName(person: DealPerson | null): string {
  if (!person) return "Unknown";
  const name = [person.first_name, person.last_name]
    .filter((p): p is string => Boolean(p && p.trim()))
    .join(" ")
    .trim();
  return name || person.email || "Unknown";
}

export async function searchCompanies(
  q: string,
  limit = 10,
): Promise<DealCompany[]> {
  const term = q.trim();
  if (!term) return [];
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, industry, fiscal_year_gross_revenue")
    .ilike("name", `%${term}%`)
    .limit(limit);
  if (error) {
    console.warn("searchCompanies:", error.message);
    return [];
  }
  return (data ?? []) as unknown as DealCompany[];
}

// EO staff are the relationship-manager candidates (people.is_eo_staff).
export async function getEoStaff(): Promise<DealPerson[]> {
  const { data, error } = await supabase
    .from("people")
    .select("id, first_name, last_name, email, phone, city, channel_source")
    .eq("is_eo_staff", true)
    .order("first_name", { ascending: true });
  if (error) {
    console.warn("getEoStaff:", error.message);
    return [];
  }
  return (data ?? []) as unknown as DealPerson[];
}

export type NewCompanyInput = {
  name: string;
  industry?: string | null;
  fiscal_year_gross_revenue?: number | null;
};

export async function createCompany(
  input: NewCompanyInput,
): Promise<{ id: string }> {
  const name = input.name.trim();
  if (!name) throw new Error("Company name is required");
  const { data, error } = await supabase
    .from("companies")
    .insert({
      name,
      industry: input.industry ?? null,
      fiscal_year_gross_revenue: input.fiscal_year_gross_revenue ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: (data as { id: string }).id };
}

// Revenue floor for EO membership eligibility (USD).
export const REVENUE_ELIGIBILITY_FLOOR = 1_000_000;

export function isRevenueEligible(company: DealCompany | null): boolean {
  return (company?.fiscal_year_gross_revenue ?? 0) >= REVENUE_ELIGIBILITY_FLOOR;
}

// ============================================================
// Prospects cockpit loaders (plan: docs/plans/12-prospects-cockpit.html)
// ============================================================

// Event registrations for the given prospects, flattened with the event's
// chapter-local date. Feeds the warmth signals in prospect-pipeline.ts.
export async function getProspectEventTouches(
  personIds: string[],
): Promise<EventTouch[]> {
  if (personIds.length === 0) return [];
  const { data, error } = await supabase
    .from("event_registrations")
    .select("person_id, status, event:events(title, starts_at)")
    .in("person_id", personIds)
    .neq("status", "cancelled");
  if (error) {
    console.warn("getProspectEventTouches:", error.message);
    return [];
  }
  type Row = { person_id: string; status: string; event: { title: string; starts_at: string | null } | null };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.event?.starts_at)
    .map((r) => ({
      person_id: r.person_id,
      status: r.status,
      event_title: r.event!.title,
      event_day: new Date(Date.parse(r.event!.starts_at!) + 7 * 3_600_000).toISOString().slice(0, 10),
    }));
}

// The FY new-member key result target; falls back to 24.
export async function getNewMemberTarget(): Promise<number> {
  const { data, error } = await supabase
    .from("key_results")
    .select("target_value")
    .ilike("title", "New members joined in FY%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return 24;
  return Number((data as { target_value: number }).target_value) || 24;
}
