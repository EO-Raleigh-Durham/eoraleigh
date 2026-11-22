import assert from "node:assert/strict";
import test from "node:test";

import { registrationSourceLines } from "./registration-source.ts";

test("shows channel, campaign and post tag, and the guest's own answer", () => {
  assert.deepEqual(
    registrationSourceLines({
      channel_source: "Organic Social",
      utm_campaign: "rise4",
      utm_content: "phu-insight",
      referral_source: "Facebook",
    }),
    ["Organic Social", "rise4 / phu-insight", "Heard via Facebook"],
  );
});

test("falls back to utm_source when no channel was derived", () => {
  assert.deepEqual(registrationSourceLines({ utm_source: "facebook" }), ["facebook"]);
});

test("returns nothing for a registration with no attribution", () => {
  assert.deepEqual(registrationSourceLines({}), []);
  assert.deepEqual(registrationSourceLines({ channel_source: " ", referral_source: "" }), []);
});
