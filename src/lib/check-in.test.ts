import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCheckInRoster,
  checkInEligibility,
  checkInTotals,
  maskEmail,
  normalizeSearchText,
  reconcileCheckInCandidate,
  searchCheckInCandidates,
} from "./check-in.ts";

const registrations = [
  {
    id: "active",
    status: "registered" as const,
    guest_count: 1,
    checked_in_at: null,
    waiver_accepted_at: null,
    review_classification: "normal" as const,
    person: { name: "Nguyễn Thử", email: "TH@Example.com" },
    attendees: [{ full_name: "Trần Minh", email: "minh@example.com" }],
    ticket_type: { name: "EO Example Member" },
  },
  {
    id: "blocked",
    status: "cancelled" as const,
    guest_count: 0,
    checked_in_at: null,
    waiver_accepted_at: "2026-07-01T00:00:00.000Z",
    review_classification: "normal" as const,
    person: { name: "Nguyen Thu", email: "other@example.com" },
    attendees: [],
    ticket_type: null,
  },
  {
    id: "attended",
    status: "attended" as const,
    guest_count: 2,
    checked_in_at: "2026-07-22T00:00:00.000Z",
    waiver_accepted_at: "2026-07-01T00:00:00.000Z",
    review_classification: "normal" as const,
    person: { name: null, email: "checked@example.com" },
    attendees: [],
    ticket_type: { name: "Guest" },
  },
  {
    id: "spam",
    status: "registered" as const,
    guest_count: 9,
    checked_in_at: null,
    waiver_accepted_at: null,
    review_classification: "spam" as const,
    person: { name: "Spam Person", email: "spam@example.com" },
    attendees: [],
    ticket_type: null,
  },
];

test("normalizes accented names and whitespace for search", () => {
  assert.equal(normalizeSearchText("  Nguyễn   THỬ "), "nguyen thu");
});

test("builds a slim roster and excludes spam", () => {
  const roster = buildCheckInRoster(registrations);
  assert.deepEqual(roster.map((candidate) => candidate.id), ["active", "blocked", "attended"]);
  assert.equal(roster[0].displayName, "Nguyễn Thử");
  assert.equal(roster[0].displayEmail, "T*@example.com");
  assert.equal("reviewClassification" in roster[0], false);
});

test("searches primary and named group attendees without accents", () => {
  const roster = buildCheckInRoster(registrations);
  assert.deepEqual(searchCheckInCandidates(roster, "nguyen thu").map((row) => row.id), [
    "active",
    "blocked",
  ]);
  assert.deepEqual(searchCheckInCandidates(roster, "TRAN MINH").map((row) => row.id), [
    "active",
  ]);
  assert.deepEqual(searchCheckInCandidates(roster, "@EXAMPLE.COM").map((row) => row.id), [
    "active",
    "attended",
    "blocked",
  ]);
});

test("ranks active registrations ahead of blocked matches", () => {
  const roster = buildCheckInRoster(registrations);
  const matches = searchCheckInCandidates(roster, "nguyen thu");
  assert.equal(matches[0].status, "registered");
  assert.equal(matches[1].status, "cancelled");
});

test("masks email for display without losing a recognizable domain", () => {
  assert.equal(maskEmail("h@example.com"), "h*@example.com");
  assert.equal(maskEmail("harley@example.com"), "h*****@example.com");
  assert.equal(maskEmail("not-an-email"), "Hidden email");
});

test("calculates confirmed, checked-in, and expected attendee totals", () => {
  assert.deepEqual(checkInTotals(buildCheckInRoster(registrations)), {
    confirmed: 5,
    checkedIn: 3,
    expected: 2,
  });
});

test("reconciles changed registrations and appends walk-up registrations", () => {
  const roster = buildCheckInRoster(registrations);
  const attended = {
    ...roster[0],
    status: "attended" as const,
    checkedInAt: "2026-07-22T01:00:00.000Z",
    searchTerms: ["server-only"],
  };
  const updated = reconcileCheckInCandidate(roster, attended);
  assert.equal(updated[0].status, "attended");
  assert.deepEqual(updated[0].searchTerms, roster[0].searchTerms);

  const walkUp = {
    ...attended,
    id: "walk-up",
    displayName: "Walk Up",
    searchTerms: ["walk up", "walkup@example.com"],
  };
  const appended = reconcileCheckInCandidate(updated, walkUp);
  assert.equal(appended.at(-1)?.id, "walk-up");
  assert.deepEqual(checkInTotals(appended), {
    confirmed: 7,
    checkedIn: 7,
    expected: 0,
  });
});

test("describes ready, already, and blocked check-in states", () => {
  const [ready, blocked, attended] = buildCheckInRoster(registrations);
  assert.deepEqual(checkInEligibility(ready), { kind: "ready" });
  assert.deepEqual(checkInEligibility(attended), { kind: "already" });
  assert.deepEqual(checkInEligibility(blocked), {
    kind: "blocked",
    reason: "This registration is cancelled.",
  });
  assert.deepEqual(checkInEligibility({ status: "pending_payment" }), {
    kind: "blocked",
    reason: "Payment is not complete.",
  });
  assert.deepEqual(checkInEligibility({ status: "waitlisted" }), {
    kind: "blocked",
    reason: "This registration is still waitlisted.",
  });
  assert.deepEqual(checkInEligibility({ status: "no_show" }), {
    kind: "blocked",
    reason: "This registration is marked as a no-show.",
  });
});
