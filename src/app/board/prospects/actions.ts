"use server";

import { revalidatePath } from "next/cache";
import { requireBoardOrAbove } from "@/lib/auth";
import {
  findOrCreatePerson,
  formatExistingPersonError,
  searchPeople,
} from "@/lib/deal-people";
import {
  CHANNEL_SOURCES,
  CLOSED_LOST_DESCRIPTIONS,
  DISQUALIFICATION_REASONS,
  MEMBER_ACQUISITION_STAGES,
  MEMBERSHIP_TYPES,
  closeWonAndHandoff,
  createCompany,
  deleteDeal as deleteDealRow,
  getDealById,
  insertDeal,
  searchCompanies,
  updateDeal as updateDealRow,
  type ChannelSource,
  type ClosedLostDescription,
  type DealCompany,
  type DealPerson,
  type DisqualificationReason,
  type MemberAcquisitionStage,
  type MembershipType,
} from "@/lib/deals";
import { appendNote } from "@/lib/note-entries";
import { CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

// Server actions for the Prospects (Member Acquisition) admin.
// Mirrors the SAP actions.ts convention: every action returns
// {ok:true,...} | {ok:false,error} so the kanban/form share one
// error-handling path. Moving a deal to Closed Won (by drag or by form
// save) runs the atomic close_won_handoff RPC, which also creates the
// Onboarding Track card and the chapter membership row.

type SaveResult = { ok: true; id: string } | { ok: false; error: string };
type ActionResult = { ok: true } | { ok: false; error: string };

function s(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}
function nullable(v: string): string | null {
  return v === "" ? null : v;
}
function triState(v: string): boolean | null {
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

function parseStage(v: string): MemberAcquisitionStage | null {
  return (MEMBER_ACQUISITION_STAGES as readonly string[]).includes(v)
    ? (v as MemberAcquisitionStage)
    : null;
}
function inEnum<T extends string>(list: readonly T[], v: string): T | null {
  return (list as readonly string[]).includes(v) ? (v as T) : null;
}
function parseAmount(v: string): { ok: true; value: number | null } | { ok: false } {
  if (v === "") return { ok: true, value: null };
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return { ok: false };
  return { ok: true, value: n };
}

// Derived deal_status + close_date from a stage (shared by create/update/move).
function derive(stage: MemberAcquisitionStage): {
  deal_status: "open" | "closed_won" | "closed_lost";
  close_date: string | null;
} {
  if (stage === "Closed Won")
    return { deal_status: "closed_won", close_date: new Date().toISOString() };
  if (stage === "Closed Lost")
    return { deal_status: "closed_lost", close_date: new Date().toISOString() };
  return { deal_status: "open", close_date: null };
}

// ============================================================
// Drag-to-move stage (kanban)
// ============================================================
export async function changeStage(
  dealId: string,
  newStage: string,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  const stage = parseStage(newStage);
  if (!stage) return { ok: false, error: "Invalid stage" };
  try {
    if (stage === "Closed Won") {
      const handoff = await closeWonAndHandoff(dealId);
      if (!handoff.ok) return handoff;
      revalidatePath("/board/prospects");
      revalidatePath("/board/onboarding");
      return { ok: true };
    }
    const { deal_status, close_date } = derive(stage);
    await updateDealRow(dealId, {
      stage,
      deal_status,
      close_date,
      last_activity_at: new Date().toISOString(),
    });
    revalidatePath("/board/prospects");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? "Failed to move deal" };
  }
}

// ============================================================
// Cockpit one-click actions (Contact next / Clear out)
// ============================================================
// "contacted" logs a touch now; "close_ghosted" closes the deal as lost with
// the Process Stalled / Ghosted reason. Only open Member Acquisition deals.
export async function quickAction(
  dealId: string,
  kind: "contacted" | "close_ghosted",
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (kind !== "contacted" && kind !== "close_ghosted") {
    return { ok: false, error: "Unknown action" };
  }
  try {
    const card = await getDealById(dealId);
    if (!card || card.deal.pipeline !== "Member Acquisition") {
      return { ok: false, error: "Deal not found" };
    }
    if (card.deal.deal_status !== "open") {
      return { ok: false, error: "This deal is already closed" };
    }
    const now = new Date().toISOString();
    if (kind === "contacted") {
      await updateDealRow(dealId, { last_activity_at: now });
    } else {
      await updateDealRow(dealId, {
        stage: "Closed Lost",
        deal_status: "closed_lost",
        close_date: now,
        closed_lost_description: "Process Stalled / Ghosted",
        last_activity_at: now,
      });
    }
    revalidatePath("/board/prospects");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? "Action failed" };
  }
}

// ============================================================
// Shared field parsing for create + update
// ============================================================
type DealFields = {
  name: string;
  stage: MemberAcquisitionStage;
  amount: number | null;
  currency: string;
  channel_source: ChannelSource | null;
  primary_interest: MembershipType | null;
  relationship_manager_id: string | null;
  description: string | null;
  ql_founder_controlling_owner: boolean | null;
  ql_revenue_verified: boolean | null;
  ql_financial_commitment: boolean | null;
  ql_time_commitment: boolean | null;
  closed_lost_description: ClosedLostDescription | null;
  closed_lost_reason: string | null;
  closed_won_reason: string | null;
  disqualification_reason: DisqualificationReason | null;
};

function parseDealFields(
  fd: FormData,
): { ok: true; fields: DealFields } | { ok: false; error: string } {
  const name = s(fd.get("name"));
  if (!name) return { ok: false, error: "Deal name is required" };

  const stage = parseStage(s(fd.get("stage")));
  if (!stage) return { ok: false, error: "A valid stage is required" };

  const amount = parseAmount(s(fd.get("amount")));
  if (!amount.ok)
    return { ok: false, error: "Amount must be a non-negative number" };

  const closedLostDesc = inEnum(
    CLOSED_LOST_DESCRIPTIONS,
    s(fd.get("closed_lost_description")),
  );
  if (stage === "Closed Lost" && !closedLostDesc) {
    return {
      ok: false,
      error: "A closed-lost reason is required when the stage is Closed Lost",
    };
  }

  return {
    ok: true,
    fields: {
      name,
      stage,
      amount: amount.value,
      currency: s(fd.get("currency")) || "USD",
      channel_source: inEnum(CHANNEL_SOURCES, s(fd.get("channel_source"))),
      primary_interest: inEnum(MEMBERSHIP_TYPES, s(fd.get("primary_interest"))),
      relationship_manager_id: nullable(s(fd.get("relationship_manager_id"))),
      // "Edit all notes" holds the existing blob; "Add a note" is appended
      // as a dated entry stamped with today's date in the chapter's timezone.
      description: appendNote(
        nullable(s(fd.get("description"))),
        s(fd.get("new_note")),
        new Intl.DateTimeFormat("en-CA", { timeZone: CHAPTER_TIME_ZONE }).format(new Date()),
      ),
      ql_founder_controlling_owner: triState(s(fd.get("ql_founder_controlling_owner"))),
      ql_revenue_verified: triState(s(fd.get("ql_revenue_verified"))),
      ql_financial_commitment: triState(s(fd.get("ql_financial_commitment"))),
      ql_time_commitment: triState(s(fd.get("ql_time_commitment"))),
      closed_lost_description: closedLostDesc,
      closed_lost_reason: nullable(s(fd.get("closed_lost_reason"))),
      closed_won_reason: nullable(s(fd.get("closed_won_reason"))),
      disqualification_reason: inEnum(
        DISQUALIFICATION_REASONS,
        s(fd.get("disqualification_reason")),
      ),
    },
  };
}

// Resolves the linked person + company from the form, creating new
// rows when the "new" toggle is set. At least one must resolve.
async function resolveLinks(
  fd: FormData,
): Promise<
  | { ok: true; personId: string | null; companyId: string | null }
  | { ok: false; error: string }
> {
  let personId: string | null = null;
  let companyId: string | null = null;

  if (s(fd.get("person_mode")) === "new") {
    const email = s(fd.get("new_person_email"));
    if (!email) return { ok: false, error: "New contact needs an email" };
    const person = await findOrCreatePerson({
      email,
      first_name: nullable(s(fd.get("new_person_first"))),
      last_name: nullable(s(fd.get("new_person_last"))),
      phone: nullable(s(fd.get("new_person_phone"))),
      city: nullable(s(fd.get("new_person_city"))),
    });
    if (person.kind === "existing") {
      return { ok: false, error: formatExistingPersonError(person.person) };
    }
    personId = person.id;
  } else {
    personId = nullable(s(fd.get("person_id")));
  }

  if (s(fd.get("company_mode")) === "new") {
    const cname = s(fd.get("new_company_name"));
    if (cname) {
      const revRaw = parseAmount(s(fd.get("new_company_revenue")));
      const { id } = await createCompany({
        name: cname,
        industry: nullable(s(fd.get("new_company_industry"))),
        fiscal_year_gross_revenue: revRaw.ok ? revRaw.value : null,
      });
      companyId = id;
    }
  } else {
    companyId = nullable(s(fd.get("company_id")));
  }

  if (!personId && !companyId) {
    return { ok: false, error: "Link a person or a company (at least one)" };
  }
  return { ok: true, personId, companyId };
}

// ============================================================
// Create
// ============================================================
export async function createDeal(formData: FormData): Promise<SaveResult> {
  await requireBoardOrAbove();
  const parsed = parseDealFields(formData);
  if (!parsed.ok) return parsed;
  try {
    const links = await resolveLinks(formData);
    if (!links.ok) return links;
    const f = parsed.fields;
    const { id } = await insertDeal({
      name: f.name,
      pipeline: "Member Acquisition",
      stage: f.stage,
      person_id: links.personId,
      company_id: links.companyId,
      amount: f.amount,
      currency: f.currency,
      channel_source: f.channel_source,
      primary_interest: f.primary_interest,
      relationship_manager_id: f.relationship_manager_id,
      description: f.description,
      ql_founder_controlling_owner: f.ql_founder_controlling_owner,
      ql_revenue_verified: f.ql_revenue_verified,
      ql_financial_commitment: f.ql_financial_commitment,
      ql_time_commitment: f.ql_time_commitment,
    });

    // Stamp derived status/close fields + any close reasons on the new row.
    const { deal_status, close_date } = derive(f.stage);
    if (deal_status !== "open" || f.closed_lost_description || f.closed_won_reason) {
      await updateDealRow(id, {
        deal_status,
        close_date,
        closed_lost_description: f.closed_lost_description,
        closed_lost_reason: f.closed_lost_reason,
        closed_won_reason: f.closed_won_reason,
        disqualification_reason: f.disqualification_reason,
      });
    }

    revalidatePath("/board/prospects");
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? "Failed to create deal" };
  }
}

// ============================================================
// Update (full edit form)
// ============================================================
export async function updateDeal(
  dealId: string,
  formData: FormData,
): Promise<SaveResult> {
  await requireBoardOrAbove();
  const parsed = parseDealFields(formData);
  if (!parsed.ok) return parsed;
  try {
    const f = parsed.fields;
    const { deal_status, close_date } = derive(f.stage);
    await updateDealRow(dealId, {
      name: f.name,
      stage: f.stage,
      deal_status,
      close_date,
      amount: f.amount,
      currency: f.currency,
      channel_source: f.channel_source,
      primary_interest: f.primary_interest,
      relationship_manager_id: f.relationship_manager_id,
      description: f.description,
      ql_founder_controlling_owner: f.ql_founder_controlling_owner,
      ql_revenue_verified: f.ql_revenue_verified,
      ql_financial_commitment: f.ql_financial_commitment,
      ql_time_commitment: f.ql_time_commitment,
      closed_lost_description: f.closed_lost_description,
      closed_lost_reason: f.closed_lost_reason,
      closed_won_reason: f.closed_won_reason,
      disqualification_reason: f.disqualification_reason,
      last_activity_at: new Date().toISOString(),
    });

    // Edited fields are persisted above; the handoff RPC then re-stamps
    // the Closed Won status atomically and spins up the onboarding card
    // + membership. It reads the row after the update, so any edited
    // primary_interest / manager flows through to the new membership.
    if (f.stage === "Closed Won") {
      const handoff = await closeWonAndHandoff(dealId);
      if (!handoff.ok) return handoff;
      revalidatePath("/board/onboarding");
    }

    revalidatePath("/board/prospects");
    revalidatePath(`/board/prospects/${dealId}`);
    return { ok: true, id: dealId };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? "Failed to update deal" };
  }
}

// ============================================================
// Delete
// ============================================================
export async function deleteDeal(dealId: string): Promise<ActionResult> {
  await requireBoardOrAbove();
  try {
    await deleteDealRow(dealId);
    revalidatePath("/board/prospects");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? "Failed to delete deal" };
  }
}

// ============================================================
// Typeahead (called from the form client component)
// ============================================================
export async function findPeople(q: string): Promise<DealPerson[]> {
  await requireBoardOrAbove();
  return searchPeople(q);
}
export async function findCompanies(q: string): Promise<DealCompany[]> {
  await requireBoardOrAbove();
  return searchCompanies(q);
}
