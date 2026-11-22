import { CHAPTER_NAME } from "../kernel/config/chapter.ts";
import type { RegistrationStatus } from "./events.ts";
import type { RegistrationReviewClassification } from "./event-registration-review.ts";
import { isActiveRosterRegistration } from "./rsvp-roster.ts";

export type InviterAssignmentResult =
  | { ok: true }
  | { ok: false; error: string };

export type InviterAssignmentTarget = {
  id: string;
  event_id: string;
  person_id: string;
  status: RegistrationStatus;
  review_classification: RegistrationReviewClassification;
  invited_by_person_id?: string | null;
};

export type InviterEligibility = {
  person_id: string;
  kind: "member" | "staff";
};

type TargetLookupResult = {
  data: InviterAssignmentTarget | null;
  error?: string | null;
};

type EligibilityLookupResult = {
  data: InviterEligibility | null;
  error?: string | null;
};

type UpdateResult = {
  updated: boolean;
  error?: string | null;
};

export type InviterAssignmentStore = {
  findTarget: (rsvpId: string, eventId: string) => Promise<TargetLookupResult>;
  findInviterEligibility: (personId: string) => Promise<EligibilityLookupResult>;
  assignInviter: (
    rsvpId: string,
    eventId: string,
    inviterPersonId: string,
    currentInviterPersonId: string | null,
  ) => Promise<UpdateResult>;
};

export async function assignRsvpInviter(
  store: InviterAssignmentStore,
  rsvpId: string,
  eventId: string,
  inviterPersonId: string,
): Promise<InviterAssignmentResult> {
  if (!rsvpId || !eventId || !inviterPersonId) {
    return { ok: false, error: "Registration and inviter are required" };
  }

  const [targetResult, inviterResult] = await Promise.all([
    store.findTarget(rsvpId, eventId),
    store.findInviterEligibility(inviterPersonId),
  ]);
  if (targetResult.error || inviterResult.error) {
    return { ok: false, error: "Unable to load registration data. Try again" };
  }
  if (!targetResult.data) {
    return { ok: false, error: "Registration not found for this event" };
  }
  if (!inviterResult.data) {
    return { ok: false, error: `Inviter must be a current ${CHAPTER_NAME} member or chapter staff` };
  }

  const target = targetResult.data;
  if (target.person_id === inviterPersonId) {
    return { ok: false, error: "A person cannot invite themselves" };
  }
  if (target.invited_by_person_id === inviterPersonId) {
    return { ok: false, error: "This inviter is already selected" };
  }
  if (!isActiveRosterRegistration(target)) {
    return { ok: false, error: "Only active, non-spam registrations can be attributed" };
  }

  const updateResult = await store.assignInviter(
    rsvpId,
    eventId,
    inviterPersonId,
    target.invited_by_person_id ?? null,
  );
  if (updateResult.error) return { ok: false, error: updateResult.error };
  if (!updateResult.updated) {
    return {
      ok: false,
      error: "Inviter attribution changed before this update. Refresh and try again",
    };
  }

  return { ok: true };
}
