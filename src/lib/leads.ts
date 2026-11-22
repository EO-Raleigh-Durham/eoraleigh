import { supabase } from "./supabase";

// Server-only loader for the Membership Recruitment > Leads list. A "lead" is a
// person whose HubSpot-style lifecycle_stage sits in the pre-opportunity range.
// Opportunities surface as Prospects (deals) and Customers as Members, so they
// are excluded here. Read-only: HubSpot remains the source of truth.

export type LeadRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  company: string | null;
  email: string;
  phone: string | null;
  lifecycle_stage: string | null;
};

const LEAD_STAGES = [
  "Lead",
  "Marketing Qualified Lead",
  "Sales Qualified Lead",
];

export async function getLeads(): Promise<LeadRow[]> {
  // NB: people has `company_id` (FK), not a `company` text column. Selecting a
  // non-existent column makes PostgREST error out and the list silently empty,
  // so we resolve the company name via a second query (same pattern as the
  // member roster in people.ts).
  const { data, error } = await supabase
    .from("people")
    .select("id, first_name, last_name, name, company_id, email, phone, lifecycle_stage")
    .in("lifecycle_stage", LEAD_STAGES)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("getLeads:", error.message);
    return [];
  }
  const rows = data ?? [];

  // Companies join (people.company_id -> companies.name), joined in memory.
  const companyIds = Array.from(
    new Set(
      rows.map((r) => r.company_id).filter((id): id is string => !!id),
    ),
  );
  const companyNames = new Map<string, string>();
  if (companyIds.length > 0) {
    const { data: companies, error: cErr } = await supabase
      .from("companies")
      .select("id, name")
      .in("id", companyIds);
    if (cErr) {
      console.warn("getLeads: companies", cErr.message);
    } else {
      for (const c of companies ?? []) companyNames.set(c.id, c.name);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    first_name: r.first_name,
    last_name: r.last_name,
    name: r.name,
    company: r.company_id ? companyNames.get(r.company_id) ?? null : null,
    email: r.email,
    phone: r.phone,
    lifecycle_stage: r.lifecycle_stage,
  }));
}

// First / last name for display: prefer the explicit columns, else split name.
export function leadName(l: LeadRow): { first: string; last: string } {
  if (l.first_name || l.last_name) {
    return { first: l.first_name ?? "", last: l.last_name ?? "" };
  }
  const parts = (l.name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}
