import { supabase } from "./supabase";
import { currentFyStart } from "./fiscal-year";

// Server-only loaders for annual member re-qualification (Plan 26).
// Reads are defensive: if the member_requalifications table is not yet applied
// in this environment, queries warn and return empty rather than crashing.

// The EO fiscal year re-qualification applies to: the current FY (members
// re-qualify into the year that begins on 1 July). Derived from the clock so
// it rolls over automatically each year instead of needing a manual bump.
export const REQUAL_FY_START = currentFyStart();

export function fyShort(fyStart: number): string {
  return `FY${fyStart}/${String((fyStart + 1) % 100).padStart(2, "0")}`;
}

export type Requalification = {
  personId: string;
  fiscalYearStart: number;
  confirmedName: string | null;
  confirmedEmail: string | null;
  confirmedPhone: string | null;
  confirmedCompany: string | null;
  revenue: number | null;
  employeeCount: number | null;
  ownershipPct: number | null;
  biggestChallenge: string | null;
  exitedOver8m: boolean | null;
  exitDetails: string | null;
  submittedAt: string;
};

type RequalRow = {
  person_id: string;
  fiscal_year_start: number;
  confirmed_name: string | null;
  confirmed_email: string | null;
  confirmed_phone: string | null;
  confirmed_company: string | null;
  revenue_2025: number | null;
  employee_count: number | null;
  ownership_pct: number | null;
  biggest_challenge: string | null;
  exited_over_8m: boolean | null;
  exit_details: string | null;
  submitted_at: string;
};

const SELECT =
  "person_id, fiscal_year_start, confirmed_name, confirmed_email, " +
  "confirmed_phone, confirmed_company, revenue_2025, employee_count, " +
  "ownership_pct, biggest_challenge, exited_over_8m, exit_details, submitted_at";

function toRequalification(r: RequalRow): Requalification {
  return {
    personId: r.person_id,
    fiscalYearStart: r.fiscal_year_start,
    confirmedName: r.confirmed_name,
    confirmedEmail: r.confirmed_email,
    confirmedPhone: r.confirmed_phone,
    confirmedCompany: r.confirmed_company,
    revenue: r.revenue_2025,
    employeeCount: r.employee_count,
    ownershipPct: r.ownership_pct,
    biggestChallenge: r.biggest_challenge,
    exitedOver8m: r.exited_over_8m,
    exitDetails: r.exit_details,
    submittedAt: r.submitted_at,
  };
}

// person_id -> their re-qualification for the given fiscal year (if any).
export async function getRequalificationMap(
  personIds: string[],
  fyStart: number = REQUAL_FY_START,
): Promise<Map<string, Requalification>> {
  const map = new Map<string, Requalification>();
  if (personIds.length === 0) return map;
  const { data, error } = await supabase
    .from("member_requalifications")
    .select(SELECT)
    .eq("fiscal_year_start", fyStart)
    .in("person_id", personIds);
  if (error) {
    console.warn("getRequalificationMap:", error.message);
    return map;
  }
  for (const r of (data ?? []) as unknown as RequalRow[]) {
    map.set(r.person_id, toRequalification(r));
  }
  return map;
}

// Count of submissions for the given fiscal year (for the surveys list badge).
export async function getRequalificationCount(
  fyStart: number = REQUAL_FY_START,
): Promise<number> {
  const { count, error } = await supabase
    .from("member_requalifications")
    .select("*", { count: "exact", head: true })
    .eq("fiscal_year_start", fyStart);
  if (error) {
    console.warn("getRequalificationCount:", error.message);
    return 0;
  }
  return count ?? 0;
}

// All submissions for the given fiscal year, newest first (for the results page).
export async function getAllRequalifications(
  fyStart: number = REQUAL_FY_START,
): Promise<Requalification[]> {
  const { data, error } = await supabase
    .from("member_requalifications")
    .select(SELECT)
    .eq("fiscal_year_start", fyStart)
    .order("submitted_at", { ascending: false });
  if (error) {
    console.warn("getAllRequalifications:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as RequalRow[]).map(toRequalification);
}

// Distinct fiscal years that have re-qualification submissions, unioned with
// the current requalification FY. Newest first, for the results-page selector.
export async function listRequalFiscalYears(): Promise<number[]> {
  const set = new Set<number>([REQUAL_FY_START]);
  const { data, error } = await supabase
    .from("member_requalifications")
    .select("fiscal_year_start");
  if (error) {
    console.warn("listRequalFiscalYears:", error.message);
    return [...set];
  }
  for (const r of (data ?? []) as { fiscal_year_start: number }[]) {
    set.add(r.fiscal_year_start);
  }
  return Array.from(set).sort((a, b) => b - a);
}

// A single member's re-qualification for the given fiscal year (or null).
export async function getRequalificationForPerson(
  personId: string,
  fyStart: number = REQUAL_FY_START,
): Promise<Requalification | null> {
  const { data, error } = await supabase
    .from("member_requalifications")
    .select(SELECT)
    .eq("person_id", personId)
    .eq("fiscal_year_start", fyStart)
    .maybeSingle();
  if (error) {
    console.warn("getRequalificationForPerson:", error.message);
    return null;
  }
  return data ? toRequalification(data as unknown as RequalRow) : null;
}
