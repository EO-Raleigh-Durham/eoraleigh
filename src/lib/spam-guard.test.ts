import assert from "node:assert/strict";
import test from "node:test";
import { MIN_SUBMIT_MS, looksLikeBot } from "./spam-guard.ts";

test("a filled honeypot is a bot, however long it took", () => {
  assert.equal(looksLikeBot({ honeypot: "https://spam.example", elapsedMs: 60_000 }), true);
});

test("an empty or missing honeypot is a person", () => {
  assert.equal(looksLikeBot({ honeypot: "", elapsedMs: 60_000 }), false);
  assert.equal(looksLikeBot({ honeypot: "   ", elapsedMs: 60_000 }), false);
  assert.equal(looksLikeBot({ elapsedMs: 60_000 }), false);
  assert.equal(looksLikeBot({ honeypot: null, elapsedMs: 60_000 }), false);
});

test("a form sent faster than a person can type is a bot", () => {
  assert.equal(looksLikeBot({ elapsedMs: 0 }), true);
  assert.equal(looksLikeBot({ elapsedMs: MIN_SUBMIT_MS - 1 }), true);
  assert.equal(looksLikeBot({ elapsedMs: MIN_SUBMIT_MS }), false);
});

test("a missing or unusable time never drops a real submission", () => {
  assert.equal(looksLikeBot({}), false);
  assert.equal(looksLikeBot({ elapsedMs: "5" }), false);
  assert.equal(looksLikeBot({ elapsedMs: -400 }), false);
  assert.equal(looksLikeBot({ elapsedMs: Number.NaN }), false);
});
