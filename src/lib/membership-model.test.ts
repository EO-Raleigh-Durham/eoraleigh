import assert from "node:assert/strict";
import test from "node:test";

import { grantsMemberAccess, isMembershipStatus, isMembershipType, isoDate, statusChange } from "./membership-model.ts";

test("only active and on leave keep member access", () => {
  assert.equal(grantsMemberAccess("active"), true);
  assert.equal(grantsMemberAccess("on_leave"), true);
  for (const s of ["elumni", "terminated", "transferred", "nonsense"]) assert.equal(grantsMemberAccess(s), false);
});

test("validates statuses, types and dates", () => {
  assert.equal(isMembershipStatus("terminated"), true);
  assert.equal(isMembershipStatus("lapsed"), false);
  assert.equal(isMembershipType("Primary Membership"), true);
  assert.equal(isMembershipType("member"), false);
  assert.equal(isoDate("2027-06-30"), "2027-06-30");
  assert.equal(isoDate("30/06/2027"), null);
  assert.equal(isoDate(""), null);
});

test("ending a membership records an end date, reactivating clears it", () => {
  assert.deepEqual(statusChange("terminated", null, "2026-11-24"), { status: "terminated", end_date: "2026-11-24" });
  assert.deepEqual(statusChange("elumni", "2027-06-30", "2026-11-24"), { status: "elumni", end_date: "2027-06-30" });
  assert.deepEqual(statusChange("active", "2027-06-30", "2026-11-24"), { status: "active", end_date: null });
});
