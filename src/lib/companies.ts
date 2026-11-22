import { supabase } from "./supabase";
import { getMemberRoster } from "./people";
import { getRequalificationMap } from "./requalification";

// Server-only loader for the Member Companies board page: every company that
// an active or on-leave roster member points at via people.company_id, with
// the linked members and the current fiscal year's requalification status.

export type MemberCompany = {
  id: string;
  name: string;
  industry: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  employees: number | null;
  revenue: number | null; // companies.fiscal_year_gross_revenue
  revenueYear: string | null; // companies.fiscal_year label for that figure
  members: { id: string; name: string | null }[];
  requalified: boolean; // any linked member requalified this FY
};

export type MemberCompanyRollup = {
  companies: MemberCompany[];
  totalEmployees: number;
  totalRevenue: number;
};

type CompanyRow = {
  id: string;
  name: string;
  industry: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  employees: number | null;
  fiscal_year_gross_revenue: number | null;
  fiscal_year: string | null;
};

export async function getMemberCompanies(): Promise<MemberCompanyRollup> {
  const empty: MemberCompanyRollup = {
    companies: [],
    totalEmployees: 0,
    totalRevenue: 0,
  };
  const roster = await getMemberRoster();
  if (roster.length === 0) return empty;

  const membersByCompany = new Map<string, { id: string; name: string | null }[]>();
  for (const m of roster) {
    if (!m.company_id) continue;
    const list = membersByCompany.get(m.company_id) ?? [];
    list.push({ id: m.id, name: m.name });
    membersByCompany.set(m.company_id, list);
  }
  const companyIds = [...membersByCompany.keys()];
  if (companyIds.length === 0) return empty;

  const [{ data, error }, requalMap] = await Promise.all([
    supabase
      .from("companies")
      .select(
        "id, name, industry, city, country, website, employees, " +
          "fiscal_year_gross_revenue, fiscal_year",
      )
      .in("id", companyIds)
      .order("name"),
    getRequalificationMap(roster.map((m) => m.id)),
  ]);
  if (error) {
    console.warn("getMemberCompanies:", error.message);
    return empty;
  }

  const companies = ((data ?? []) as unknown as CompanyRow[]).map((c) => {
    const members = membersByCompany.get(c.id) ?? [];
    return {
      id: c.id,
      name: c.name,
      industry: c.industry,
      city: c.city,
      country: c.country,
      website: c.website,
      employees: c.employees,
      revenue: c.fiscal_year_gross_revenue,
      revenueYear: c.fiscal_year,
      members,
      requalified: members.some((m) => requalMap.has(m.id)),
    };
  });

  return {
    companies,
    totalEmployees: companies.reduce((sum, c) => sum + (c.employees ?? 0), 0),
    totalRevenue: companies.reduce((sum, c) => sum + (c.revenue ?? 0), 0),
  };
}
