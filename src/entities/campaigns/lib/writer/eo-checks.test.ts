// The writer's word and brand-name checks as the chapter app sets them
// (scripts/edge8-sync/transform.mjs), in place of edge8's policy tests. The
// brand-name rule is read from the chapter config, so these cases configure
// an example chapter's names before anything imports it.
import { afterAll, describe, expect, it, vi } from "vitest";
import { bannedLanguageError, brandNameError, emDashError } from "./checks";

vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_ORG_NAME", "EO Example");
  vi.stubEnv("NEXT_PUBLIC_CHAPTER_SHORT_NAME", "EOEX");
});
afterAll(() => {
  vi.unstubAllEnvs();
});

describe("the chapter writer checks", () => {
  it("allows hiring, recruiting and audit language, which founders write about", () => {
    expect(bannedLanguageError("We were hiring our first CFO, recruiting in Lisbon, after an audit.")).toBeNull();
  });

  it("writes the chapter's name one way", () => {
    expect(brandNameError("Join EO EX for RISE 4.")).toMatch(/EO Example/);
    expect(brandNameError("The EOEX board met.")).toMatch(/EO Example/);
    expect(brandNameError("Eo Example members met.")).toMatch(/EO Example/);
    expect(brandNameError("EO Example members met at eoexample.org.")).toBeNull();
  });

  it("still refuses an em dash", () => {
    expect(emDashError("One room — eight presidents.")).not.toBeNull();
    expect(emDashError("One room, eight presidents.")).toBeNull();
  });
});
