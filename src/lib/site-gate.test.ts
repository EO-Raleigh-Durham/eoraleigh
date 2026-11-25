import assert from "node:assert/strict";
import test from "node:test";
const { decideSiteGate, isSiteGateExempt, siteGateFormHtml, siteGateToken, SITE_GATE_FIELD } = await import("./site-gate.ts");

test("no code configured leaves the site open", async () => {
  assert.deepEqual(await decideSiteGate(undefined, undefined, null), { kind: "off" });
  assert.deepEqual(await decideSiteGate("", "anything", "anything"), { kind: "off" });
});

test("without a cookie the form is shown", async () => {
  assert.deepEqual(await decideSiteGate("secret", undefined, null), { kind: "form", wrong: false });
});

test("the right code unlocks, a wrong one asks again", async () => {
  assert.deepEqual(await decideSiteGate("secret", undefined, " secret "), { kind: "unlock", token: await siteGateToken("secret") });
  assert.deepEqual(await decideSiteGate("secret", undefined, "nope"), { kind: "form", wrong: true });
});

test("a valid cookie passes, a stale one does not", async () => {
  assert.deepEqual(await decideSiteGate("secret", await siteGateToken("secret"), null), { kind: "pass" });
  assert.deepEqual(await decideSiteGate("new-secret", await siteGateToken("secret"), null), { kind: "form", wrong: false });
});

test("the cookie holds a hash, never the code", async () => {
  const t = await siteGateToken("secret");
  assert.match(t, /^[0-9a-f]{64}$/);
  assert.ok(!t.includes("secret"));
});

test("only OAuth discovery and robots.txt skip the gate", () => {
  assert.ok(isSiteGateExempt("/.well-known/oauth-protected-resource/api/mcp"));
  assert.ok(isSiteGateExempt("/robots.txt"));
  assert.ok(!isSiteGateExempt("/"));
  assert.ok(!isSiteGateExempt("/login"));
  assert.ok(!isSiteGateExempt("/auth/confirm"));
});

test("the form posts the gate's own field and is not indexed", () => {
  const html = siteGateFormHtml(true);
  assert.ok(html.includes(`name="${SITE_GATE_FIELD}"`));
  assert.ok(html.includes("noindex"));
  assert.ok(html.includes("not right"));
});
