import assert from "node:assert/strict";
import test from "node:test";
import {
  computeRecapStats,
  countAttended,
  countCompanies,
  statCalloutBlock,
  MIN_RATING_RESPONSES,
  type RecapFeedbackSummary,
  type RecapRegistration,
} from "./event-recap-stats.ts";

function reg(
  overrides: Partial<RecapRegistration> = {},
): RecapRegistration {
  return { checked_in_at: "2026-07-24T12:00:00Z", ...overrides };
}

function feedback(
  overrides: Partial<RecapFeedbackSummary> = {},
): RecapFeedbackSummary {
  return {
    responses: 34,
    eventValueRating: 4.6,
    growthRating: 4.2,
    eventValueResponses: 34,
    growthResponses: 30,
    ...overrides,
  };
}

function statFor(result: ReturnType<typeof computeRecapStats>, key: string) {
  return result.stats.find((s) => s.key === key) ?? null;
}

function suppressedKeys(result: ReturnType<typeof computeRecapStats>) {
  return result.suppressed.map((s) => s.key).sort();
}

// ---------------------------------------------------------------------------
// Attendance: check-in only, no registered-count fallback
// ---------------------------------------------------------------------------

test("attendance counts only checked-in registrations", () => {
  const result = computeRecapStats(
    [reg(), reg(), reg({ checked_in_at: null })],
    feedback(),
  );
  assert.equal(statFor(result, "attended")?.value, "2");
});

test("a legacy event with registrations but no check-ins publishes no attendance number", () => {
  const registrations = Array.from({ length: 80 }, () =>
    reg({ checked_in_at: null }),
  );
  const result = computeRecapStats(registrations, feedback());

  assert.equal(statFor(result, "attended"), null);
  assert.match(
    result.suppressed.find((s) => s.key === "attended")?.reason ?? "",
    /never published as attendance/,
  );
});

test("attendance sums each checked-in registration's party size, not just the row count", () => {
  const result = computeRecapStats(
    [
      reg({ guest_count: 2 }),
      reg({ guest_count: 0 }),
      reg({ guest_count: 3 }),
      reg({ checked_in_at: null, guest_count: 5 }),
    ],
    feedback(),
  );
  // 3 checked-in rows: (1+2) + (1+0) + (1+3) = 8. The uncounted-in row's
  // guests never count, regardless of party size.
  assert.equal(statFor(result, "attended")?.value, "8");
});

test("spam registrations never inflate attendance", () => {
  const result = computeRecapStats(
    [reg(), reg({ review_classification: "spam" })],
    feedback(),
  );
  assert.equal(statFor(result, "attended")?.value, "1");
});

test("the attended label is singular for one person and does not claim membership", () => {
  const result = computeRecapStats([reg()], feedback());
  assert.equal(statFor(result, "attended")?.label, "attendee");
});

test("the attended label does not overstate guests as members", () => {
  const result = computeRecapStats([reg({ guest_count: 3 })], feedback());
  assert.equal(statFor(result, "attended")?.value, "4");
  assert.equal(statFor(result, "attended")?.label, "attendees");
});

// ---------------------------------------------------------------------------
// Ratings: minimum response count, always shown with the count
// ---------------------------------------------------------------------------

test("a rating below the response floor is suppressed", () => {
  const result = computeRecapStats(
    [reg()],
    feedback({ eventValueRating: 2.0, eventValueResponses: MIN_RATING_RESPONSES - 1 }),
  );
  assert.equal(statFor(result, "event_value_rating"), null);
});

test("a rating exactly at the floor is published", () => {
  const result = computeRecapStats(
    [reg()],
    feedback({ eventValueResponses: MIN_RATING_RESPONSES }),
  );
  assert.equal(statFor(result, "event_value_rating")?.value, "4.6");
});

test("a rating always carries its response count", () => {
  const result = computeRecapStats([reg()], feedback({ eventValueResponses: 34 }));
  assert.equal(
    statFor(result, "event_value_rating")?.label,
    "event value, from 34 responses",
  );
});

test("a whole-number rating still renders to one decimal", () => {
  const result = computeRecapStats([reg()], feedback({ eventValueRating: 5 }));
  assert.equal(statFor(result, "event_value_rating")?.value, "5.0");
});

test("missing feedback suppresses both ratings rather than throwing", () => {
  const result = computeRecapStats([reg()], null);
  assert.equal(statFor(result, "event_value_rating"), null);
  assert.equal(statFor(result, "growth_rating"), null);
  assert.equal(statFor(result, "attended")?.value, "1");
});

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

test("companies are counted distinctly across checked-in attendees", () => {
  const result = computeRecapStats(
    [
      reg({ attendees: [{ company: "Vertex Logistics" }, { company: "Harbor Foods" }] }),
      reg({ attendees: [{ company: "Delta Interiors" }] }),
    ],
    feedback(),
  );
  assert.equal(statFor(result, "companies")?.value, "3");
});

test("company names differing only by suffix or case count once", () => {
  assert.equal(
    countCompanies([
      reg({ attendees: [{ company: "ACME Ltd." }] }),
      reg({ attendees: [{ company: "acme ltd" }] }),
      reg({ attendees: [{ company: "  ACME   Limited " }] }),
    ]),
    1,
  );
});

test("companies from people who did not check in are not counted", () => {
  assert.equal(
    countCompanies([
      reg({ attendees: [{ company: "Vertex" }] }),
      reg({ checked_in_at: null, attendees: [{ company: "Ghost Co" }] }),
    ]),
    1,
  );
});

test("fewer than three companies is suppressed", () => {
  const result = computeRecapStats(
    [reg({ attendees: [{ company: "Vertex" }, { company: "Harbor Foods" }] })],
    feedback(),
  );
  assert.equal(statFor(result, "companies"), null);
});

test("blank and null company names are ignored", () => {
  assert.equal(
    countCompanies([reg({ attendees: [{ company: null }, { company: "   " }] })]),
    0,
  );
});

// ---------------------------------------------------------------------------
// The all-suppressed case
// ---------------------------------------------------------------------------

test("an event with no usable data produces no stats and no block", () => {
  const result = computeRecapStats([reg({ checked_in_at: null })], null);

  assert.deepEqual(result.stats, []);
  assert.deepEqual(suppressedKeys(result), [
    "attended",
    "companies",
    "event_value_rating",
    "growth_rating",
  ]);
  assert.equal(statCalloutBlock(result), null);
});

test("every suppression carries a reason a human can act on", () => {
  const result = computeRecapStats([], null);
  for (const note of result.suppressed) {
    assert.ok(note.reason.length > 0, `${note.key} has no reason`);
  }
});

test("an empty registration list does not throw", () => {
  assert.equal(countAttended([]), 0);
  assert.equal(countCompanies([]), 0);
});

// ---------------------------------------------------------------------------
// Block assembly
// ---------------------------------------------------------------------------

test("the stat block carries only published stats, in order", () => {
  const result = computeRecapStats(
    [
      reg({ attendees: [{ company: "A" }] }),
      reg({ attendees: [{ company: "B" }] }),
      reg({ attendees: [{ company: "C" }] }),
    ],
    feedback(),
  );
  const block = statCalloutBlock(result);

  assert.equal(block?.tag, "stat-callout");
  assert.deepEqual(
    block?.stats.map((s) => s.value),
    ["3", "4.6", "4.2", "3"],
  );
});
