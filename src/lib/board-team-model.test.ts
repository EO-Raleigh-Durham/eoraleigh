import assert from "node:assert/strict";
import test from "node:test";

import {
  boardYearLabel,
  groupByRole,
  normaliseEmail,
  rolesWithoutChair,
  switcherYears,
  yearStatus,
  type TeamAppointment,
  type TeamRole,
} from "./board-team-model.ts";

const roles: TeamRole[] = [
  { id: "r2", key: "membership", name: "Membership", sortOrder: 2 },
  { id: "r1", key: "president", name: "President", sortOrder: 1 },
];
const person = (id: string, name: string) => ({ id, name, email: `${id}@example.org` });
const appts: TeamAppointment[] = [
  { id: "a1", roleId: "r1", position: "Chair", person: person("p1", "Ann") },
  { id: "a2", roleId: "r1", position: "Co-Chair", person: person("p3", "Zed") },
  { id: "a3", roleId: "r1", position: "Co-Chair", person: person("p2", "Bea") },
  { id: "a4", roleId: "r2", position: "Committee Member", person: person("p4", "Cal") },
];

test("groups appointments under roles in board order", () => {
  const rows = groupByRole(roles, appts);
  assert.deepEqual(rows.map((r) => r.role.key), ["president", "membership"]);
  assert.equal(rows[0].chair?.person.name, "Ann");
  assert.deepEqual(rows[0].coChairs.map((a) => a.person.name), ["Bea", "Zed"]);
  assert.equal(rows[1].chair, null);
  assert.deepEqual(rows[1].others.map((a) => a.id), ["a4"]);
});

test("lists roles that still need a chair", () => {
  assert.deepEqual(rolesWithoutChair(groupByRole(roles, appts)), ["Membership"]);
});

test("year status by fiscal year", () => {
  assert.equal(yearStatus(2026, 2026), "current");
  assert.equal(yearStatus(2027, 2026), "next");
  assert.equal(yearStatus(2028, 2026), "future");
  assert.equal(yearStatus(2025, 2026), "past");
});

test("labels and switcher years", () => {
  assert.equal(boardYearLabel(2026), "2026/27");
  assert.deepEqual(switcherYears([2024, 2026], 2026), [2027, 2026, 2024]);
});

test("normalises emails", () => {
  assert.equal(normaliseEmail("  Ann@Example.ORG "), "ann@example.org");
  assert.equal(normaliseEmail("not an email"), null);
});
