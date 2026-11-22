import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTicketCode, validTicketCode } from "./tickets.ts";

test("normalizes a bare ticket code or ticket URL", () => {
  assert.equal(normalizeTicketCode(" abcd2345wxyz "), "ABCD2345WXYZ");
  assert.equal(
    normalizeTicketCode("https://www.chapter.example.org/t/ABCD2345WXYZ?source=email"),
    "ABCD2345WXYZ",
  );
});

test("accepts only the 12-character Crockford ticket shape", () => {
  assert.equal(validTicketCode("ABCD2345WXYZ"), true);
  assert.equal(validTicketCode("ABCD2345WXY"), false);
  assert.equal(validTicketCode("ABCD2345WXYI"), false);
  assert.equal(validTicketCode("ABCD2345WXYU"), false);
  assert.equal(validTicketCode("<script>x</script>"), false);
});
