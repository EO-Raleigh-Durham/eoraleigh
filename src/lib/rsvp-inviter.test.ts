import assert from "node:assert/strict";
import test from "node:test";
import { CHAPTER_NAME } from "../kernel/config/chapter.ts";
import {
  assignRsvpInviter,
  type InviterAssignmentStore,
  type InviterAssignmentTarget,
  type InviterEligibility,
} from "./rsvp-inviter.ts";

function target(
  overrides: Partial<InviterAssignmentTarget> = {},
): InviterAssignmentTarget {
  return {
    id: "registration-target",
    event_id: "event-1",
    person_id: "person-target",
    status: "registered",
    review_classification: "normal",
    invited_by_person_id: null,
    ...overrides,
  };
}

function eligible(overrides: Partial<InviterEligibility> = {}): InviterEligibility {
  return { person_id: "person-inviter", kind: "member", ...overrides };
}

function store(
  targetRow: InviterAssignmentTarget | null = target(),
  eligibility: InviterEligibility | null = eligible(),
  update: { updated: boolean; error?: string | null } = { updated: true },
): InviterAssignmentStore {
  return {
    async findTarget() {
      return { data: targetRow };
    },
    async findInviterEligibility() {
      return { data: eligibility };
    },
    async assignInviter() {
      return update;
    },
  };
}

test("requires complete attribution identifiers", async () => {
  assert.deepEqual(await assignRsvpInviter(store(), "", "event-1", "person-inviter"), {
    ok: false,
    error: "Registration and inviter are required",
  });
});

test("rejects missing targets, non-members, and lookup failures", async () => {
  assert.deepEqual(
    await assignRsvpInviter(store(null), "registration-target", "event-1", "person-inviter"),
    { ok: false, error: "Registration not found for this event" },
  );
  assert.deepEqual(
    await assignRsvpInviter(store(target(), null), "registration-target", "event-1", "person-inviter"),
    { ok: false, error: `Inviter must be a current ${CHAPTER_NAME} member or chapter staff` },
  );

  const failedLookup = store();
  failedLookup.findInviterEligibility = async () => ({ data: null, error: "Database unavailable" });
  assert.deepEqual(
    await assignRsvpInviter(failedLookup, "registration-target", "event-1", "person-inviter"),
    { ok: false, error: "Unable to load registration data. Try again" },
  );
});

test("rejects self, unchanged, and inactive target attribution", async () => {
  assert.deepEqual(
    await assignRsvpInviter(store(), "registration-target", "event-1", "person-target"),
    { ok: false, error: "A person cannot invite themselves" },
  );
  assert.deepEqual(
    await assignRsvpInviter(
      store(target({ invited_by_person_id: "person-inviter" })),
      "registration-target",
      "event-1",
      "person-inviter",
    ),
    { ok: false, error: "This inviter is already selected" },
  );
  for (const targetRow of [
    target({ status: "cancelled" }),
    target({ status: "no_show" }),
    target({ review_classification: "spam" }),
  ]) {
    assert.deepEqual(
      await assignRsvpInviter(store(targetRow), "registration-target", "event-1", "person-inviter"),
      { ok: false, error: "Only active, non-spam registrations can be attributed" },
    );
  }
});

test("reports database failures and conditional update conflicts", async () => {
  assert.deepEqual(
    await assignRsvpInviter(
      store(undefined, undefined, { updated: false, error: "Database unavailable" }),
      "registration-target",
      "event-1",
      "person-inviter",
    ),
    { ok: false, error: "Database unavailable" },
  );
  assert.deepEqual(
    await assignRsvpInviter(
      store(undefined, undefined, { updated: false }),
      "registration-target",
      "event-1",
      "person-inviter",
    ),
    { ok: false, error: "Inviter attribution changed before this update. Refresh and try again" },
  );
});

test("persists member attribution with the current person-level concurrency guard", async () => {
  for (const currentInviter of [null, "person-previous"]) {
    const calls: Array<[string, string, string, string | null]> = [];
    const assignmentStore = store(target({ invited_by_person_id: currentInviter }));
    assignmentStore.assignInviter = async (...args) => {
      calls.push(args);
      return { updated: true };
    };

    assert.deepEqual(
      await assignRsvpInviter(assignmentStore, "registration-target", "event-1", "person-inviter"),
      { ok: true },
    );
    assert.deepEqual(calls, [["registration-target", "event-1", "person-inviter", currentInviter]]);
  }
});

test("accepts chapter staff as an eligible inviter", async () => {
  assert.deepEqual(
    await assignRsvpInviter(
      store(target(), eligible({ kind: "staff" })),
      "registration-target",
      "event-1",
      "person-inviter",
    ),
    { ok: true },
  );
});
