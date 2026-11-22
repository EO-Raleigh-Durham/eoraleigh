"use server";

import { revalidatePath } from "next/cache";
import { requireBoardOrAbove } from "@/lib/auth";
import {
  findOrCreatePerson,
  formatExistingPersonError,
  searchPeople,
} from "@/lib/deal-people";
import {
  ONBOARDING_STAGES,
  createCompany,
  deleteDeal as deleteDealRow,
  insertDeal,
  searchCompanies,
  updateDeal as updateDealRow,
  type DealCompany,
  type DealPerson,
  type OnboardingStage,
} from "@/lib/deals";

// Server actions for the Onboarding (Onboarding Track) admin. Mirrors
// the prospects actions but slimmer: no qualification, no close
// reasons, and `deal_status` stays "open" the whole way through, since
// "Active Member" is a terminal onboarding stage rather than a won/lost
// outcome.

type SaveResult = { ok: true; id: string } | { ok: false; error: string };
type ActionResult = { ok: true } | { ok: false; error: string };

function s(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}
function nullable(v: string): string | null {
  return v === "" ? null : v;
}

function parseStage(v: string): OnboardingStage | null {
  return (ONBOARDING_STAGES as readonly string[]).includes(v)
    ? (v as OnboardingStage)
    : null;
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
    await updateDealRow(dealId, {
      stage,
      last_activity_at: new Date().toISOString(),
    });
    revalidatePath("/board/onboarding");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? "Failed to move deal" };
  }
}

// ============================================================
// Shared field parsing for create + update
// ============================================================
type DealFields = {
  name: string;
  stage: OnboardingStage;
  relationship_manager_id: string | null;
  description: string | null;
};

function parseDealFields(
  fd: FormData,
): { ok: true; fields: DealFields } | { ok: false; error: string } {
  const name = s(fd.get("name"));
  if (!name) return { ok: false, error: "Deal name is required" };

  const stage = parseStage(s(fd.get("stage")));
  if (!stage) return { ok: false, error: "A valid stage is required" };

  return {
    ok: true,
    fields: {
      name,
      stage,
      relationship_manager_id: nullable(s(fd.get("relationship_manager_id"))),
      description: nullable(s(fd.get("description"))),
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
      const { id } = await createCompany({
        name: cname,
        industry: nullable(s(fd.get("new_company_industry"))),
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
      pipeline: "Onboarding Track",
      stage: f.stage,
      person_id: links.personId,
      company_id: links.companyId,
      relationship_manager_id: f.relationship_manager_id,
      description: f.description,
    });
    revalidatePath("/board/onboarding");
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
    await updateDealRow(dealId, {
      name: f.name,
      stage: f.stage,
      relationship_manager_id: f.relationship_manager_id,
      description: f.description,
      last_activity_at: new Date().toISOString(),
    });
    revalidatePath("/board/onboarding");
    revalidatePath(`/board/onboarding/${dealId}`);
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
    revalidatePath("/board/onboarding");
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
