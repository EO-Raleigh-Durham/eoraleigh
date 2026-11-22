import assert from "node:assert/strict";
import test from "node:test";

import {
  UNTAGGED,
  platformOf,
  summarisePlatforms,
} from "./registration-platforms.ts";

test("platform comes from the utm_source on the link, however it is typed", () => {
  assert.equal(platformOf({ utm_source: "facebook" }), "Facebook");
  assert.equal(platformOf({ utm_source: "FB" }), "Facebook");
  assert.equal(platformOf({ utm_source: " linkedin " }), "LinkedIn");
  assert.equal(platformOf({ utm_source: "ig" }), "Instagram");
  assert.equal(platformOf({ utm_source: "wa" }), "WhatsApp");
  assert.equal(platformOf({ utm_source: "newsletter" }), "Email");
  assert.equal(platformOf({ utm_source: "partnerhub" }), "Partnerhub");
});

test("utm_source wins over the referrer and the derived channel", () => {
  assert.equal(
    platformOf({
      utm_source: "linkedin",
      referrer: "https://l.facebook.com/",
      channel_source: "Organic Social",
    }),
    "LinkedIn",
  );
});

test("an untagged link falls back to the referrer host", () => {
  assert.equal(platformOf({ referrer: "https://www.linkedin.com/feed/" }), "LinkedIn");
  assert.equal(platformOf({ referrer: "https://l.facebook.com/l.php?u=x" }), "Facebook");
  assert.equal(platformOf({ referrer: "https://lnkd.in/abc" }), "LinkedIn");
});

test("a host that only contains a platform's letters does not match it", () => {
  assert.equal(platformOf({ referrer: "https://www.linux.com/" }), UNTAGGED);
  assert.equal(platformOf({ referrer: "https://fakefb.com.example.net/" }), UNTAGGED);
});

test("with no tag and no known referrer it uses the coarse channel, then untagged", () => {
  assert.equal(platformOf({ channel_source: "Organic Search" }), "Organic Search");
  assert.equal(platformOf({ channel_source: "Direct Traffic" }), UNTAGGED);
  assert.equal(platformOf({}), UNTAGGED);
  assert.equal(platformOf({ utm_source: "  ", channel_source: " " }), UNTAGGED);
});

test("summary counts registrations per platform and leaves cancelled ones out", () => {
  const s = summarisePlatforms([
    { status: "registered", utm_source: "facebook", utm_campaign: "rise4", utm_content: "phu-insight" },
    { status: "attended", utm_source: "fb", utm_campaign: "rise4", utm_content: "phu-insight" },
    { status: "registered", utm_source: "linkedin", utm_campaign: "rise4", utm_content: "tk-quote" },
    { status: "cancelled", utm_source: "linkedin", utm_campaign: "rise4", utm_content: "tk-quote" },
    { status: "registered" },
  ]);
  assert.equal(s.total, 4);
  assert.equal(s.tagged, 3);
  assert.deepEqual(s.byPlatform, [
    { label: "Facebook", count: 2 },
    { label: "LinkedIn", count: 1 },
    { label: UNTAGGED, count: 1 },
  ]);
  assert.deepEqual(s.byPost, [
    { platform: "Facebook", campaign: "rise4", post: "phu-insight", count: 2 },
    { platform: "LinkedIn", campaign: "rise4", post: "tk-quote", count: 1 },
  ]);
});

test("an empty list gives zeros and no rows", () => {
  assert.deepEqual(summarisePlatforms([]), {
    total: 0,
    tagged: 0,
    byPlatform: [],
    byPost: [],
  });
});
