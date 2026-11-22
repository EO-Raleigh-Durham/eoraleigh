import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidPhoneNumber } from "./phone-validation.ts";

test("accepts common international phone formats", () => {
  for (const phone of [
    "+44 7700 900 123",
    "0912-345-678",
    "(020) 7946 0018",
    "+1 (415) 555-0132",
  ]) {
    assert.equal(isValidPhoneNumber(phone), true, phone);
  }
});

test("rejects empty, short, and malformed phone numbers", () => {
  for (const phone of [
    "",
    "   ",
    "123456",
    "1234567890123456",
    "abc1234567",
    "+44 7700 ABC 123",
    "++447700900123",
  ]) {
    assert.equal(isValidPhoneNumber(phone), false, JSON.stringify(phone));
  }
});
