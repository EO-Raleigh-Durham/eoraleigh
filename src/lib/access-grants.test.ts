import assert from "node:assert/strict";
import test from "node:test";
import { roleAtLeast } from "./access.ts";
import { pageTier, roleHomePath } from "./access-map.ts";
import { readFileSync } from "node:fs";
import {
  areaAllows,
  boardRouteAllows,
  CONTRACTOR_HOME,
  grantAreaForPath,
  grantState,
  ndaAcceptanceError,
  vnToday,
  type AccessGrant,
} from "./access-grants.ts";
import { resolvedProfileRole } from "./member-profile.ts";
import { CONTRACTOR_NDA_VERSION } from "../content/legal/contractor-nda.ts";

const NOW = new Date("2026-11-17T03:00:00Z"); // 10:00 in the chapter's zone (UTC+7)

function grant(overrides: Partial<AccessGrant> = {}): AccessGrant {
  return {
    area: "sap_pipeline",
    can_edit: true,
    expires_at: "2027-02-15",
    revoked_at: null,
    nda_version: CONTRACTOR_NDA_VERSION,
    nda_accepted_at: "2026-11-17T02:00:00Z",
    ...overrides,
  };
}

test("contractor role carries guest-level route access only", () => {
  for (const path of ["/board", "/board/strategic-alliance-partners", "/board/chapter-dashboard", "/admin", "/member", "/member/directory"]) {
    assert.equal(roleAtLeast("contractor", pageTier(path)), false, `contractor reached ${path}`);
  }
  assert.equal(roleAtLeast("contractor", pageTier("/member/events")), true);
  assert.equal(roleHomePath("contractor"), CONTRACTOR_HOME);
});

test("contractor role survives re-derivation unless they become a member", () => {
  assert.equal(resolvedProfileRole("contractor", false), "contractor");
  assert.equal(resolvedProfileRole("contractor", true), "member");
  assert.equal(resolvedProfileRole("guest", false), "guest");
});

test("grant state follows revocation, expiry and NDA acceptance", () => {
  assert.equal(grantState(grant(), NOW), "active");
  assert.equal(grantState(grant({ revoked_at: "2026-11-16T00:00:00Z" }), NOW), "revoked");
  assert.equal(grantState(grant({ expires_at: "2026-11-16" }), NOW), "expired");
  assert.equal(grantState(grant({ expires_at: "2026-11-17" }), NOW), "active", "expiry day is inclusive");
  assert.equal(grantState(grant({ nda_accepted_at: null }), NOW), "nda_required");
  assert.equal(grantState(grant({ nda_version: "v0" }), NOW), "nda_required", "old NDA version must be re-accepted");
});

test("expiry uses the chapter's calendar day", () => {
  // 23:30 UTC on 16 Nov is already 17 Nov at UTC+7.
  assert.equal(vnToday(new Date("2026-11-16T23:30:00Z")), "2026-11-17");
  assert.equal(grantState(grant({ expires_at: "2026-11-16" }), new Date("2026-11-16T23:30:00Z")), "expired");
});

test("area access matrix", () => {
  // Board and above need no grant.
  assert.equal(areaAllows("board", null, { edit: true }, NOW), true);
  assert.equal(areaAllows("super_admin", null, { edit: true }, NOW), true);
  // No grant, no access, whatever the lower role.
  for (const role of ["contractor", "member", "guest"] as const) {
    assert.equal(areaAllows(role, null, {}, NOW), false, `${role} without grant`);
  }
  assert.equal(areaAllows(null, grant(), {}, NOW), false, "signed out");
  // Active grant: read and edit.
  assert.equal(areaAllows("contractor", grant(), {}, NOW), true);
  assert.equal(areaAllows("contractor", grant(), { edit: true }, NOW), true);
  // View-only grant blocks edits.
  assert.equal(areaAllows("contractor", grant({ can_edit: false }), {}, NOW), true);
  assert.equal(areaAllows("contractor", grant({ can_edit: false }), { edit: true }, NOW), false);
  // Inactive grants give nothing.
  assert.equal(areaAllows("contractor", grant({ expires_at: "2026-11-01" }), {}, NOW), false);
  assert.equal(areaAllows("contractor", grant({ revoked_at: "2026-11-16T00:00:00Z" }), {}, NOW), false);
  assert.equal(areaAllows("contractor", grant({ nda_accepted_at: null }), {}, NOW), false);
});

test("only SAP pipeline routes are grantable areas", () => {
  assert.equal(grantAreaForPath("/board/strategic-alliance-partners"), "sap_pipeline");
  assert.equal(grantAreaForPath("/board/strategic-alliance-partners/new"), "sap_pipeline");
  assert.equal(grantAreaForPath("/board/strategic-alliance-partners/abc"), "sap_pipeline");
  for (const path of [
    "/board",
    "/board/sap-handover",
    "/board/strategic-alliance-partners-x",
    "/board/member-companies",
    "/board/members",
    "/admin/users",
    "/member/directory",
  ]) {
    assert.equal(grantAreaForPath(path), null, `${path} must not be grantable`);
  }
  assert.equal(grantAreaForPath(CONTRACTOR_HOME), "sap_pipeline");
});

test("SAP writes check the grant, delete stays board-only", () => {
  const src = readFileSync(
    new URL("../app/board/strategic-alliance-partners/actions.ts", import.meta.url),
    "utf8",
  );
  for (const fn of ["createPartner", "updatePartner", "changeStatus"]) {
    const body = src.slice(src.indexOf(`export async function ${fn}(`));
    const firstGuard = body.slice(0, body.indexOf("\n}\n"));
    assert.match(firstGuard, /await requireArea\("sap_pipeline", \{ edit: true \}\)/, `${fn} lost its grant check`);
  }
  const del = src.slice(src.indexOf("export async function deletePartner("));
  assert.match(del.slice(0, del.indexOf("\n}\n")), /await requireBoardOrAbove\(\)/, "delete must stay board-only");
});

test("board layout never renders board chrome for non-board users without a grant check", () => {
  const src = readFileSync(new URL("../app/board/layout.tsx", import.meta.url), "utf8");
  assert.match(src, /if \(!roleAtLeast\(viewer\.role, "board"\)\) \{\s*if \(viewer\.role !== "contractor"\) redirect/);
  assert.match(src, /await requireArea\("sap_pipeline"\)/);
});

test("board routes: board and admins everywhere, contractors only in their area", () => {
  for (const role of ["board", "super_admin"] as const) {
    for (const path of ["/board", "/board/members", CONTRACTOR_HOME, null]) {
      assert.equal(boardRouteAllows(role, path), true, `${role} locked out of ${path}`);
    }
  }
  assert.equal(boardRouteAllows("contractor", CONTRACTOR_HOME), true);
  assert.equal(boardRouteAllows("contractor", `${CONTRACTOR_HOME}/abc`), true);
  for (const path of ["/board", "/board/members", "/board/strategic-alliance-partners-x", "", null, undefined]) {
    assert.equal(boardRouteAllows("contractor", path), false, `contractor reached ${path}`);
  }
  for (const role of ["member", "guest", null] as const) {
    assert.equal(boardRouteAllows(role, CONTRACTOR_HOME), false, `${role} reached the board area`);
  }
});

test("NDA acceptance needs a live grant, the current version, the box ticked and a typed name", () => {
  const pending = grant({ nda_accepted_at: null, nda_version: null });
  const ok = { agreed: true, name: "Linh Tran", version: CONTRACTOR_NDA_VERSION };
  assert.equal(ndaAcceptanceError(ok, pending, NOW), null);
  assert.equal(ndaAcceptanceError(ok, grant({ nda_version: "v0" }), NOW), null, "re-accepting after a version bump");
  assert.match(ndaAcceptanceError(ok, null, NOW) ?? "", /don't have/);
  assert.match(ndaAcceptanceError(ok, grant({ nda_accepted_at: null, revoked_at: "2026-11-01T00:00:00Z" }), NOW) ?? "", /ended/);
  assert.match(ndaAcceptanceError(ok, grant({ nda_accepted_at: null, expires_at: "2026-11-16" }), NOW) ?? "", /ended/);
  assert.match(ndaAcceptanceError({ ...ok, version: "v0" }, pending, NOW) ?? "", /updated/);
  assert.match(ndaAcceptanceError({ ...ok, agreed: false }, pending, NOW) ?? "", /Tick/);
  assert.match(ndaAcceptanceError({ ...ok, name: "Li" }, pending, NOW) ?? "", /full name/);
  assert.match(ndaAcceptanceError({ ...ok, name: "   \t  " }, pending, NOW) ?? "", /full name/);
  assert.match(ndaAcceptanceError({ ...ok, name: "x".repeat(121) }, pending, NOW) ?? "", /full name/);
});
