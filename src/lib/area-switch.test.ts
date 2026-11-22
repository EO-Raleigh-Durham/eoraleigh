import assert from "node:assert/strict";
import test from "node:test";
import { roleAtLeast } from "./access.ts";
import { pageTier } from "./access-map.ts";
import { areaForPath, areaOptions } from "./area-switch.ts";

const labels = (role: Parameters<typeof areaOptions>[0]) =>
  areaOptions(role, "/").map((o) => o.label);

test("switcher shows only the areas the role can use", () => {
  assert.deepEqual(labels("super_admin"), ["Public site", "Member", "Board", "Admin"]);
  assert.deepEqual(labels("board"), ["Public site", "Member", "Board"]);
  assert.deepEqual(labels("member"), ["Public site", "Member"]);
  assert.deepEqual(labels("guest"), ["Public site", "Member"]);
  assert.deepEqual(labels(null), ["Public site"]);
});

test("the current area is highlighted from any path", () => {
  const current = (path: string) =>
    areaOptions("super_admin", path).find((o) => o.current)?.area;
  assert.equal(current("/"), "public");
  assert.equal(current("/profile"), "public");
  assert.equal(current("/board-of-directors"), "public");
  assert.equal(current("/member/directory"), "member");
  assert.equal(current("/portal/newsletters"), "member");
  assert.equal(current("/board/goals"), "board");
  assert.equal(current("/admin/users"), "admin");
});

test("areaForPath matches whole path segments only", () => {
  assert.equal(areaForPath("/boarding"), "public");
  assert.equal(areaForPath("/board"), "board");
  assert.equal(areaForPath("/administrator"), "public");
});

// The proxy denies a route when roleAtLeast(role, pageTier(path)) is false.
test("an ordinary member cannot open /board or /admin routes", () => {
  for (const path of ["/board", "/board/chapter-dashboard", "/board/members", "/board/inquiries"]) {
    assert.equal(roleAtLeast("member", pageTier(path)), false, path);
    assert.equal(roleAtLeast("board", pageTier(path)), true, path);
  }
  for (const path of ["/admin", "/admin/users", "/admin/crm"]) {
    assert.equal(roleAtLeast("member", pageTier(path)), false, path);
    assert.equal(roleAtLeast("board", pageTier(path)), false, path);
    assert.equal(roleAtLeast("super_admin", pageTier(path)), true, path);
  }
});
