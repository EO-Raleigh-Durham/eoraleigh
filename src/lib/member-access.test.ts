import assert from "node:assert/strict";
import test from "node:test";
import { roleAtLeast } from "./access.ts";
import { pageTier, roleHomePath } from "./access-map.ts";
import type { UserRole } from "./access.ts";

function canOpen(role: UserRole | null, pathname: string): boolean {
  return roleAtLeast(role, pageTier(pathname));
}

test("member portal rejects anonymous and guest roles", () => {
  for (const pathname of [
    "/member",
    "/member/directory",
    "/member/blog",
    "/member/newsletters/may-2026",
    "/member/priorities",
    "/portal/newsletters/may-2026",
  ]) {
    assert.equal(canOpen(null, pathname), false, `${pathname} allowed anonymous access`);
    assert.equal(canOpen("guest", pathname), false, `${pathname} allowed guest access`);
  }
});

test("guest accounts retain self-scoped event access", () => {
  assert.equal(canOpen(null, "/member/events"), false);
  assert.equal(canOpen("guest", "/member/events"), true);
  assert.equal(roleHomePath("guest"), "/member/events");
});

test("verified active-member emails receive member access without downgrading staff", async () => {
  const { profileLookupError, resolvedProfileRole } = await import("./member-profile.ts");

  assert.equal(resolvedProfileRole(null, false), "guest");
  assert.equal(resolvedProfileRole("guest", true), "member");
  assert.equal(resolvedProfileRole("member", false), "guest");
  assert.equal(resolvedProfileRole("board", false), "board");
  assert.equal(resolvedProfileRole("super_admin", false), "super_admin");

  assert.equal(profileLookupError({ error: null }, { error: null }), null);
  assert.equal(
    profileLookupError({ error: null }, { error: { message: "people lookup failed" } }),
    "people lookup failed",
  );
});

test("member portal remains available to member, board, and admin roles", () => {
  for (const role of ["member", "board", "super_admin"] satisfies UserRole[]) {
    assert.equal(canOpen(role, "/member/directory"), true, `${role} lost member access`);
  }
});

test("ticket and intentionally public event flows stay public", () => {
  for (const pathname of [
    "/t/ABC123",
    "/events",
    "/events/example-event",
    "/events/example-event/survey",
    "/chapter-dues",
  ]) {
    assert.equal(pageTier(pathname), "public", `${pathname} became authenticated`);
    assert.equal(canOpen(null, pathname), true, `${pathname} rejected anonymous access`);
    assert.equal(canOpen("guest", pathname), true, `${pathname} rejected guest access`);
  }
});

test("board and admin route boundaries are unchanged", () => {
  assert.equal(canOpen("member", "/board/chapter-dashboard"), false);
  assert.equal(canOpen("board", "/board/chapter-dashboard"), true);
  assert.equal(canOpen("board", "/admin/users"), false);
  assert.equal(canOpen("super_admin", "/admin/users"), true);
});

test("guest login has no member-portal fallback", () => {
  assert.equal(roleHomePath("guest"), "/member/events");
  assert.equal(roleHomePath("member"), "/member");
  assert.equal(roleHomePath("board"), "/board/chapter-dashboard");
  assert.equal(roleHomePath("super_admin"), "/board/chapter-dashboard");
});

test("member-only content rejects guest roles", () => {
  assert.equal(roleAtLeast(null, "member"), false);
  assert.equal(roleAtLeast("guest", "member"), false);
  assert.equal(roleAtLeast("member", "member"), true);
  assert.equal(roleAtLeast("board", "member"), true);
});
