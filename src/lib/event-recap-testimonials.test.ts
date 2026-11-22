import assert from "node:assert/strict";
import test from "node:test";
import {
  selectTestimonials,
  testimonialBlock,
  teaserBlock,
  TEASER_LABEL,
  MIN_QUOTE_LENGTH,
  MAX_QUOTE_LENGTH,
  type TestimonialCandidate,
} from "./event-recap-testimonials.ts";

const GOOD_QUOTE =
  "The breakout on AI operations was the most useful hour I have spent in a boardroom this year.";

let seq = 0;
function candidate(
  overrides: Partial<TestimonialCandidate> = {},
): TestimonialCandidate {
  seq += 1;
  return {
    personId: `person-${seq}`,
    lovedText: GOOD_QUOTE,
    rating: 5,
    name: "Sam Rivera",
    role: "CEO, Vertex Logistics",
    photoUrl: "https://example.test/photo.jpg",
    isActiveMember: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Who is eligible
// ---------------------------------------------------------------------------

test("non-members are never quoted", () => {
  const chosen = selectTestimonials([
    candidate({ isActiveMember: false, name: "Guest Person" }),
  ]);
  assert.deepEqual(chosen, []);
});

test("a quote with no name is dropped rather than published anonymously", () => {
  assert.deepEqual(selectTestimonials([candidate({ name: null })]), []);
  assert.deepEqual(selectTestimonials([candidate({ name: "   " })]), []);
});

test("a missing quote is dropped, since the quote is the whole point", () => {
  assert.deepEqual(selectTestimonials([candidate({ lovedText: null })]), []);
});

test("a quote under the length floor is dropped", () => {
  const short = "x".repeat(MIN_QUOTE_LENGTH - 1);
  assert.deepEqual(selectTestimonials([candidate({ lovedText: short })]), []);
});

test("a quote at exactly the length floor is kept", () => {
  const exact = "x".repeat(MIN_QUOTE_LENGTH);
  assert.equal(selectTestimonials([candidate({ lovedText: exact })]).length, 1);
});

test("an over-long quote is skipped rather than truncated", () => {
  const long = "x".repeat(MAX_QUOTE_LENGTH + 1);
  assert.deepEqual(selectTestimonials([candidate({ lovedText: long })]), []);
});

test("whitespace around a quote does not count toward its length", () => {
  const padded = `   ${"x".repeat(MIN_QUOTE_LENGTH - 2)}   `;
  assert.deepEqual(selectTestimonials([candidate({ lovedText: padded })]), []);
});

// ---------------------------------------------------------------------------
// Selection and ordering
// ---------------------------------------------------------------------------

test("at most three testimonials are returned", () => {
  const many = Array.from({ length: 8 }, () => candidate());
  assert.equal(selectTestimonials(many).length, 3);
});

test("fewer than three is fine and is never padded", () => {
  assert.equal(selectTestimonials([candidate(), candidate()]).length, 2);
});

test("no qualifying quotes yields an empty list, not a placeholder", () => {
  assert.deepEqual(selectTestimonials([candidate({ lovedText: "Great!" })]), []);
});

test("higher ratings are chosen first", () => {
  const chosen = selectTestimonials(
    [
      candidate({ rating: 3, name: "Three" }),
      candidate({ rating: 5, name: "Five" }),
      candidate({ rating: 4, name: "Four" }),
    ],
    2,
  );
  assert.deepEqual(chosen.map((t) => t.name), ["Five", "Four"]);
});

test("at equal ratings the more substantive quote wins", () => {
  const chosen = selectTestimonials(
    [
      candidate({ rating: 5, name: "Short", lovedText: "x".repeat(50) }),
      candidate({ rating: 5, name: "Long", lovedText: "y".repeat(200) }),
    ],
    1,
  );
  assert.deepEqual(chosen.map((t) => t.name), ["Long"]);
});

test("at equal rating and length a member with a photo is preferred", () => {
  const chosen = selectTestimonials(
    [
      candidate({ name: "NoPhoto", photoUrl: null }),
      candidate({ name: "HasPhoto" }),
    ],
    1,
  );
  assert.deepEqual(chosen.map((t) => t.name), ["HasPhoto"]);
});

test("one quote per person, even when they left several", () => {
  const chosen = selectTestimonials([
    candidate({ personId: "same", name: "Repeat One" }),
    candidate({ personId: "same", name: "Repeat Two" }),
    candidate({ personId: "other", name: "Someone Else" }),
  ]);
  assert.equal(chosen.length, 2);
});

test("selection is stable for identical input", () => {
  const input = [
    candidate({ personId: "b", name: "B" }),
    candidate({ personId: "a", name: "A" }),
  ];
  assert.deepEqual(
    selectTestimonials(input, 1),
    selectTestimonials([...input].reverse(), 1),
  );
});

// ---------------------------------------------------------------------------
// Shape of the output
// ---------------------------------------------------------------------------

test("a member with no photo still produces a testimonial", () => {
  const [chosen] = selectTestimonials([candidate({ photoUrl: null })]);
  assert.equal(chosen.name, "Sam Rivera");
  assert.equal(chosen.photoUrl, undefined);
});

test("optional fields are omitted rather than set to null", () => {
  const [chosen] = selectTestimonials([
    candidate({ photoUrl: null, role: null, rating: null }),
  ]);
  assert.equal("photoUrl" in chosen, false);
  assert.equal("role" in chosen, false);
  assert.equal("rating" in chosen, false);
});

test("the quote is trimmed", () => {
  const [chosen] = selectTestimonials([
    candidate({ lovedText: `  ${GOOD_QUOTE}  ` }),
  ]);
  assert.equal(chosen.quote, GOOD_QUOTE);
});

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

test("no testimonials means no block at all", () => {
  assert.equal(testimonialBlock([]), null);
});

test("the block carries the chosen testimonials in order", () => {
  const chosen = selectTestimonials([candidate(), candidate()]);
  const block = testimonialBlock(chosen);
  assert.equal(block?.tag, "testimonial-row");
  assert.equal(block?.items.length, 2);
});

test("the teaser copy is fixed and points at the post", () => {
  const block = teaserBlock("lead-your-organization-ai-era");
  assert.deepEqual(block, {
    tag: "cta-button",
    label: TEASER_LABEL,
    href: "/post/lead-your-organization-ai-era",
    tone: "primary",
  });
  assert.equal(TEASER_LABEL, "For the full event gallery and learnings, click here");
});
