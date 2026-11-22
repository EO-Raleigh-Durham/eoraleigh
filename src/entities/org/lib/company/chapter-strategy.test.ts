import { describe, expect, it } from "vitest";
import { parseChapterStrategy, splitCommitment, splitNot } from "./chapter-strategy";

const MD = `## Overview

A chapter where members belong.

## We are

We are a chapter with a strong identity.

## We are not

We are not a networking group, a status symbol, or an executive organization.

## Themes

- 2026: Deepen belonging

## Pillars

### Leadership

1. Succession: every key role has a plan.
2. A board's purpose is to create a joyful learning environment.

### Growth

1. Retention: a clear renewal target.

## Notes

Some prose.
`;

describe("parseChapterStrategy", () => {
  it("designs the sections the chapter writes and keeps the rest as prose", async () => {
    const s = await parseChapterStrategy(MD);
    expect(s.overview).toBe("A chapter where members belong.");
    expect(s.statements).toEqual([{ label: "We are", body: "We are a chapter with a strong identity." }]);
    expect(s.notList?.items).toEqual(["a networking group", "a status symbol", "an executive organization"]);
    expect(s.themes).toEqual([{ year: 2026, title: "Deepen belonging" }]);
    expect(s.pillarsHeading).toBe("Pillars");
    expect(s.pillars.map((p) => [p.title, p.items.length])).toEqual([
      ["Leadership", 2],
      ["Growth", 1],
    ]);
    expect(s.extras.map((x) => x.heading)).toEqual(["Notes"]);
  });
});

describe("splitCommitment", () => {
  it("takes a short lead-in as the label", () => {
    expect(splitCommitment("Succession: every key role has a plan.")).toEqual({ label: "Succession", text: "Every key role has a plan." });
  });
  it("leaves a sentence without a lead-in whole", () => {
    expect(splitCommitment("A board's purpose is joy.")).toEqual({ label: null, text: "A board's purpose is joy." });
  });
});

describe("splitNot", () => {
  it("returns one item when nothing is listed", () => {
    expect(splitNot("We are not a club.")).toEqual(["a club"]);
  });
});
