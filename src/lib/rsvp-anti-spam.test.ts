import assert from "node:assert/strict";
import test from "node:test";

import {
  RSVP_MIN_COMPLETION_MS,
  RSVP_TOKEN_MAX_AGE_MS,
  checkRsvpSubmission,
  createRsvpFormToken,
  isRsvpBurstLimited,
  verifyRsvpFormToken,
} from "./rsvp-anti-spam.ts";

const EVENT_ID = "event-123";
const SECRET = "test-secret";
const ISSUED_AT = 1_700_000_000_000;

test("accepts a correctly signed token after a human completion interval", () => {
  const token = createRsvpFormToken(EVENT_ID, ISSUED_AT, SECRET);
  assert.deepEqual(
    verifyRsvpFormToken(token, EVENT_ID, ISSUED_AT + RSVP_MIN_COMPLETION_MS, SECRET),
    { ok: true },
  );
});

test("rejects an instant submission", () => {
  const token = createRsvpFormToken(EVENT_ID, ISSUED_AT, SECRET);
  assert.deepEqual(verifyRsvpFormToken(token, EVENT_ID, ISSUED_AT + 500, SECRET), {
    ok: false,
    reason: "too_fast",
  });
});

test("rejects a filled honeypot even with a valid timing token", () => {
  const token = createRsvpFormToken(EVENT_ID, ISSUED_AT, SECRET);
  assert.deepEqual(
    checkRsvpSubmission("https://spam.example", token, EVENT_ID, ISSUED_AT + 5_000, SECRET),
    { ok: false, reason: "honeypot" },
  );
});

test("rejects tampered, cross-event, and expired tokens", () => {
  const token = createRsvpFormToken(EVENT_ID, ISSUED_AT, SECRET);
  assert.equal(verifyRsvpFormToken(`${token}x`, EVENT_ID, ISSUED_AT + 5_000, SECRET).ok, false);
  assert.equal(verifyRsvpFormToken(token, "other-event", ISSUED_AT + 5_000, SECRET).ok, false);
  assert.deepEqual(
    verifyRsvpFormToken(token, EVENT_ID, ISSUED_AT + RSVP_TOKEN_MAX_AGE_MS + 1, SECRET),
    { ok: false, reason: "expired" },
  );
});

test("rejects an oversized token before parsing attacker-controlled input", () => {
  assert.deepEqual(verifyRsvpFormToken("x".repeat(257), EVENT_ID, ISSUED_AT, SECRET), {
    ok: false,
    reason: "invalid",
  });
});

test("allows three recent RSVPs and blocks the next attempt", () => {
  assert.equal(isRsvpBurstLimited(2), false);
  assert.equal(isRsvpBurstLimited(3), true);
});
