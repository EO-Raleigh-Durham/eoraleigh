import { afterAll, describe, expect, it, vi } from "vitest";

import { formatDate, formatHours, initials, searchFold } from "./format";

// These cases are written as Asia/Bangkok readings (UTC+7, no daylight
// saving), so the chapter's timezone is pinned before anything imports it.
vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_CHAPTER_TIME_ZONE", "Asia/Bangkok");
});
afterAll(() => {
  vi.unstubAllEnvs();
});

// Characterization tests. Nine screens used to carry their own day-month
// formatter; they now call `formatDate`, so the exact rendered string is part
// of the contract and a change here is a visible change on those screens.
describe("formatDate", () => {
  it("renders a date-only ISO string in the en-US month-day-year order", () => {
    expect(formatDate("2026-09-05")).toBe("Sep 5, 2026");
  });

  it("renders a full timestamp the same way", () => {
    expect(formatDate("2026-09-05T13:45:00.000Z")).toBe("Sep 5, 2026");
  });

  it("reads a timestamp as a business-day date, the same on a UTC server and a Bangkok browser", () => {
    // 20:00 UTC is already the 21st in Asia/Bangkok; before this the server said
    // Sep 20 and the browser Sep 21, and React flagged the text mismatch on hydration.
    expect(formatDate("2026-09-20T20:00:00.000Z")).toBe("Sep 21, 2026");
    expect(formatDate("2026-09-20T16:59:59.000Z")).toBe("Sep 20, 2026");
  });

  // The em dash is the kernel's own empty marker. Screens that showed "" or
  // "-" keep their marker at the call site rather than changing this.
  it("returns an em dash for null, undefined and the empty string", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("")).toBe("—");
  });

  it("returns an em dash for an unparseable value", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });
});

// Pinned ahead of the sidebar/collage locals collapsing onto this function:
// the rule is first word + last word, which differs from first-two/last-two
// for three-plus-word Family-first names.
describe("initials", () => {
  it("takes the first and last word of a three-word name", () => {
    expect(initials("Nguyen Van A")).toBe("NA");
  });

  it("keeps two letters of a one-word name, as every replaced local did", () => {
    expect(initials("Mai")).toBe("MA");
    expect(initials("A")).toBe("A");
  });

  it("skips the middle words of a four-word name", () => {
    expect(initials("Nguyễn Văn An")).toBe("NA");
  });

  it("returns the empty string for an empty name", () => {
    expect(initials("")).toBe("");
  });
});

// Pinned when three portal screens' identical `fmtHours` collapsed onto this.
describe("formatHours", () => {
  it("rounds to one decimal", () => {
    expect(formatHours(1.25)).toBe("1.3");
  });
  it("drops a trailing zero decimal", () => {
    expect(formatHours(2)).toBe("2");
  });
  it("groups thousands in en-US", () => {
    expect(formatHours(1234.56)).toBe("1,234.6");
  });
});

describe("searchFold", () => {
  it("strips accents and folds đ so ascii typing matches", () => {
    expect(searchFold("Đặng Phương X")).toBe("dang phuong x");
    expect(searchFold("Lê Đình Y")).toBe("le dinh y");
    expect(searchFold("Nghiêm Cẩm Việt Z")).toBe("nghiem cam viet z");
  });
  it("is a plain lower-case on ascii", () => {
    expect(searchFold("New York City")).toBe("new york city");
  });
});
