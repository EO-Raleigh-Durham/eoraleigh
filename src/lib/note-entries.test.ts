import assert from "node:assert/strict";
import test from "node:test";
import { appendNote, parseNoteEntries } from "./note-entries.ts";

test("empty notes give no entries", () => {
  assert.deepEqual(parseNoteEntries(null), []);
  assert.deepEqual(parseNoteEntries("  \n "), []);
});

test("splits dated entries and sorts newest first", () => {
  const text =
    "[2026-09-01] First call.\nSecond line.\n\n[2026-10-05] Follow up.\n\n[2026-09-20] Mid.";
  assert.deepEqual(parseNoteEntries(text), [
    { date: "2026-10-05", body: "Follow up." },
    { date: "2026-09-20", body: "Mid." },
    { date: "2026-09-01", body: "First call.\nSecond line." },
  ]);
});

test("same-date entries keep the later-written one on top", () => {
  const text = "[2026-09-22] A\n[2026-09-22] B\n[2026-09-22] C";
  assert.deepEqual(
    parseNoteEntries(text).map((n) => n.body),
    ["C", "B", "A"],
  );
});

test("leading undated text becomes the oldest entry", () => {
  const text = "Imported from HubSpot.\n[2026-09-22] Qualified.";
  assert.deepEqual(parseNoteEntries(text), [
    { date: "2026-09-22", body: "Qualified." },
    { date: null, body: "Imported from HubSpot." },
  ]);
});

test("a bracketed date mid-line does not start a new entry", () => {
  const text = "[2026-09-22] Deadline moved from [2026-10-01] to later.";
  assert.equal(parseNoteEntries(text).length, 1);
});

test("appendNote adds a dated entry after the existing notes", () => {
  assert.equal(appendNote(null, "  First.  ", "2026-11-20"), "[2026-11-20] First.");
  assert.equal(appendNote("[2026-09-22] Old.\n", "New.", "2026-11-20"), "[2026-09-22] Old.\n\n[2026-11-20] New.");
  assert.equal(appendNote("[2026-09-22] Old.", "   ", "2026-11-20"), "[2026-09-22] Old.");
  assert.equal(parseNoteEntries(appendNote("[2026-09-22] Old.", "New.", "2026-11-20"))[0].body, "New.");
});
