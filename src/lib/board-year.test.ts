import assert from "node:assert/strict";
import test from "node:test";
import { mergeSeatsByPerson, pickBoardYear } from "./board-year.ts";

test("shows the sitting board, not next year's elect board", () => {
  assert.equal(pickBoardYear([2025, 2026, 2027], 2026), 2026);
});

test("falls back to the latest past term when this year has no seats yet", () => {
  assert.equal(pickBoardYear([2024, 2025, 2027], 2026), 2025);
});

test("uses the incoming term when it is the only one on record", () => {
  assert.equal(pickBoardYear([2027], 2026), 2027);
});

test("returns null with no appointments", () => {
  assert.equal(pickBoardYear([], 2026), null);
});

test("a person in two seats gets one card with both titles, in board order", () => {
  const merged = mergeSeatsByPerson([
    { personId: "g", roleKey: "governance", title: "Governance Chair", sortOrder: 7 },
    { personId: "j", roleKey: "learning", title: "Learning Chair", sortOrder: 10 },
    { personId: "g", roleKey: "finance", title: "Finance Chair", sortOrder: 6 },
    { personId: "j", roleKey: "president-elect", title: "President-Elect", sortOrder: 2 },
    { personId: "m", roleKey: "president", title: "President", sortOrder: 1 },
  ]);
  assert.deepEqual(
    merged.map((m) => m.title),
    ["President", "President-Elect, Learning Chair", "Finance Chair, Governance Chair"],
  );
});
