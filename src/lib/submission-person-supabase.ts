import "server-only";

import { supabase } from "./supabase";
import {
  resolveSubmissionPerson,
  type SubmissionPersonInput,
  type SubmissionPersonStoreResult,
} from "./submission-person";
import { createSubmissionPersonStore } from "./submission-person-supabase-store";

export { createSubmissionPersonStore } from "./submission-person-supabase-store";

export async function findSubmissionPersonByEmail(
  email: string,
): Promise<SubmissionPersonStoreResult> {
  return createSubmissionPersonStore(supabase).findByEmail(email);
}

export async function resolveSubmissionPersonWithSupabase(
  input: SubmissionPersonInput,
): Promise<Awaited<ReturnType<typeof resolveSubmissionPerson>>> {
  return resolveSubmissionPerson(createSubmissionPersonStore(supabase), input);
}
