export type SubmissionPerson = { id: string };

// people.source_site written on rows this site creates. A stored value: reports
// and filters match on it, so it is not derived from the chapter config.
export const SUBMISSION_SOURCE_SITE = "website";

export type SubmissionPersonMatchMode = "primary" | "alternate" | "created";
export type SubmissionPersonLookupMode = Exclude<SubmissionPersonMatchMode, "created">;

export type SubmissionPersonError = {
  message: string;
  code?: string;
};

export type SubmissionPersonStoreResult = {
  data: SubmissionPerson | null;
  error?: SubmissionPersonError | null;
  // Lookup stores may provide the exact mode for an alias row. The pure
  // lookup function supplies the safe fallback for older stores that only
  // return a person id.
  mode?: SubmissionPersonLookupMode | null;
};

export type SubmissionPersonStore = {
  findByEmail: (email: string) => Promise<SubmissionPersonStoreResult>;
  insert: (patch: Record<string, unknown>) => Promise<SubmissionPersonStoreResult>;
};

export type SubmissionPersonLookupStore = {
  findAliasByEmail: (email: string) => Promise<SubmissionPersonStoreResult>;
  findPrimaryByEmail: (email: string) => Promise<SubmissionPersonStoreResult>;
};

export type SubmissionPersonInput = {
  email: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  city?: string | null;
};

export type SubmissionPersonResult = {
  data: SubmissionPerson | null;
  error: SubmissionPersonError | null;
  mode: SubmissionPersonMatchMode | null;
};

export async function lookupSubmissionPerson(
  store: SubmissionPersonLookupStore,
  email: string,
): Promise<SubmissionPersonStoreResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const alias = await store.findAliasByEmail(normalizedEmail);
  if (alias.error) return { ...alias, mode: null };
  if (alias.data) {
    return { ...alias, mode: alias.mode ?? "alternate", error: null };
  }

  const primary = await store.findPrimaryByEmail(normalizedEmail);
  return {
    ...primary,
    mode: primary.data ? primary.mode ?? "primary" : null,
    error: primary.error ?? null,
  };
}

export async function resolveSubmissionPerson(
  store: SubmissionPersonStore,
  input: SubmissionPersonInput,
): Promise<SubmissionPersonResult> {
  const email = input.email.trim().toLowerCase();
  const existing = await store.findByEmail(email);
  if (existing.error) {
    return { data: null, error: existing.error, mode: null };
  }
  if (existing.data) {
    return {
      data: existing.data,
      error: null,
      mode: existing.mode ?? "primary",
    };
  }

  const patch: Record<string, unknown> = {
    email,
    source_site: SUBMISSION_SOURCE_SITE,
  };
  const fields = [
    ["name", input.name],
    ["first_name", input.first_name],
    ["last_name", input.last_name],
    ["phone", input.phone],
    ["city", input.city],
  ] as const;
  for (const [field, value] of fields) {
    const trimmed = value?.trim();
    if (trimmed) patch[field] = trimmed;
  }

  const inserted = await store.insert(patch);
  if (inserted.data) {
    return { data: inserted.data, error: null, mode: "created" };
  }
  if (inserted.error?.code !== "23505") {
    return {
      data: null,
      error: inserted.error ?? { message: "Could not save person" },
      mode: null,
    };
  }

  // A concurrent request may have inserted the same normalized email after
  // our lookup. Reuse that row without applying this submission's identity.
  const concurrent = await store.findByEmail(email);
  return {
    data: concurrent.data,
    error: concurrent.error ?? (concurrent.data ? null : inserted.error),
    mode: concurrent.data ? concurrent.mode ?? "primary" : null,
  };
}
