import "server-only";

import {
  resolveSubmissionPersonWithSupabase,
} from "./submission-person-supabase";
import type {
  SubmissionPersonInput,
  SubmissionPersonMatchMode,
} from "./submission-person";

// Server-only public-form helper. It resolves aliases before creating a
// person, and never applies submitted contact fields to an existing row.

export type PublicPersonInput = SubmissionPersonInput;

export type ResolvedPublicPerson = {
  id: string;
  email: string;
  mode: SubmissionPersonMatchMode;
};

export async function resolvePublicPerson(
  input: PublicPersonInput,
): Promise<ResolvedPublicPerson> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("resolvePublicPerson: email is required");

  const result = await resolveSubmissionPersonWithSupabase({
    ...input,
    email,
  });
  if (result.error || !result.data) {
    // Keep database details in server-side diagnostics only. Public routes
    // must return the same generic failure for all identity match modes.
    throw new Error("Could not save person");
  }

  return { id: result.data.id, email, mode: result.mode ?? "primary" };
}
