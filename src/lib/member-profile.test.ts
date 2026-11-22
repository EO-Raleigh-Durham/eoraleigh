import assert from "node:assert/strict";
import test from "node:test";

import {
  profileLookupError,
  resolvedProfilePersonId,
  resolvedProfileRole,
} from "./member-profile.ts";

test("verified alternate email resolves to its canonical person", () => {
  assert.equal(
    resolvedProfilePersonId(null, "alias-person", "legacy-primary-person"),
    "alias-person",
  );
});

test("an existing Auth profile person remains authoritative", () => {
  assert.equal(
    resolvedProfilePersonId("existing-person", "alias-person", "primary-person"),
    "existing-person",
  );
});

test("verified primary email remains the compatibility fallback", () => {
  assert.equal(
    resolvedProfilePersonId(null, null, "primary-person"),
    "primary-person",
  );
  assert.equal(resolvedProfilePersonId(null, null, null), null);
});

test("identity lookup errors remain fail-closed", () => {
  assert.equal(
    profileLookupError(
      { error: null },
      { error: { message: "identity lookup failed" } },
    ),
    "identity lookup failed",
  );
});

test("membership still determines ordinary profile access", () => {
  assert.equal(resolvedProfileRole("guest", true), "member");
  assert.equal(resolvedProfileRole("member", false), "guest");
  assert.equal(resolvedProfileRole("board", false), "board");
  assert.equal(resolvedProfileRole("super_admin", false), "super_admin");
});
