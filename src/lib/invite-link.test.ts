import assert from "node:assert/strict";
import test from "node:test";

import { inviteConfirmLink } from "./invite-link.ts";

test("invite link points at our confirm route and on to choosing a password", () => {
  const link = inviteConfirmLink("https://www.example.org/", "abc123", "invite", "https://x.supabase.co/verify");
  const url = new URL(link);
  assert.equal(url.origin + url.pathname, "https://www.example.org/auth/confirm");
  assert.equal(url.searchParams.get("token_hash"), "abc123");
  assert.equal(url.searchParams.get("type"), "invite");
  assert.equal(url.searchParams.get("next"), "/reset-password");
});

test("existing users get an email sign-in token type", () => {
  const url = new URL(inviteConfirmLink("https://www.example.org", "t", "email", ""));
  assert.equal(url.searchParams.get("type"), "email");
});

test("falls back to the Supabase link without a site URL or token", () => {
  assert.equal(inviteConfirmLink("", "t", "invite", "https://fallback"), "https://fallback");
  assert.equal(inviteConfirmLink("https://www.example.org", "", "invite", "https://fallback"), "https://fallback");
});
