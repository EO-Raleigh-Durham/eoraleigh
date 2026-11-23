import assert from "node:assert/strict";
import test from "node:test";

import { duesUsd, fyStartFromDash, grossUpForCard, pickOpenDuesYear } from "./dues.ts";

test("picks the newest open year that has a dues amount", () => {
  const rows = [
    { fiscal_year_start: 2026, dues_open: true, dues_per_member_usd: "2200", secondary_dues_usd: 1500 },
    { fiscal_year_start: 2027, dues_open: true, dues_per_member_usd: 2300, secondary_dues_usd: null },
    { fiscal_year_start: 2028, dues_open: true, dues_per_member_usd: null, secondary_dues_usd: null },
    { fiscal_year_start: 2029, dues_open: false, dues_per_member_usd: 9999, secondary_dues_usd: null },
  ];
  assert.deepEqual(pickOpenDuesYear(rows), { fyStart: 2027, primaryCents: 230000, secondaryCents: null });
  assert.equal(pickOpenDuesYear([]), null);
});

test("card gross-up matches what members were charged before", () => {
  assert.deepEqual(grossUpForCard(220000), { grossCents: 228100, feeCents: 8100 });
  assert.deepEqual(grossUpForCard(150000), { grossCents: 155500, feeCents: 5500 });
});

test("formats and parses dues years", () => {
  assert.equal(duesUsd(220000), "$2,200");
  assert.equal(fyStartFromDash("2026-2027"), 2026);
  assert.equal(fyStartFromDash("2026-2028"), null);
  assert.equal(fyStartFromDash(undefined), null);
});
