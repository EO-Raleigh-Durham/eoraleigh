import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "./supabase";
import { createSubmissionPersonStore } from "./submission-person-supabase";
import {
  resolveSubmissionPerson,
  type SubmissionPersonLookupMode,
} from "./submission-person";
import type { DealPerson, NewPersonInput } from "./deals";

// Person search and creation are used by Server Actions. Keep this module out
// of the client-imported deals module so alias lookups and the service client
// remain on the server side of the dependency graph.

type DealPeopleClient = Pick<SupabaseClient, "from">;

const DEAL_PERSON_SELECT =
  "id, first_name, last_name, email, phone, city, channel_source";
const EXISTING_PERSON_SELECT = "id, name, first_name, last_name, email";

export type ExistingDealPerson = {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

export type FindOrCreatePersonResult =
  | {
      kind: "created";
      mode: "created";
      id: string;
    }
  | {
      kind: "existing";
      mode: SubmissionPersonLookupMode;
      id: string;
      person: ExistingDealPerson;
    };

function errorClass(
  error: { code?: string | null; status?: number | null } | null | undefined,
): string {
  if (error?.code) return error.code;
  if (error?.status) return `status_${error.status}`;
  return "unknown";
}

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function canonicalPersonForAlias(
  client: DealPeopleClient,
  email: string,
): Promise<DealPerson | null> {
  const lookup = await createSubmissionPersonStore(client).findByEmail(email);
  if (lookup.error) {
    // Alias data is a board-only enhancement. Preserve ordinary primary/name
    // search if the alias table is unavailable or the read fails.
    console.warn("searchPeople identity lookup failed", {
      errorClass: errorClass(lookup.error),
    });
    return null;
  }

  const personId = lookup.data?.id;
  if (!personId) return null;

  const { data: person, error: personError } = await client
    .from("people")
    .select(DEAL_PERSON_SELECT)
    .eq("id", personId)
    .maybeSingle();
  if (personError) {
    console.warn("searchPeople canonical lookup failed", {
      personId,
      errorClass: errorClass(personError),
    });
    return null;
  }
  return (person as DealPerson | null) ?? null;
}

async function searchPeopleUsingClient(
  client: DealPeopleClient,
  q: string,
  limit = 10,
): Promise<DealPerson[]> {
  const term = q.trim();
  const boundedLimit = Math.max(0, Math.floor(limit));
  if (!term || boundedLimit === 0) return [];

  // An exact normalized alias is prepended to the ordinary result set. This
  // guarantees that a matching canonical person is returned even when the
  // ordinary query already fills the requested limit.
  const normalizedTerm = normalizedEmail(term);
  const aliasPromise = normalizedTerm.includes("@")
    ? canonicalPersonForAlias(client, normalizedTerm)
    : Promise.resolve(null);

  const pattern = `%${term}%`;
  const [exactAliasPerson, { data, error }] = await Promise.all([
    aliasPromise,
    client
      .from("people")
      .select(DEAL_PERSON_SELECT)
      .or(
        `first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},name.ilike.${pattern}`,
      )
      .limit(boundedLimit),
  ]);
  if (error) {
    console.warn("searchPeople failed", { errorClass: errorClass(error) });
    return exactAliasPerson ? [exactAliasPerson].slice(0, boundedLimit) : [];
  }

  // The alias query returns a canonical person row, never the alias row. A
  // map keeps that person from appearing twice when its primary email/name
  // also matches the ordinary query.
  const byId = new Map<string, DealPerson>();
  if (exactAliasPerson) byId.set(exactAliasPerson.id, exactAliasPerson);
  for (const row of (data ?? []) as unknown as DealPerson[]) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return Array.from(byId.values()).slice(0, boundedLimit);
}

/** Search canonical people by ordinary fields plus an exact email alias. */
export async function searchPeople(
  q: string,
  limit = 10,
): Promise<DealPerson[]> {
  return searchPeopleUsingClient(supabase, q, limit);
}

async function loadExistingPerson(
  client: DealPeopleClient,
  personId: string,
): Promise<ExistingDealPerson> {
  const { data, error } = await client
    .from("people")
    .select(EXISTING_PERSON_SELECT)
    .eq("id", personId)
    .maybeSingle();
  if (error || !data) {
    console.warn("findOrCreatePerson canonical lookup failed", {
      personId,
      errorClass: errorClass(error),
    });
    throw new Error("Could not resolve existing person");
  }
  return data as ExistingDealPerson;
}

function creationInput(input: NewPersonInput): NewPersonInput {
  const firstName = input.first_name?.trim() || null;
  const lastName = input.last_name?.trim() || null;
  const name =
    input.name?.trim() ||
    [firstName, lastName].filter((part): part is string => Boolean(part)).join(" ") ||
    normalizedEmail(input.email);

  return {
    email: input.email,
    name,
    first_name: firstName,
    last_name: lastName,
    phone: input.phone?.trim() || null,
    city: input.city?.trim() || null,
  };
}

async function findOrCreatePersonUsingClient(
  client: DealPeopleClient,
  input: NewPersonInput,
): Promise<FindOrCreatePersonResult> {
  const email = normalizedEmail(input.email);
  if (!email) throw new Error("Email is required to create a person");

  // This is the shared alias-first resolver. It inserts only after both the
  // alias table and legacy people.email lookups report no owner, and recovers
  // only the create-after-no-match 23505 race inside that resolver.
  const result = await resolveSubmissionPerson(
    createSubmissionPersonStore(client),
    creationInput({ ...input, email }),
  );
  if (result.error || !result.data || !result.mode) {
    throw new Error("Could not save person");
  }

  if (result.mode === "created") {
    return {
      kind: "created",
      mode: "created",
      id: result.data.id,
    };
  }

  const person = await loadExistingPerson(client, result.data.id);
  return {
    kind: "existing",
    mode: result.mode,
    id: person.id,
    person,
  };
}

/** Resolve a board contact through the shared alias-first identity boundary. */
export async function findOrCreatePerson(
  input: NewPersonInput,
): Promise<FindOrCreatePersonResult> {
  return findOrCreatePersonUsingClient(supabase, input);
}

export function formatExistingPersonError(person: ExistingDealPerson): string {
  const name = [person.first_name, person.last_name]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .trim() || person.name?.trim() || "the existing contact";
  return `This email belongs to ${name} (primary email: ${person.email}). Search for and select that existing contact.`;
}
