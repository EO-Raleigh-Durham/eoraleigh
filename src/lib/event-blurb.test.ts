import assert from "node:assert/strict";
import test from "node:test";
import { parseBlurb, plainBlurb } from "./event-blurb.ts";

test("plain blurb without markers is one unchanged text block", () => {
  const blurb = "First paragraph.\n\nSecond paragraph.";
  assert.deepEqual(parseBlurb(blurb), [
    { kind: "text", spans: [{ text: blurb, bold: false }] },
  ]);
});

test("headings, highlights and bold are parsed", () => {
  const blocks = parseBlurb("## Agenda\n> **Free** for members\nDinner at **7 PM**");
  assert.equal(blocks[0].kind, "heading");
  assert.equal(blocks[1].kind, "highlight");
  assert.deepEqual(blocks[1].spans[0], { text: "Free", bold: true });
  assert.deepEqual(blocks[2].spans, [
    { text: "Dinner at ", bold: false },
    { text: "7 PM", bold: true },
  ]);
});

test("plainBlurb strips all markers", () => {
  assert.equal(plainBlurb("## Agenda\n> **Free** entry"), "Agenda\nFree entry");
  assert.equal(plainBlurb(null), undefined);
});
