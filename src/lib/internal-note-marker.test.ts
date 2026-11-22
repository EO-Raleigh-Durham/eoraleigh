import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  InternalNoteMarker,
  internalNoteDisplayText,
  internalNoteDisclosureReducer,
} from "../app/board/events/InternalNoteMarker.ts";
import { complimentaryPolicyNote } from "./complimentary-rsvp.ts";

test("renders saved note text in an accessible focusable disclosure", () => {
  const html = renderToStaticMarkup(
    createElement(InternalNoteMarker, {
      note: "Confirmed by phone\nVegetarian meal",
    }),
  );

  assert.match(html, /<button[^>]*type="button"/);
  assert.match(html, /aria-label="Internal note"/);
  assert.match(html, /aria-describedby="([^"]+)"/);
  assert.match(html, /role="tooltip"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /Confirmed by phone\nVegetarian meal/);

  const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1];
  assert.ok(describedBy);
  assert.match(html, new RegExp(`id="${describedBy}"`));
});

test("opens for hover and focus, supports Escape dismissal, and toggles touch focus", () => {
  const closed = { focused: false, hovered: false };
  const hovered = internalNoteDisclosureReducer(closed, "enter");
  assert.deepEqual(hovered, { focused: false, hovered: true });
  assert.deepEqual(internalNoteDisclosureReducer(hovered, "leave"), closed);

  const focused = internalNoteDisclosureReducer(closed, "focus");
  assert.deepEqual(focused, { focused: true, hovered: false });
  assert.deepEqual(internalNoteDisclosureReducer(focused, "dismiss"), closed);
  assert.deepEqual(internalNoteDisclosureReducer(focused, "toggle-focus"), closed);
  assert.deepEqual(internalNoteDisclosureReducer(closed, "toggle-focus"), focused);
});

test("summarizes complimentary audit prose without hiding human notes", () => {
  const auditNote = complimentaryPolicyNote("Harley Trung");
  const sponsorAudit = "Complimentary invite sponsored by Alex Morgan. No-show policy acknowledged by sponsoring EO member Alex Morgan.";
  const displayNote = internalNoteDisplayText(
    `${auditNote}\n${sponsorAudit}\nVegetarian meal`,
  );

  assert.equal(
    displayNote,
    "Complimentary guest\nSponsor: Alex Morgan\nNo-show policy acknowledged\nVegetarian meal",
  );
  assert.doesNotMatch(displayNote, /Harley Trung|Late cancellation|Complimentary invite/);
  assert.equal(internalNoteDisplayText("Confirmed by phone"), "Confirmed by phone");
  assert.equal(internalNoteDisplayText(sponsorAudit), sponsorAudit);

  const html = renderToStaticMarkup(
    createElement(InternalNoteMarker, { note: auditNote }),
  );
  assert.match(html, /Complimentary guest\nNo-show policy acknowledged/);
  assert.doesNotMatch(html, /Harley Trung|Late cancellation/);
});

test("escapes note content and omits the marker when no note is saved", () => {
  const html = renderToStaticMarkup(
    createElement(InternalNoteMarker, {
      note: "Call <script>alert('no')</script>",
    }),
  );

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.equal(
    renderToStaticMarkup(createElement(InternalNoteMarker, { note: null })),
    "",
  );
});
