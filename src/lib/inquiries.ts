import { supabase } from "./supabase";
import { resolvePublicPerson } from "./public-person";

// Server-only helper for recording inquiries: podcast guest pitches,
// partner inquiries, generic contact-form submissions.

export type InquiryKind =
  | "podcast_guest"
  | "partner_strategic"
  | "partner_sponsor"
  | "partner_event"
  | "contact";

export type InquiryInput = {
  email: string;
  name?: string;
  kind: InquiryKind;
  payload: Record<string, unknown>;
};

export type InquiryResult = {
  inquiryId: string;
  personId: string;
};

export async function createInquiry(input: InquiryInput): Promise<InquiryResult> {
  if (!input.email) {
    throw new Error("createInquiry: email is required");
  }

  const person = await resolvePublicPerson({
    email: input.email,
    name: input.name,
  });

  const { data, error } = await supabase
    .from("inquiries")
    .insert({
      person_id: person.id,
      kind: input.kind,
      payload: input.payload,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { inquiryId: data.id as string, personId: person.id };
}

// Messages members send to the board from /member/contact-board, for the board
// inbox at /board/inquiries. These are 'contact' inquiries tagged with payload
// category 'board'. Resilient: on error returns []. Server-only.
export type BoardInquiry = {
  id: string;
  status: string;
  createdAt: string;
  fromName: string | null;
  fromEmail: string | null;
  subject: string | null;
  message: string;
};

export async function listBoardInquiries(): Promise<BoardInquiry[]> {
  const { data, error } = await supabase
    .from("inquiries")
    .select("id, status, created_at, payload")
    .eq("kind", "contact")
    .eq("payload->>category", "board")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("listBoardInquiries:", error.message);
    return [];
  }

  return ((data ?? []) as {
    id: string;
    status: string;
    created_at: string;
    payload: Record<string, unknown>;
  }[]).map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: r.created_at,
    fromName: (r.payload?.from_name as string | null) ?? null,
    fromEmail: (r.payload?.from_email as string | null) ?? null,
    subject: (r.payload?.subject as string | null) ?? null,
    message: (r.payload?.message as string | null) ?? "",
  }));
}

// Count of unread board messages, for the sidebar inbox badge. "Unread" is
// status 'new' (the inquiries default); opening the inbox flips them to 'read'.
// Resilient: on error returns 0. Server-only.
export async function countNewBoardInquiries(): Promise<number> {
  const { count, error } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("kind", "contact")
    .eq("payload->>category", "board")
    .eq("status", "new");

  if (error) {
    console.warn("countNewBoardInquiries:", error.message);
    return 0;
  }
  return count ?? 0;
}

// Mark every new board message as read. Called when the board opens the inbox
// so the badge clears. Resilient: on error logs and returns. Server-only.
export async function markBoardInquiriesRead(): Promise<void> {
  const { error } = await supabase
    .from("inquiries")
    .update({ status: "read" })
    .eq("kind", "contact")
    .eq("payload->>category", "board")
    .eq("status", "new");

  if (error) console.warn("markBoardInquiriesRead:", error.message);
}

// Sign-ups for the Leadership in the AI Era interest list, written by
// /api/leadership-interest as 'contact' inquiries tagged payload category
// 'leadership_interest'. Name and email live on the linked people row. Read by
// /board/leadership-interest and its CSV export, both behind
// requireBoardOrAbove(). Throws on a query error so an export never silently
// ships a partial list. Server-only.
export type LeadershipInterestSignup = {
  id: string;
  createdAt: string;
  name: string | null;
  email: string | null;
  company: string | null;
  membership: "member" | "not_yet" | null;
  role: string | null;
  revenueScale: string | null;
};

export async function listLeadershipInterestSignups(): Promise<LeadershipInterestSignup[]> {
  const { data, error } = await supabase
    .from("inquiries")
    .select("id, created_at, payload, person:people(name, email)")
    .eq("kind", "contact")
    .eq("payload->>category", "leadership_interest")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listLeadershipInterestSignups: ${error.message}`);

  type Person = { name: string | null; email: string | null };
  return ((data ?? []) as unknown as {
    id: string;
    created_at: string;
    payload: Record<string, unknown>;
    person: Person | Person[] | null;
  }[]).map((r) => {
    const person = Array.isArray(r.person) ? r.person[0] : r.person;
    const membership = r.payload?.membership;
    return {
      id: r.id,
      createdAt: r.created_at,
      name: person?.name ?? null,
      email: person?.email ?? null,
      company: (r.payload?.company as string | null) ?? null,
      membership: membership === "member" || membership === "not_yet" ? membership : null,
      role: (r.payload?.role_in_company as string | null) ?? null,
      revenueScale: (r.payload?.revenue_scale as string | null) ?? null,
    };
  });
}
