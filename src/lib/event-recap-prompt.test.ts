import assert from "node:assert/strict";
import test from "node:test";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  postPlainText,
  promptFingerprint,
  type RecapPromptInput,
} from "./event-recap-prompt.ts";
import type { Block } from "./blog.ts";

function input(overrides: Partial<RecapPromptInput> = {}): RecapPromptInput {
  return {
    eventTitle: "Lead Your Organization in the AI Era",
    eventType: "learning",
    eventDate: "24 July 2026",
    eventLocation: "Grand Harbor Hotel",
    eventSpeaker: "Dr. Mai Chen",
    eventBlurb: "An evening on what AI changes about running a company.",
    postTitle: "What we learned about AI in the boardroom",
    postExcerpt: "Three members mid-rollout share what actually worked.",
    postBlocks: [{ tag: "p", text: "A full house of members." }],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// The system prompt carries the rules that keep auto-publish safe
// ---------------------------------------------------------------------------

test("the model is forbidden from stating numbers", () => {
  assert.match(SYSTEM_PROMPT, /Never state a number/);
});

test("the model is forbidden from inventing quotes", () => {
  assert.match(SYSTEM_PROMPT, /Never invent a quote/);
});

test("the model is forbidden from writing links or calls to action", () => {
  assert.match(SYSTEM_PROMPT, /Never write a call to action or a link/);
});

test("the fact-carrying block tags are named as forbidden", () => {
  for (const tag of ["stat-callout", "testimonial-row", "cta-button", "html"]) {
    assert.match(SYSTEM_PROMPT, new RegExp(tag), `${tag} should be forbidden by name`);
  }
});

test("the pull-quote must be verbatim", () => {
  assert.match(SYSTEM_PROMPT, /VERBATIM/);
});

test("every allowed tag has its exact shape documented", () => {
  // The model emitted {"tag":"p","content":"..."} against the first version of
  // this prompt, which failed validation and discarded an otherwise good
  // recap. Naming the fields is what prevents that.
  for (const shape of [
    '{"tag": "p", "text"',
    '{"tag": "h2", "text"',
    '{"tag": "h3", "text"',
    '{"tag": "pull-quote", "text"',
    '{"tag": "tl-dr", "items"',
    '{"tag": "shipped-list", "title"',
  ]) {
    assert.ok(SYSTEM_PROMPT.includes(shape), `prompt does not document ${shape}`);
  }
});

test("the prompt rules out the field names the model actually guessed", () => {
  assert.match(SYSTEM_PROMPT, /never content/);
});

test("house style rules are stated", () => {
  assert.match(SYSTEM_PROMPT, /Do not use em dashes/);
  assert.match(SYSTEM_PROMPT, /Do not end a heading with a period/);
});

// ---------------------------------------------------------------------------
// The user prompt
// ---------------------------------------------------------------------------

test("the user prompt carries the event and the post", () => {
  const prompt = buildUserPrompt(input());
  assert.match(prompt, /Lead Your Organization in the AI Era/);
  assert.match(prompt, /Grand Harbor Hotel/);
  assert.match(prompt, /Dr\. Mai Chen/);
  assert.match(prompt, /What we learned about AI in the boardroom/);
  assert.match(prompt, /A full house of members\./);
});

test("optional event fields are omitted rather than sent as null", () => {
  const prompt = buildUserPrompt(
    input({ eventLocation: null, eventSpeaker: null, eventBlurb: null }),
  );
  assert.equal(/Location:/.test(prompt), false);
  assert.equal(/Speaker:/.test(prompt), false);
  assert.equal(/null/.test(prompt), false);
});

test("a post with no body still produces a usable prompt", () => {
  const prompt = buildUserPrompt(input({ postBlocks: null }));
  assert.match(prompt, /no body text/);
});

test("no stats or testimonials are ever sent to the model", () => {
  const prompt = buildUserPrompt(input());
  assert.equal(/attended/i.test(prompt), false);
  assert.equal(/rating/i.test(prompt), false);
});

// ---------------------------------------------------------------------------
// Flattening the post
// ---------------------------------------------------------------------------

test("prose blocks are flattened in order", () => {
  const blocks: Block[] = [
    { tag: "h2", text: "The room" },
    { tag: "p", text: "First." },
    { tag: "p", text: "Second." },
  ];
  assert.equal(postPlainText(blocks), "The room\n\nFirst.\n\nSecond.");
});

test("inline html is stripped so the model reads words, not markup", () => {
  const blocks: Block[] = [
    { tag: "p", text: 'Body with <strong>emphasis</strong> and <a href="/x">a link</a>.' },
  ];
  assert.equal(postPlainText(blocks), "Body with emphasis and a link.");
});

test("a pull-quote keeps its attribution so the model can reuse it verbatim", () => {
  const blocks: Block[] = [
    { tag: "pull-quote", text: "Ask which decision is slowest.", attribution: "Dr. Mai Chen" },
  ];
  assert.equal(postPlainText(blocks), '"Ask which decision is slowest." — Dr. Mai Chen');
});

test("list blocks become bullets", () => {
  const blocks: Block[] = [{ tag: "tl-dr", items: ["One", "Two"] }];
  assert.equal(postPlainText(blocks), "- One\n- Two");
});

test("images and other non-prose blocks contribute nothing", () => {
  const blocks: Block[] = [
    { tag: "image", src: "/a.jpg", alt: "A photo", caption: "A caption" },
    { tag: "p", text: "Real text." },
  ];
  assert.equal(postPlainText(blocks), "Real text.");
});

test("an empty or null block list flattens to an empty string", () => {
  assert.equal(postPlainText(null), "");
  assert.equal(postPlainText([]), "");
});

// ---------------------------------------------------------------------------
// Fingerprint
// ---------------------------------------------------------------------------

test("the same input fingerprints identically", () => {
  assert.equal(promptFingerprint(input()), promptFingerprint(input()));
});

test("a changed post body changes the fingerprint", () => {
  const before = promptFingerprint(input());
  const after = promptFingerprint(
    input({ postBlocks: [{ tag: "p", text: "Rewritten body." }] }),
  );
  assert.notEqual(before, after);
});

test("the fingerprint carries the prompt version", () => {
  assert.match(promptFingerprint(input()), /^recap-v1-/);
});
