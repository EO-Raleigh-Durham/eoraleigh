import assert from "node:assert/strict";
import test from "node:test";
// Share cards use the site URL from chapter config, read at import time.
process.env.NEXT_PUBLIC_SITE_URL = "https://www.example.com";
const { decidePlans, isLinkPreviewBot, isPlansPath, plansFormHtml, plansPreviewTags, plansToken } = await import(
  "./plans-gate.ts"
);

test("only /plans and below are gated", () => {
  assert.ok(isPlansPath("/plans"));
  assert.ok(isPlansPath("/plans/security-access-matrix.html"));
  assert.ok(!isPlansPath("/plansomething"));
  assert.ok(!isPlansPath("/board/plans"));
});

test("no configured code refuses everyone", async () => {
  assert.deepEqual(await decidePlans(undefined, undefined, "anything"), { kind: "unconfigured" });
});

test("the right code unlocks, a wrong one asks again", async () => {
  const ok = await decidePlans("secret-code", undefined, " secret-code ");
  assert.equal(ok.kind, "unlock");
  assert.deepEqual(await decidePlans("secret-code", undefined, "guess"), { kind: "form", wrong: true });
});

test("the cookie passes only while it matches the current code", async () => {
  const token = await plansToken("secret-code");
  assert.deepEqual(await decidePlans("secret-code", token, null), { kind: "pass" });
  assert.deepEqual(await decidePlans("new-code", token, null), { kind: "form", wrong: false });
  assert.deepEqual(await decidePlans("secret-code", "secret-code", null), { kind: "form", wrong: false });
});

test("shared plans carry a share card, other plans do not", () => {
  const tags = plansPreviewTags("/plans/membership-campaign-review");
  assert.match(tags, /og:image" content="https:\/\/www\.example\.com\/images\/plans\/membership-campaign-og\.jpg"/);
  assert.equal(plansPreviewTags("/plans/30-day-membership-campaign.html").includes("og:title"), true);
  assert.equal(plansPreviewTags("/plans/security-access-matrix.html"), "");
  assert.match(plansFormHtml(false, "/plans/membership-campaign-review"), /og:title/);
});

test("only link-preview bots are recognised", () => {
  assert.ok(isLinkPreviewBot("WhatsApp/2.23.20.0 A"));
  assert.ok(isLinkPreviewBot("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"));
  assert.ok(!isLinkPreviewBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"));
  assert.ok(!isLinkPreviewBot(null));
});
