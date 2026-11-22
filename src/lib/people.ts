import { supabase } from "./supabase";
import {
  getRequalificationForPerson,
  getRequalificationMap,
  type Requalification,
} from "./requalification";

export type Person = {
  id: string;
  email: string;
};

export type MembershipStatus =
  | "active_member"
  | "on_leave"
  | "alumni"
  | "not_member";

export type MembershipType =
  | "member"
  | "secondary_member"
  | "alumni"
  | "slp"
  | "sap";

// Full record shape, used by the admin list and detail views.
export type PersonRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  source_site: string;
  hubspot_contact_id: string | null;
  membership_status: MembershipStatus | null;
  membership_type: MembershipType | null;
  member_since: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
};

export type RosterCompany = {
  id: string;
  name: string;
  industry: string | null;
  employees: number | null;
};

// A PersonRow plus rolled-up counts of related records.
export type PersonWithActivity = PersonRow & {
  surveyResponses: number;
  applications: number;
  inquiries: number;
  eventRegistrations: number;
};

export const MEMBERSHIP_STATUS_LABEL: Record<MembershipStatus, string> = {
  active_member: "Active",
  on_leave: "On leave",
  alumni: "Alumni",
  not_member: "Not a member",
};

export const MEMBERSHIP_TYPE_LABEL: Record<MembershipType, string> = {
  member: "Member",
  secondary_member: "Secondary",
  alumni: "Alumni",
  slp: "SLP",
  sap: "SAP",
};

// ============================================================
// Loaders
// ============================================================

export async function getAllPeople(): Promise<PersonRow[]> {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("getAllPeople:", error.message);
    return [];
  }
  return (data ?? []) as PersonRow[];
}

export async function getPersonById(id: string): Promise<PersonRow | null> {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.warn("getPersonById:", error.message);
    return null;
  }
  return (data as PersonRow | null) ?? null;
}

// Maps the relational chapter_memberships enums back onto the legacy
// people.membership_* enums the roster UI is built around, so the views
// stay unchanged while the data comes from the real membership table.
const MEMBERSHIP_STATUS_FROM_CHAPTER: Record<string, MembershipStatus> = {
  active: "active_member",
  on_leave: "on_leave",
};
const MEMBERSHIP_TYPE_FROM_CHAPTER: Record<string, MembershipType> = {
  "Primary Membership": "member",
  "Secondary Membership": "secondary_member",
};

type MembershipJoinRow = {
  status: string;
  membership_type: string;
  start_date: string | null;
  person:
    | (Omit<PersonRow, "membership_status" | "membership_type" | "member_since"> & {
        forum_id: string | null;
        forum_status: string | null;
      })
    | null;
};

// Members roster, sourced from the relational chapter_memberships table
// (the source of truth for who is a member), not the legacy people.*
// columns. Includes active and on-leave members. Joins each membership to
// its person and maps the chapter enums onto the legacy PersonRow shape.
export type RosterPerson = PersonRow & {
  forum_id: string | null;
  forum_status: string | null;
};

export async function getMemberRoster(): Promise<RosterPerson[]> {
  const { data, error } = await supabase
    .from("chapter_memberships")
    .select(
      "status, membership_type, start_date, " +
        "person:people!chapter_memberships_person_id_fkey(" +
        "id, email, name, phone, city, source_site, hubspot_contact_id, company_id, created_at, updated_at, forum_id, forum_status)",
    )
    .in("status", ["active", "on_leave"]);
  if (error) {
    console.warn("getMemberRoster:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as MembershipJoinRow[];
  return rows
    .filter((r) => r.person)
    .map((r) => ({
      ...(r.person as NonNullable<MembershipJoinRow["person"]>),
      membership_status: MEMBERSHIP_STATUS_FROM_CHAPTER[r.status] ?? null,
      membership_type: MEMBERSHIP_TYPE_FROM_CHAPTER[r.membership_type] ?? null,
      member_since: r.start_date,
    }))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}

// Live active-member headcount from the relational membership table.
// Used by the dashboard so the current-year KPI reflects the real roster
// rather than the hand-entered chapter_metrics figure.
export async function getActiveMemberCount(): Promise<number | null> {
  const { count, error } = await supabase
    .from("chapter_memberships")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");
  if (error) {
    console.warn("getActiveMemberCount:", error.message);
    return null;
  }
  return count ?? null;
}

export type LatestPulse = {
  rating: number;
  submittedAt: string;
};

export type RosterMember = PersonRow & {
  company: RosterCompany | null;
  latestPulse: LatestPulse | null;
  requalification: Requalification | null;
  forum_id: string | null;
  forum_status: string | null;
};

// Members roster enriched with the member's company (name + employees)
// and most recent transformational-growth-pulse response. Used by the
// admin roster page and shelf.
export async function getRosterWithDetails(): Promise<RosterMember[]> {
  const members = await getMemberRoster();
  if (members.length === 0) return [];

  // Companies join
  const companyIds = Array.from(
    new Set(members.map((m) => m.company_id).filter((id): id is string => !!id)),
  );
  const companyMap = new Map<string, RosterCompany>();
  if (companyIds.length > 0) {
    const { data: companies, error: companiesErr } = await supabase
      .from("companies")
      .select("id, name, industry, employees")
      .in("id", companyIds);
    if (companiesErr) {
      console.warn("getRosterWithDetails: companies", companiesErr.message);
    } else {
      for (const c of companies ?? []) {
        companyMap.set(c.id, c as RosterCompany);
      }
    }
  }

  // Latest pulse per member
  const latestByPerson = new Map<string, LatestPulse>();
  const { data: survey } = await supabase
    .from("surveys")
    .select("id")
    .eq("slug", "transformational-growth-pulse")
    .maybeSingle();
  if (survey) {
    const ids = members.map((m) => m.id);
    const { data: responses, error: respErr } = await supabase
      .from("survey_responses")
      .select("person_id, rating, submitted_at")
      .eq("survey_id", survey.id)
      .in("person_id", ids)
      .not("rating", "is", null)
      .order("submitted_at", { ascending: false });
    if (respErr) {
      console.warn("getRosterWithDetails: responses", respErr.message);
    } else {
      for (const r of responses ?? []) {
        if (!r.person_id || r.rating == null) continue;
        if (!latestByPerson.has(r.person_id)) {
          latestByPerson.set(r.person_id, {
            rating: r.rating,
            submittedAt: r.submitted_at,
          });
        }
      }
    }
  }

  const requalMap = await getRequalificationMap(members.map((m) => m.id));

  return members.map((m) => ({
    ...m,
    company: m.company_id ? companyMap.get(m.company_id) ?? null : null,
    latestPulse: latestByPerson.get(m.id) ?? null,
    requalification: requalMap.get(m.id) ?? null,
  }));
}

// Single enriched member for the member detail page, matching the shape the
// roster shelf renders. Starts from the person row (the source of truth for
// existence, so a valid non-roster person still resolves), then layers on the
// chapter_memberships status/type/since, the linked company, and the latest
// transformational-growth-pulse rating. Returns null only when no such person.
export async function getRosterMemberById(
  id: string,
): Promise<RosterMember | null> {
  const { data: personRow, error } = await supabase
    .from("people")
    .select(
      "id, email, name, phone, city, source_site, hubspot_contact_id, " +
        "membership_status, membership_type, member_since, company_id, " +
        "created_at, updated_at, forum_id, forum_status",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.warn("getRosterMemberById:", error.message);
    return null;
  }
  if (!personRow) return null;
  const person = personRow as unknown as RosterPerson;

  // Membership status/type/since come from the relational chapter_memberships
  // table (the roster's source of truth), mapped onto the legacy enums. If
  // there is no active/on-leave membership row (e.g. an alum reached by direct
  // URL), keep whatever the legacy people.* columns already hold.
  const { data: memberships } = await supabase
    .from("chapter_memberships")
    .select("status, membership_type, start_date")
    .eq("person_id", id)
    .in("status", ["active", "on_leave"])
    .order("start_date", { ascending: false })
    .limit(1);
  const membership = memberships?.[0] as
    | { status: string; membership_type: string; start_date: string | null }
    | undefined;

  let company: RosterCompany | null = null;
  if (person.company_id) {
    const { data: c, error: companyErr } = await supabase
      .from("companies")
      .select("id, name, industry, employees")
      .eq("id", person.company_id)
      .maybeSingle();
    if (companyErr) console.warn("getRosterMemberById: company", companyErr.message);
    else company = (c as RosterCompany | null) ?? null;
  }

  let latestPulse: LatestPulse | null = null;
  const { data: survey } = await supabase
    .from("surveys")
    .select("id")
    .eq("slug", "transformational-growth-pulse")
    .maybeSingle();
  if (survey) {
    const { data: responses } = await supabase
      .from("survey_responses")
      .select("rating, submitted_at")
      .eq("survey_id", survey.id)
      .eq("person_id", id)
      .not("rating", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(1);
    const r = responses?.[0] as
      | { rating: number; submitted_at: string }
      | undefined;
    if (r && r.rating != null) {
      latestPulse = { rating: r.rating, submittedAt: r.submitted_at };
    }
  }

  const requalification = await getRequalificationForPerson(id);

  return {
    ...person,
    membership_status: membership
      ? MEMBERSHIP_STATUS_FROM_CHAPTER[membership.status] ?? null
      : person.membership_status ?? null,
    membership_type: membership
      ? MEMBERSHIP_TYPE_FROM_CHAPTER[membership.membership_type] ?? null
      : person.membership_type ?? null,
    member_since: membership ? membership.start_date : person.member_since ?? null,
    company,
    latestPulse,
    requalification,
  };
}

// Roll up activity counts (survey responses, applications, inquiries, event RSVPs)
// into the people list. Done with separate aggregate queries, joined in memory.
export async function getAllPeopleWithActivity(): Promise<PersonWithActivity[]> {
  const people = await getAllPeople();
  if (people.length === 0) return [];
  const ids = people.map((p) => p.id);

  const [surveys, applications, inquiries, registrations] = await Promise.all([
    supabase.from("survey_responses").select("person_id").in("person_id", ids),
    supabase.from("applications").select("person_id").in("person_id", ids),
    supabase.from("inquiries").select("person_id").in("person_id", ids),
    supabase
      .from("event_registrations")
      .select("person_id")
      .in("person_id", ids)
      .neq("review_classification", "spam"),
  ]);

  const tally = (rows: Array<{ person_id: string | null }> | null | undefined) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) {
      if (!r.person_id) continue;
      m.set(r.person_id, (m.get(r.person_id) ?? 0) + 1);
    }
    return m;
  };

  const surveyMap = tally(surveys.data);
  const appMap = tally(applications.data);
  const inqMap = tally(inquiries.data);
  const regMap = tally(registrations.data);

  return people.map((p) => ({
    ...p,
    surveyResponses: surveyMap.get(p.id) ?? 0,
    applications: appMap.get(p.id) ?? 0,
    inquiries: inqMap.get(p.id) ?? 0,
    eventRegistrations: regMap.get(p.id) ?? 0,
  }));
}
