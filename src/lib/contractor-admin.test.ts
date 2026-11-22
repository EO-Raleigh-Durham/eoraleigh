import assert from "node:assert/strict";
import test from "node:test";
import {
  addDays,
  contractorRoleBlock,
  defaultExpiry,
  expiryError,
  parseContractorForm,
} from "./contractor-admin.ts";

const NOW = new Date("2026-11-21T03:00:00Z"); // 10:00 in the chapter's zone (UTC+7)

const RAW = {
  email: "  Alex@Example.com ",
  fullName: " Alex   Morgan ",
  area: "sap_pipeline",
  sponsorPersonId: "sponsor-1",
  access: "edit",
  expiresAt: "2027-02-19",
};

test("default expiry is 90 days from today in the chapter's zone", () => {
  assert.equal(defaultExpiry(NOW), "2027-02-19");
  // 20:00 UTC on 21 Nov is already 22 Nov at UTC+7.
  assert.equal(defaultExpiry(new Date("2026-11-21T20:00:00Z")), "2027-02-20");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("expiry must be a real date, today or later", () => {
  assert.equal(expiryError("2026-11-21", NOW), null);
  assert.match(expiryError("2026-11-20", NOW) ?? "", /past/);
  assert.match(expiryError("2027-02-30", NOW) ?? "", /Pick/);
  assert.match(expiryError("", NOW) ?? "", /Pick/);
});

test("parses a valid form and normalises email and name", () => {
  const r = parseContractorForm(RAW, NOW);
  assert.ok(r.ok);
  assert.deepEqual(r.input, {
    email: "alex@example.com",
    fullName: "Alex Morgan",
    area: "sap_pipeline",
    sponsorPersonId: "sponsor-1",
    canEdit: true,
    expiresAt: "2027-02-19",
  });
  const view = parseContractorForm({ ...RAW, access: "view" }, NOW);
  assert.ok(view.ok && view.input.canEdit === false);
});

test("rejects bad fields", () => {
  for (const bad of [
    { email: "nope" },
    { fullName: " " },
    { area: "members" },
    { sponsorPersonId: "" },
    { access: "delete" },
    { expiresAt: "2020-01-01" },
  ]) {
    assert.equal(parseContractorForm({ ...RAW, ...bad }, NOW).ok, false, JSON.stringify(bad));
  }
});

test("only new accounts, guests and contractors can become contractors", () => {
  assert.equal(contractorRoleBlock(null), null);
  assert.equal(contractorRoleBlock("guest"), null);
  assert.equal(contractorRoleBlock("contractor"), null);
  for (const role of ["member", "board", "super_admin"] as const) {
    assert.ok(contractorRoleBlock(role), role);
  }
});

test("the contractors page is super admin only and outside every grantable area", async () => {
  const { pageTier } = await import("./access-map.ts");
  const { roleAtLeast } = await import("./access.ts");
  const { grantAreaForPath } = await import("./access-grants.ts");
  const path = "/admin/users/contractors";
  assert.equal(pageTier(path), "admin");
  assert.equal(grantAreaForPath(path), null);
  assert.equal(roleAtLeast("board", pageTier(path)), false);
  assert.equal(roleAtLeast("contractor", pageTier(path)), false);
  assert.equal(roleAtLeast("super_admin", pageTier(path)), true);
});
