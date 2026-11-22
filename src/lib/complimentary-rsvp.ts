export const COMPLIMENTARY_POLICY_PREFIX =
  "Complimentary guest. Late cancellation and no-show policy acknowledgement recorded by ";

export function complimentaryPolicyNote(actor: string): string {
  return `${COMPLIMENTARY_POLICY_PREFIX}${actor}.`;
}

export function hasComplimentaryPolicyAudit(notes: string | null): boolean {
  return Boolean(
    notes
      ?.split(/\r?\n/)
      .some((line) => line.startsWith(COMPLIMENTARY_POLICY_PREFIX)),
  );
}

export function preserveComplimentaryPolicyNote(
  existingNotes: string | null,
  editedNotes: string,
): string | null {
  const protectedLine = existingNotes
    ?.split(/\r?\n/)
    .find((line) => line.startsWith(COMPLIMENTARY_POLICY_PREFIX));
  const editableNotes = editedNotes
    .split(/\r?\n/)
    .filter((line) => !line.startsWith(COMPLIMENTARY_POLICY_PREFIX))
    .join("\n")
    .trim();
  return [protectedLine, editableNotes].filter(Boolean).join("\n") || null;
}

type StoreError = { message: string; code?: string };

export type ComplimentaryRegistrationStore = {
  stageRegistration(): Promise<{
    data: { id: string } | null;
    error: StoreError | null;
  }>;
  addAttendee(registrationId: string): Promise<{ error: StoreError | null }>;
  activateRegistration(
    registrationId: string,
  ): Promise<{ updated: boolean; error: StoreError | null }>;
  removeStagedRegistration(
    registrationId: string,
  ): Promise<{ deleted: boolean; error: StoreError | null }>;
};

export type ComplimentaryPersistenceResult =
  | { ok: true; registrationId: string }
  | { ok: false; error: string };

function isDuplicate(error: StoreError | null): boolean {
  return error?.code === "23505" || /duplicate key/i.test(error?.message ?? "");
}

async function cleanupAfterFailure(
  store: ComplimentaryRegistrationStore,
  registrationId: string,
  originalError: string,
): Promise<ComplimentaryPersistenceResult> {
  const cleanup = await store.removeStagedRegistration(registrationId);
  if (cleanup.error || !cleanup.deleted) {
    return {
      ok: false,
      error: `${originalError} Incomplete registration ${registrationId} could not be removed automatically. Remove it from the cancelled roster before retrying.`,
    };
  }
  return { ok: false, error: originalError };
}

export async function persistComplimentaryRegistration(
  store: ComplimentaryRegistrationStore,
): Promise<ComplimentaryPersistenceResult> {
  const staged = await store.stageRegistration();
  if (staged.error || !staged.data) {
    if (isDuplicate(staged.error)) {
      return { ok: false, error: "This person is already registered for this event." };
    }
    return {
      ok: false,
      error: staged.error?.message ?? "Could not add registration",
    };
  }

  const registrationId = staged.data.id;
  const attendee = await store.addAttendee(registrationId);
  if (attendee.error) {
    return cleanupAfterFailure(store, registrationId, attendee.error.message);
  }

  const activation = await store.activateRegistration(registrationId);
  if (activation.error || !activation.updated) {
    return cleanupAfterFailure(
      store,
      registrationId,
      activation.error?.message ?? "Could not confirm complimentary registration",
    );
  }

  return { ok: true, registrationId };
}
