import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and dashes plain titles", () => {
    expect(slugify("AI Workshop — Lisbon")).toBe("ai-workshop-lisbon");
  });
  it("folds accents and tone marks", () => {
    expect(slugify("Nguyễn Thị X")).toBe("nguyen-thi-x");
    expect(slugify("Hồ Chí Y")).toBe("ho-chi-y");
  });
  it("replaces đ/Đ, which NFD does not decompose", () => {
    expect(slugify("Đà Lạt đẹp")).toBe("da-lat-dep");
  });
  it("collapses punctuation runs and trims edge dashes", () => {
    expect(slugify("  --Hello,   World!!  ")).toBe("hello-world");
  });
  it("returns an empty string for empty or symbol-only input", () => {
    expect(slugify("")).toBe("");
    expect(slugify("!!! ***")).toBe("");
  });
  it("caps at 80 by default without leaving a trailing dash", () => {
    const long = Array.from({ length: 30 }, () => "abc").join(" ");
    const out = slugify(long);
    expect(out.length).toBeLessThanOrEqual(80);
    expect(out.endsWith("-")).toBe(false);
  });
  it("honours a caller-supplied cap", () => {
    expect(slugify("one two three", 7)).toBe("one-two");
  });
});
