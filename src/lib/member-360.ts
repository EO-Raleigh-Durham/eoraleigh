import { supabase } from "./supabase.ts";
import { getFeedbackRating } from "./event-feedback.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Extra context for the member detail page (/board/members/[id]):
// what the member SAID (Growth Pulse history, event ratings they gave),
// plus board roles, renewal cycles, and company financials. Server-only.
// The DO side (score, trend, signal) comes from src/lib/engagement.ts.
// ============================================================

const PULSE_SLUG = "transformational-growth-pulse";

export type PulsePoint = { rating: number; submittedAt: string };

export type EventRatingGiven = {
  rating: number | null;
  metric: "Event value" | "Historical growth" | null;
  createdAt: string;
  eventTitle: string;
};

export type BoardAppointmentRow = {
  fiscalYearStart: number;
  position: string;
  roleName: string;
};

export type RenewalRow = {
  cycle: string;
  status: string;
  completedAt: string | null;
};

export type CompanyDetail = {
  revenue: number | null; // companies.fiscal_year_gross_revenue
  status: string | null;
  website: string | null;
};

export type Member360 = {
  pulseHistory: PulsePoint[]; // newest first
  eventRatings: EventRatingGiven[]; // newest first
  boardRoles: BoardAppointmentRow[]; // newest FY first
  renewals: RenewalRow[];
  companyDetail: CompanyDetail | null;
};

export type MemberEmailAliasesResult =
  | { status: "loaded"; emails: string[] }
  | { status: "unavailable" };

type MemberEmailQueryError = {
  code?: unknown;
  message?: unknown;
};

function errorClass(error: unknown): string {
  if (!(error instanceof Error)) return "DatabaseError";
  return /^[A-Za-z][A-Za-z0-9]*$/.test(error.name) ? error.name : "Error";
}

function errorMessageCategory(error: unknown): string {
  if (!error || typeof error !== "object") return "query_failed";
  const code = (error as MemberEmailQueryError).code;
  return typeof code === "string" && /^[A-Za-z0-9_.:-]+$/.test(code)
    ? code
    : "query_failed";
}

function logMemberEmailAliasesFailure(personId: string, error: unknown): void {
  // Do not include the database error message here. PostgREST messages can
  // echo query values, including an email address. The person ID, error class,
  // and bounded category are enough to diagnose the failure server-side.
  console.warn("loadMemberEmailAliases: query failed", {
    personId,
    errorClass: errorClass(error),
    messageCategory: errorMessageCategory(error),
  });
}

/**
 * Load the read-only email aliases for a board member.
 *
 * Keep this query deliberately narrow. The page renders the result from this
 * Server Component and never passes it into a Client Component. A query
 * failure is non-fatal so the rest of the Member 360 page remains usable.
 */
export async function loadMemberEmailAliases(
  personId: string,
  client: Pick<SupabaseClient, "from"> = supabase,
): Promise<MemberEmailAliasesResult> {
  try {
    const { data, error } = await client
      .from("person_emails")
      .select("email")
      .eq("person_id", personId)
      .eq("is_primary", false);

    if (error) {
      logMemberEmailAliasesFailure(personId, error);
      return { status: "unavailable" };
    }

    const emails = ((data ?? []) as unknown[]).flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const email = (row as { email?: unknown }).email;
      return typeof email === "string" && email.trim() ? [email.trim()] : [];
    });

    return { status: "loaded", emails };
  } catch (error) {
    logMemberEmailAliasesFailure(personId, error);
    return { status: "unavailable" };
  }
}

export async function loadMember360(
  personId: string,
  companyId: string | null,
): Promise<Member360> {
  const { data: pulseSurvey } = await supabase
    .from("surveys")
    .select("id")
    .eq("slug", PULSE_SLUG)
    .maybeSingle();

  const [pulseRes, feedbackRes, boardRes, renewalRes, companyRes] =
    await Promise.all([
      pulseSurvey
        ? supabase
            .from("survey_responses")
            .select("rating, submitted_at")
            .eq("survey_id", (pulseSurvey as { id: string }).id)
            .eq("person_id", personId)
            .not("rating", "is", null)
            .order("submitted_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase
        .from("event_feedback")
        .select("event_value_rating, rating_overall, created_at, events(title)")
        .eq("person_id", personId)
        .order("created_at", { ascending: false }),
      supabase
        .from("board_appointments")
        .select("fiscal_year_start, position, board_roles(name)")
        .eq("person_id", personId)
        .order("fiscal_year_start", { ascending: false }),
      supabase
        .from("member_renewals")
        .select("cycle, status, completed_at")
        .eq("person_id", personId)
        .order("created_at", { ascending: false }),
      companyId
        ? supabase
            .from("companies")
            .select("fiscal_year_gross_revenue, status, website")
            .eq("id", companyId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const pulseHistory: PulsePoint[] = (
    (pulseRes.data ?? []) as { rating: number; submitted_at: string }[]
  ).map((r) => ({ rating: r.rating, submittedAt: r.submitted_at }));

  const eventRatings: EventRatingGiven[] = (
    (feedbackRes.data ?? []) as unknown as {
      event_value_rating: number | null;
      rating_overall: number | null;
      created_at: string;
      events: { title: string } | null;
    }[]
  ).map((r) => {
    const preferredRating = getFeedbackRating(r);
    return {
      rating: preferredRating?.value ?? null,
      metric:
        preferredRating?.label === "Growth"
          ? "Historical growth"
          : (preferredRating?.label ?? null),
      createdAt: r.created_at,
      eventTitle: r.events?.title ?? "Event",
    };
  });

  const boardRoles: BoardAppointmentRow[] = (
    (boardRes.data ?? []) as unknown as {
      fiscal_year_start: number;
      position: string;
      board_roles: { name: string } | null;
    }[]
  ).map((r) => ({
    fiscalYearStart: r.fiscal_year_start,
    position: r.position,
    roleName: r.board_roles?.name ?? "Board",
  }));

  const renewals: RenewalRow[] = (
    (renewalRes.data ?? []) as {
      cycle: string;
      status: string;
      completed_at: string | null;
    }[]
  ).map((r) => ({
    cycle: r.cycle,
    status: r.status,
    completedAt: r.completed_at,
  }));

  const c = companyRes.data as {
    fiscal_year_gross_revenue: number | null;
    status: string | null;
    website: string | null;
  } | null;

  return {
    pulseHistory,
    eventRatings,
    boardRoles,
    renewals,
    companyDetail: c
      ? {
          revenue: c.fiscal_year_gross_revenue,
          status: c.status,
          website: c.website,
        }
      : null,
  };
}
