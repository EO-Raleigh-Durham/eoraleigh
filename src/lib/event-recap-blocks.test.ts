import assert from "node:assert/strict";
import test from "node:test";
import {
  validateModelBlocks,
  assembleRecap,
  MAX_MODEL_BLOCKS,
} from "./event-recap-blocks.ts";
import type { Block } from "./blog.ts";

const PROSE = JSON.stringify([
  { tag: "p", text: "A full house spent the evening pulling apart what AI changes." },
  { tag: "pull-quote", text: "Ask which decision is slowest.", attribution: "Dr. Mai Chen" },
]);

function ok(raw: string) {
  const result = validateModelBlocks(raw);
  assert.equal(result.ok, true, result.ok ? "" : result.error);
  return result.ok ? result.blocks : [];
}

function err(raw: string): string {
  const result = validateModelBlocks(raw);
  assert.equal(result.ok, false, "expected validation to fail");
  return result.ok ? "" : result.error;
}

// ---------------------------------------------------------------------------
// Accepting good output
// ---------------------------------------------------------------------------

test("valid prose blocks pass", () => {
  assert.equal(ok(PROSE).length, 2);
});

test("every allowed tag is accepted in its correct shape", () => {
  ok(
    JSON.stringify([
      { tag: "p", text: "Paragraph." },
      { tag: "h2", text: "Heading" },
      { tag: "h3", text: "Subheading" },
      { tag: "pull-quote", text: "Quote." },
      { tag: "tl-dr", items: ["One", "Two"] },
      { tag: "shipped-list", title: "Takeaways", items: ["A"] },
    ]),
  );
});

test("a pull-quote without an attribution is allowed", () => {
  ok(JSON.stringify([{ tag: "pull-quote", text: "Anonymous but real." }]));
});

// ---------------------------------------------------------------------------
// Rejecting bad output. Any failure kills the whole generation.
// ---------------------------------------------------------------------------

test("non-JSON is rejected", () => {
  assert.match(err("Here is your recap!"), /not valid JSON/);
});

test("a JSON object rather than an array is rejected", () => {
  assert.match(err('{"tag":"p","text":"hi"}'), /must be an array/);
});

test("an empty array is rejected", () => {
  assert.match(err("[]"), /no blocks/);
});

test("an unknown tag rejects the whole generation, it is not dropped", () => {
  const message = err(
    JSON.stringify([
      { tag: "p", text: "Good block." },
      { tag: "marquee", text: "Invented tag." },
    ]),
  );
  assert.match(message, /marquee/);
  assert.match(message, /may not emit/);
});

test("the model may not emit a stat-callout, because stats are facts", () => {
  assert.match(
    err(JSON.stringify([{ tag: "stat-callout", stats: [{ value: "999", label: "attended" }] }])),
    /stat-callout/,
  );
});

test("the model may not emit a cta-button, because the teaser is fixed copy", () => {
  assert.match(
    err(JSON.stringify([{ tag: "cta-button", label: "Click", href: "/evil" }])),
    /cta-button/,
  );
});

test("the model may not emit a testimonial-row, because quotes are selected in code", () => {
  assert.match(
    err(JSON.stringify([{ tag: "testimonial-row", items: [] }])),
    /testimonial-row/,
  );
});

test("the model may not emit raw html", () => {
  assert.match(err(JSON.stringify([{ tag: "html", html: "<script>x</script>" }])), /html/);
});

test("a block with an empty text field is rejected", () => {
  assert.match(err(JSON.stringify([{ tag: "p", text: "   " }])), /no text/);
});

test("a block with no tag is rejected", () => {
  assert.match(err(JSON.stringify([{ text: "orphan" }])), /no tag/);
});

test("a non-object block is rejected", () => {
  assert.match(err(JSON.stringify(["just a string"])), /not an object/);
});

test("a tl-dr with an empty item is rejected", () => {
  assert.match(err(JSON.stringify([{ tag: "tl-dr", items: ["fine", "  "] }])), /empty item/);
});

test("a shipped-list without a title is rejected", () => {
  assert.match(
    err(JSON.stringify([{ tag: "shipped-list", items: ["a"] }])),
    /no title/,
  );
});

test("output over the block cap is rejected", () => {
  const many = Array.from({ length: MAX_MODEL_BLOCKS + 1 }, () => ({
    tag: "p",
    text: "Padding paragraph.",
  }));
  assert.match(err(JSON.stringify(many)), new RegExp(`cap is ${MAX_MODEL_BLOCKS}`));
});

// ---------------------------------------------------------------------------
// Assembly: facts are spliced in, never generated
// ---------------------------------------------------------------------------

const STAT: Block = { tag: "stat-callout", stats: [{ value: "112", label: "attended" }] };
const TESTIMONIALS: Block = {
  tag: "testimonial-row",
  items: [{ quote: "Worth it.", name: "Sam Rivera" }],
};
const TEASER: Block = { tag: "cta-button", label: "Read on", href: "/post/x", tone: "primary" };

test("stats land after the opening beat, not at the very top", () => {
  const blocks = assembleRecap({
    modelBlocks: [
      { tag: "p", text: "One." },
      { tag: "p", text: "Two." },
      { tag: "p", text: "Three." },
    ],
    statBlock: STAT,
    testimonialBlock: TESTIMONIALS,
    teaserBlock: TEASER,
  });
  assert.deepEqual(blocks.map((b) => b.tag), [
    "p",
    "p",
    "stat-callout",
    "p",
    "testimonial-row",
    "cta-button",
  ]);
});

test("the teaser is always last", () => {
  const blocks = assembleRecap({
    modelBlocks: [{ tag: "p", text: "Only." }],
    statBlock: STAT,
    testimonialBlock: TESTIMONIALS,
    teaserBlock: TEASER,
  });
  assert.equal(blocks[blocks.length - 1].tag, "cta-button");
});

test("suppressed stats and testimonials simply do not appear", () => {
  const blocks = assembleRecap({
    modelBlocks: [{ tag: "p", text: "Only." }],
    statBlock: null,
    testimonialBlock: null,
    teaserBlock: TEASER,
  });
  assert.deepEqual(blocks.map((b) => b.tag), ["p", "cta-button"]);
});

test("a recap with no post to link to still assembles", () => {
  const blocks = assembleRecap({
    modelBlocks: [{ tag: "p", text: "Only." }],
    statBlock: STAT,
    testimonialBlock: null,
    teaserBlock: null,
  });
  assert.deepEqual(blocks.map((b) => b.tag), ["p", "stat-callout"]);
});

test("a single model block still gets its stats after it", () => {
  const blocks = assembleRecap({
    modelBlocks: [{ tag: "p", text: "Only." }],
    statBlock: STAT,
    testimonialBlock: null,
    teaserBlock: null,
  });
  assert.equal(blocks[0].tag, "p");
  assert.equal(blocks[1].tag, "stat-callout");
});
