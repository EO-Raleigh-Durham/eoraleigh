import assert from "node:assert/strict";
import test from "node:test";
import { oauthClientOf } from "./oauth-client-token.ts";

const jwt = (claims: object) =>
  `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;

test("a connector token names its OAuth client; a browser sign-in does not", () => {
  assert.equal(oauthClientOf(jwt({ sub: "u1", client_id: "abc-123" })), "abc-123");
  assert.equal(oauthClientOf(jwt({ sub: "u1" })), null);
  assert.equal(oauthClientOf(jwt({ sub: "u1", client_id: "" })), null);
  assert.equal(oauthClientOf(jwt({ sub: "u1", client_id: 42 })), null);
  assert.equal(oauthClientOf("not-a-jwt"), null);
  assert.equal(oauthClientOf(null), null);
});
