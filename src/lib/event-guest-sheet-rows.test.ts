import assert from "node:assert/strict";
import test from "node:test";
import { companyRole, safeCell, toPayloadRows } from "./event-guest-sheet-rows.ts";

test("toPayloadRows drops blank and repeated emails and trims", () => {
  const rows = toPayloadRows([
    { name: " A ", companyRole: "", email: "a@x.com", memberType: "Guest" },
    { name: "A2", companyRole: "", email: "A@x.com", memberType: "" },
    { name: "B", companyRole: "", email: " ", memberType: "" },
  ]);
  assert.deepEqual(rows, [{ name: "A", companyRole: "", email: "a@x.com", memberType: "Guest" }]);
});

test("safeCell neutralises formulas and companyRole joins", () => {
  assert.equal(safeCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(safeCell(" Tam "), "Tam");
  assert.equal(companyRole("Acme", "CEO"), "Acme - CEO");
  assert.equal(companyRole(null, "CEO"), "CEO");
});
