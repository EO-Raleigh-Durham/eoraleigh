import assert from "node:assert/strict";
import test from "node:test";

import { validateInterest } from "./leadership-interest.ts";

const base = { name: "Test Person", email: "test@example.com" };

test("membership answer is required", () => {
  const r = validateInterest({ ...base });
  assert.equal(r.ok, false);
  const bad = validateInterest({ ...base, membership: "maybe" });
  assert.equal(bad.ok, false);
});

test("members need only name, email and the membership answer", () => {
  const r = validateInterest({ ...base, membership: "member", company: "Ignored Co" });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.details.company, null);
    assert.equal(r.details.role_in_company, null);
    assert.equal(r.details.revenue_scale, null);
  }
});

test("non-members must choose a role", () => {
  const r = validateInterest({ ...base, membership: "not_yet", company: "Acme" });
  assert.equal(r.ok, false);
});

test("a founder must give revenue scale and company", () => {
  const role = "Founder / Co-founder / Owner / Shareholder";
  assert.equal(validateInterest({ ...base, membership: "not_yet", role_in_company: role, company: "Acme" }).ok, false);
  assert.equal(validateInterest({ ...base, membership: "not_yet", role_in_company: role, revenue_scale: "Above $1 million" }).ok, false);
  const ok = validateInterest({
    ...base,
    membership: "not_yet",
    role_in_company: role,
    revenue_scale: "Above $1 million",
    company: "Acme",
  });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.details.revenue_scale, "Above $1 million");
});

test("company staff need a company but no revenue scale", () => {
  const r = validateInterest({
    ...base,
    membership: "not_yet",
    role_in_company: "Company Staff",
    company: "Acme",
    revenue_scale: "Above $1 million",
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.details.revenue_scale, null);
  assert.equal(validateInterest({ ...base, membership: "not_yet", role_in_company: "Company Staff" }).ok, false);
});

test("rejects an unknown role and a bad email", () => {
  assert.equal(validateInterest({ ...base, membership: "not_yet", role_in_company: "CEO of everything", company: "A" }).ok, false);
  assert.equal(validateInterest({ name: "A", email: "nope", membership: "member" }).ok, false);
});
