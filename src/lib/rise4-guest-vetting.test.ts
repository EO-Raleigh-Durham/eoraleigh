import assert from "node:assert/strict";
import test from "node:test";
import {
  isRise4RevenueScale,
  isRise4Role,
  roleRequiresCompany,
  roleRequiresRevenueScale,
  RISE4_ROLE_OPTIONS,
  RISE4_REVENUE_SCALE_OPTIONS,
  RISE4_SLP_ROLE,
  usesRise4GuestVetting,
} from "./rise4-guest-vetting.ts";

test("RISE 4 offers the five approved roles", () => {
  assert.deepEqual(RISE4_ROLE_OPTIONS, [
    "Founder / Co-founder / Owner / Shareholder",
    "Key Executive",
    "Strategic Alliance Partner (Sponsor)",
    "Company Staff",
    "EO Visiting Member",
  ]);
  assert.equal(isRise4Role("Unknown"), false);
});

test("the SLP role is no longer offered or accepted", () => {
  assert.equal((RISE4_ROLE_OPTIONS as readonly string[]).includes(RISE4_SLP_ROLE), false);
  assert.equal(isRise4Role(RISE4_SLP_ROLE), false);
});

test("RISE 4 offers the three approved revenue scales", () => {
  assert.deepEqual(RISE4_REVENUE_SCALE_OPTIONS, [
    "Below $2,500",
    "$2,500 to $1 million",
    "Above $1 million",
  ]);
  assert.equal(isRise4RevenueScale("Unknown"), false);
});

test("only founders and key executives require revenue scale", () => {
  assert.equal(roleRequiresRevenueScale("Founder / Co-founder / Owner / Shareholder"), true);
  assert.equal(roleRequiresRevenueScale("Key Executive"), true);
  assert.equal(roleRequiresRevenueScale(RISE4_SLP_ROLE), false);
  assert.equal(roleRequiresRevenueScale("Strategic Alliance Partner (Sponsor)"), false);
  assert.equal(roleRequiresRevenueScale("Company Staff"), false);
});

test("SLP and visiting members do not require a company", () => {
  assert.equal(roleRequiresCompany(RISE4_SLP_ROLE), false);
  assert.equal(roleRequiresCompany("EO Visiting Member"), false);
  assert.equal(roleRequiresCompany("Strategic Alliance Partner (Sponsor)"), true);
  assert.equal(roleRequiresCompany("Company Staff"), true);
  assert.equal(roleRequiresCompany("Founder / Co-founder / Owner / Shareholder"), true);
});

test("role and revenue validators accept approved options only", () => {
  for (const role of RISE4_ROLE_OPTIONS) assert.equal(isRise4Role(role), true);
  for (const scale of RISE4_REVENUE_SCALE_OPTIONS) {
    assert.equal(isRise4RevenueScale(scale), true);
  }
  assert.equal(isRise4Role(""), false);
  assert.equal(isRise4RevenueScale(""), false);
});

test("guest vetting applies to RISE 4", () => {
  for (const slug of [
    "eo-rise-4",
    "eo-rise-4-zero-to-200m",
    "eo-rise-4-building-brands-that-become-lifestyles",
  ]) {
    assert.equal(usesRise4GuestVetting({ slug, title: "Anything" }), true, slug);
  }
  assert.equal(usesRise4GuestVetting({ slug: "x", title: "RISE 4 workshop" }), true);
});

test("guest vetting does not apply to other events", () => {
  // The MyEO dinner guests register with name, email, phone and a dietary note.
  assert.equal(usesRise4GuestVetting({ slug: "myeo-beneath-the-chopsticks", title: "MyEO Beneath the Chopsticks" }), false);
  assert.equal(usesRise4GuestVetting({ slug: "townhall-2026-27", title: "Townhall" }), false);
  assert.equal(usesRise4GuestVetting({ slug: null, title: null }), false);
  assert.equal(usesRise4GuestVetting({}), false);
  // An event with a similar slug is not enough.
  assert.equal(
    usesRise4GuestVetting({ slug: "myeo-beneath-the-chopsticks-2", title: "Dinner" }),
    false,
  );
});
