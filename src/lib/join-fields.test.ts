import assert from "node:assert/strict";
import test from "node:test";
import { missingJoinFields } from "./join-fields.ts";

const full = { name: "An", email: "an@x.vn", company: "Co", role: "Founder", revenue: "$1M – $3M", why: "Grow" };

test("a full application requires why", () => {
  assert.deepEqual(missingJoinFields({ ...full, why: " " }, false), ["why"]);
});

test("an expression of interest does not require why", () => {
  assert.deepEqual(missingJoinFields({ ...full, why: undefined }, true), []);
});

test("an expression of interest still requires the core fields", () => {
  assert.deepEqual(missingJoinFields({ name: "An", email: "an@x.vn" }, true), ["company", "role", "revenue"]);
});
