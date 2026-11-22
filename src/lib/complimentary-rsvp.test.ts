import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPLIMENTARY_POLICY_PREFIX,
  complimentaryPolicyNote,
  hasComplimentaryPolicyAudit,
  persistComplimentaryRegistration,
  preserveComplimentaryPolicyNote,
  type ComplimentaryRegistrationStore,
} from "./complimentary-rsvp.ts";

function store(overrides: Partial<ComplimentaryRegistrationStore> = {}) {
  const calls: string[] = [];
  const value: ComplimentaryRegistrationStore = {
    async stageRegistration() {
      calls.push("stage");
      return { data: { id: "registration-1" }, error: null };
    },
    async addAttendee(registrationId) {
      calls.push(`attendee:${registrationId}`);
      return { error: null };
    },
    async activateRegistration(registrationId) {
      calls.push(`activate:${registrationId}`);
      return { updated: true, error: null };
    },
    async removeStagedRegistration(registrationId) {
      calls.push(`remove:${registrationId}`);
      return { deleted: true, error: null };
    },
    ...overrides,
  };
  return { value, calls };
}

test("records and preserves the complimentary no-show policy audit line", () => {
  const policy = complimentaryPolicyNote("Harley Trung");
  assert.equal(
    policy,
    `${COMPLIMENTARY_POLICY_PREFIX}Harley Trung.`,
  );
  assert.equal(hasComplimentaryPolicyAudit(`Board note\n${policy}`), true);
  assert.equal(hasComplimentaryPolicyAudit("Board note"), false);
  assert.equal(
    preserveComplimentaryPolicyNote(`${policy}\nOriginal note`, "Updated note"),
    `${policy}\nUpdated note`,
  );
  assert.equal(
    preserveComplimentaryPolicyNote(
      policy,
      `${COMPLIMENTARY_POLICY_PREFIX}Someone else.\nBoard note`,
    ),
    `${policy}\nBoard note`,
  );
  assert.equal(preserveComplimentaryPolicyNote(null, "  Board note  "), "Board note");
});

test("activates a complimentary registration only after its attendee is saved", async () => {
  const registrationStore = store();
  assert.deepEqual(
    await persistComplimentaryRegistration(registrationStore.value),
    { ok: true, registrationId: "registration-1" },
  );
  assert.deepEqual(registrationStore.calls, [
    "stage",
    "attendee:registration-1",
    "activate:registration-1",
  ]);
});

test("returns a friendly duplicate error without writing an attendee", async () => {
  const registrationStore = store({
    async stageRegistration() {
      return {
        data: null,
        error: { message: "duplicate key value violates unique constraint", code: "23505" },
      };
    },
  });
  assert.deepEqual(
    await persistComplimentaryRegistration(registrationStore.value),
    { ok: false, error: "This person is already registered for this event." },
  );
  assert.deepEqual(registrationStore.calls, []);
});

test("removes the inactive registration when attendee persistence fails", async () => {
  const registrationStore = store({
    async addAttendee() {
      return { error: { message: "Attendee insert failed" } };
    },
  });
  assert.deepEqual(
    await persistComplimentaryRegistration(registrationStore.value),
    { ok: false, error: "Attendee insert failed" },
  );
  assert.deepEqual(registrationStore.calls, ["stage", "remove:registration-1"]);
});

test("surfaces the cancelled registration id when automatic cleanup fails", async () => {
  const registrationStore = store({
    async addAttendee() {
      return { error: { message: "Attendee insert failed" } };
    },
    async removeStagedRegistration() {
      return { deleted: false, error: { message: "Cleanup failed" } };
    },
  });
  const result = await persistComplimentaryRegistration(registrationStore.value);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /Incomplete registration registration-1/);
    assert.match(result.error, /cancelled roster before retrying/);
  }
});

test("cleans up when final activation fails", async () => {
  const registrationStore = store({
    async activateRegistration() {
      return { updated: false, error: { message: "Activation failed" } };
    },
  });
  assert.deepEqual(
    await persistComplimentaryRegistration(registrationStore.value),
    { ok: false, error: "Activation failed" },
  );
  assert.deepEqual(registrationStore.calls, [
    "stage",
    "attendee:registration-1",
    "remove:registration-1",
  ]);
});
