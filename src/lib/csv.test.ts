import assert from "node:assert/strict";
import test from "node:test";

import { csvCell, toCsv } from "./csv.ts";

test("csvCell quotes commas, quotes and newlines", () => {
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("x\ny"), '"x\ny"');
  assert.equal(csvCell(null), "");
});

test("csvCell neutralises spreadsheet formulas", () => {
  assert.equal(csvCell("=SUM(A1)"), "'=SUM(A1)");
  assert.equal(csvCell("+1"), "'+1");
  assert.equal(csvCell("@cmd"), "'@cmd");
});

test("toCsv joins rows with CRLF and a trailing newline", () => {
  assert.equal(toCsv(["a", "b"], [["1", "2,3"]]), 'a,b\r\n1,"2,3"\r\n');
});
