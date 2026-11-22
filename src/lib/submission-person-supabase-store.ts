import type { SupabaseClient } from "@supabase/supabase-js";

import { postgrestLikeLiteral } from "./postgrest-like.ts";
import {
  lookupSubmissionPerson,
  type SubmissionPersonLookupStore,
  type SubmissionPersonStore,
  type SubmissionPersonStoreResult,
} from "./submission-person.ts";

export type SubmissionPersonSupabaseClient = Pick<SupabaseClient, "from">;

function toSubmissionPersonError(
  error: { message?: string; code?: string | null } | null | undefined,
) {
  return error
    ? { message: error.message ?? "Database operation failed", code: error.code ?? undefined }
    : null;
}

/** Build the identity store over an injected Supabase-compatible client. */
export function createSubmissionPersonStore(
  client: SubmissionPersonSupabaseClient,
): SubmissionPersonStore {
  const lookupStore: SubmissionPersonLookupStore = {
    async findAliasByEmail(email): Promise<SubmissionPersonStoreResult> {
      const { data, error } = await client
        .from("person_emails")
        .select("person_id, is_primary")
        .ilike("email", postgrestLikeLiteral(email))
        .maybeSingle();

      return {
        data: data?.person_id ? { id: data.person_id } : null,
        error: toSubmissionPersonError(error),
        mode: data ? (data.is_primary ? "primary" : "alternate") : null,
      };
    },

    async findPrimaryByEmail(email): Promise<SubmissionPersonStoreResult> {
      const { data, error } = await client
        .from("people")
        .select("id")
        .ilike("email", postgrestLikeLiteral(email))
        .maybeSingle();

      return {
        data: data?.id ? { id: data.id } : null,
        error: toSubmissionPersonError(error),
        mode: data ? "primary" : null,
      };
    },
  };

  return {
    async findByEmail(email) {
      return lookupSubmissionPerson(lookupStore, email);
    },

    async insert(person) {
      const { data, error } = await client
        .from("people")
        .insert(person)
        .select("id")
        .single();

      return {
        data: data?.id ? { id: data.id } : null,
        error: toSubmissionPersonError(error),
      };
    },
  };
}
