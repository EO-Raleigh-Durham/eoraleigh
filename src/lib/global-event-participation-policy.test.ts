import assert from "node:assert/strict";
import test from "node:test";

import {
  canAssignGlobalParticipationStatus,
  countGlobalEventParticipation,
  isGlobalParticipationSchemaUnavailableCode,
  reconcileGlobalParticipantAdds,
} from "./global-event-participation-policy.ts";

test("bulk add is retry-safe and never downgrades active Attended rows", () => {
  const result = reconcileGlobalParticipantAdds(
    ["member-a", "member-b", "member-c", "member-c"],
    [
      { personId: "member-a", status: "attended" },
      { personId: "member-b", status: "going" },
    ],
    "going",
  );

  assert.deepEqual(result.toAdd, ["member-c"]);
  assert.deepEqual(result.alreadyTracked, [
    { personId: "member-a", status: "attended" },
    { personId: "member-b", status: "going" },
  ]);
});

test("bulk Attended add does not silently convert an existing Going row", () => {
  const result = reconcileGlobalParticipantAdds(
    ["member-a", "member-b"],
    [{ personId: "member-a", status: "going" }],
    "attended",
  );

  assert.deepEqual(result.toAdd, ["member-b"]);
  assert.deepEqual(result.alreadyTracked, [
    { personId: "member-a", status: "going" },
  ]);
});

test("Going and Attended remain separate counts without time-based conversion", () => {
  const rows = [
    { status: "going" as const },
    { status: "going" as const },
    { status: "attended" as const },
  ];

  assert.deepEqual(countGlobalEventParticipation(rows), {
    going: 2,
    attended: 1,
    total: 3,
  });
  assert.deepEqual(countGlobalEventParticipation(rows, new Date("2099-01-01")), {
    going: 2,
    attended: 1,
    total: 3,
  });
});

test("Attended is rejected before the event starts", () => {
  const startsAt = "2027-02-01T02:00:00.000Z";
  const before = new Date("2027-02-01T01:59:59.000Z");
  const after = new Date("2027-02-01T02:00:00.000Z");

  assert.equal(canAssignGlobalParticipationStatus("attended", startsAt, before), false);
  assert.equal(canAssignGlobalParticipationStatus("attended", startsAt, after), true);
  assert.equal(canAssignGlobalParticipationStatus("going", startsAt, before), true);
});

test("schema availability is mapped by database code, never error prose", () => {
  assert.equal(isGlobalParticipationSchemaUnavailableCode("42P01"), true);
  assert.equal(isGlobalParticipationSchemaUnavailableCode("PGRST205"), true);
  assert.equal(
    isGlobalParticipationSchemaUnavailableCode(
      "relation global_event_participation does not exist",
    ),
    false,
  );
  assert.equal(isGlobalParticipationSchemaUnavailableCode("42501"), false);
});
