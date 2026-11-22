import assert from "node:assert/strict";
import test from "node:test";
import {
  coerceAttribution,
  deriveChannelSource,
  hasUtm,
  replacesFirstTouch,
  type Attribution,
} from "./attribution.ts";

const EMPTY: Attribution = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
  referrer: null,
  landing_path: null,
};

const TAGGED: Attribution = {
  ...EMPTY,
  utm_source: "facebook",
  utm_medium: "social",
  utm_campaign: "keith-abraham-jan-21",
  utm_content: "2026-11-20-speaker-intro",
};

test("hasUtm is false without UTM params, even with a referrer", () => {
  assert.equal(hasUtm(EMPTY), false);
  assert.equal(hasUtm({ ...EMPTY, referrer: "https://www.facebook.com/" }), false);
});

test("hasUtm is true when any utm field is set", () => {
  assert.equal(hasUtm({ ...EMPTY, utm_content: "2026-10-29-rise4-reminder" }), true);
  assert.equal(hasUtm(TAGGED), true);
});

test("first capture always stores", () => {
  assert.equal(replacesFirstTouch(null, EMPTY), true);
  assert.equal(replacesFirstTouch(null, TAGGED), true);
});

test("a tagged visit replaces a stored untagged touch", () => {
  assert.equal(replacesFirstTouch(EMPTY, TAGGED), true);
  assert.equal(
    replacesFirstTouch({ ...EMPTY, referrer: "https://www.google.com/" }, TAGGED),
    true,
  );
});

test("a stored tagged touch is never overwritten", () => {
  assert.equal(replacesFirstTouch(TAGGED, TAGGED), false);
  assert.equal(
    replacesFirstTouch(TAGGED, { ...TAGGED, utm_content: "2026-12-01-later-post" }),
    false,
  );
});

test("an untagged visit never overwrites anything", () => {
  assert.equal(replacesFirstTouch(EMPTY, EMPTY), false);
  assert.equal(
    replacesFirstTouch(EMPTY, { ...EMPTY, referrer: "https://lnkd.in/abc" }),
    false,
  );
});

test("organic and paid social both derive from the comment-link taxonomy", () => {
  assert.equal(deriveChannelSource(TAGGED), "Organic Social");
  assert.equal(
    deriveChannelSource({ ...TAGGED, utm_medium: "paid_social" }),
    "Paid Social",
  );
});

test("coerceAttribution survives junk from a forged request", () => {
  assert.equal(coerceAttribution("not an object"), null);
  assert.equal(coerceAttribution(null), null);
  assert.equal(coerceAttribution({ utm_source: 42, referrer: {} }), null);
  const long = coerceAttribution({ utm_source: "x".repeat(2000) });
  assert.equal(long?.utm_source?.length, 500);
});
