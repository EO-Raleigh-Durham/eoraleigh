import assert from "node:assert/strict";
import test from "node:test";
import {
  comingMonths,
  dayLabel,
  forumAccess,
  meetingIcs,
  monthLabel,
  nextMeeting,
  timeLabel,
  validateMeeting,
  type ForumMeeting,
} from "./forum-dates.ts";
import { fyStartForDate } from "./fiscal-year.ts";

const FORUM = "11111111-1111-4111-8111-111111111111";
const OTHER_FORUM = "22222222-2222-4222-8222-222222222222";
const MODERATOR = "33333333-3333-4333-8333-333333333333";
const MEMBER = "44444444-4444-4444-8444-444444444444";

test("only members of the forum see its dates, and only the moderator sets them", () => {
  const base = { forumId: FORUM, moderatorPersonId: MODERATOR };
  assert.deepEqual(forumAccess({ ...base, personId: MODERATOR, personForumId: FORUM }), { canView: true, canSet: true });
  assert.deepEqual(forumAccess({ ...base, personId: MEMBER, personForumId: FORUM }), { canView: true, canSet: false });
  // A member of another forum.
  assert.deepEqual(forumAccess({ ...base, personId: MEMBER, personForumId: OTHER_FORUM }), { canView: false, canSet: false });
  // A board member or staff user who is not placed in any forum.
  assert.deepEqual(forumAccess({ ...base, personId: MEMBER, personForumId: null }), { canView: false, canSet: false });
  // A sign-in with no member record.
  assert.deepEqual(forumAccess({ ...base, personId: null, personForumId: null }), { canView: false, canSet: false });
});

test("a moderator who has left the forum can no longer set its dates", () => {
  assert.deepEqual(
    forumAccess({ forumId: FORUM, moderatorPersonId: MODERATOR, personId: MODERATOR, personForumId: OTHER_FORUM }),
    { canView: false, canSet: false },
  );
  // A forum with no moderator: nobody can set dates.
  assert.equal(forumAccess({ forumId: FORUM, moderatorPersonId: null, personId: MEMBER, personForumId: FORUM }).canSet, false);
});

test("coming months start at the current month and roll over the year", () => {
  assert.deepEqual(comingMonths("2026-11-26"), [
    "2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01", "2027-03-01", "2027-04-01",
  ]);
  assert.deepEqual(comingMonths("2027-01-31", 2), ["2027-01-01", "2027-02-01"]);
});

test("labels read naturally", () => {
  assert.equal(monthLabel("2027-03-01"), "March 2027");
  assert.equal(dayLabel("2027-03-12"), "Fri 12 Mar 2027");
  assert.equal(timeLabel("18:30"), "6:30 PM");
  assert.equal(timeLabel("00:05"), "12:05 AM");
  assert.equal(timeLabel("12:00"), "12:00 PM");
});

test("a meeting must be a real, future date inside its own coming month", () => {
  const today = "2026-11-26";
  const good = { month: "2026-12-01", date: "2026-12-10", time: "18:00", place: "  Office  " };
  assert.deepEqual(validateMeeting(good, today), {
    ok: true,
    value: { month: "2026-12-01", meetsOn: "2026-12-10", startTime: "18:00", place: "Office" },
  });
  assert.deepEqual(validateMeeting({ ...good, place: " " }, today), {
    ok: true,
    value: { month: "2026-12-01", meetsOn: "2026-12-10", startTime: "18:00", place: null },
  });
  const error = (patch: Partial<typeof good>) => {
    const result = validateMeeting({ ...good, ...patch }, today);
    return result.ok ? "" : result.error;
  };
  assert.match(error({ month: "2026-10-01", date: "2026-10-10" }), /coming months/);
  assert.match(error({ month: "2027-05-01", date: "2027-05-10" }), /coming months/);
  assert.match(error({ date: "2027-01-10" }), /December 2026/);
  assert.match(error({ date: "2026-12-32" }), /Pick a date/);
  assert.match(error({ date: "" }), /Pick a date/);
  assert.match(error({ month: "2026-11-01", date: "2026-11-31" }), /Pick a date/);
  assert.match(error({ month: "2026-11-01", date: "2026-11-25" }), /already passed/);
  assert.match(error({ time: "25:00" }), /start time/);
  assert.match(error({ place: "x".repeat(201) }), /under 200/);
});

const meeting = (meetsOn: string): ForumMeeting => ({
  month: `${meetsOn.slice(0, 7)}-01`,
  meetsOn,
  startTime: "18:00",
  place: null,
  updatedAt: "2026-11-26T03:00:00.000Z",
});

test("the next meeting is the first one today or later", () => {
  const list = [meeting("2027-01-14"), meeting("2026-11-12"), meeting("2026-12-10")];
  assert.equal(nextMeeting(list, "2026-11-26")?.meetsOn, "2026-12-10");
  assert.equal(nextMeeting(list, "2026-12-10")?.meetsOn, "2026-12-10");
  assert.equal(nextMeeting(list, "2027-02-01"), null);
});

test("the calendar file keeps one stable entry per forum and month", () => {
  const ics = meetingIcs({
    forumId: FORUM,
    forumName: "Peak; Forum",
    meeting: { ...meeting("2026-12-10"), place: "Room 2, Tower A" },
    timeZone: "Asia/Bangkok",
    domain: "chapter.example.org",
    now: new Date("2026-11-26T04:00:00.000Z"),
  });
  assert.match(ics, new RegExp(`UID:forum-${FORUM}-2026-12@chapter\\.example\\.org\\r\\n`));
  assert.match(ics, /DTSTART;TZID=Asia\/Bangkok:20261210T180000\r\n/);
  assert.match(ics, /DURATION:PT4H\r\n/);
  assert.match(ics, /SUMMARY:Peak\\; Forum forum\r\n/);
  assert.match(ics, /LOCATION:Room 2\\, Tower A\r\n/);
  assert.match(ics, /DTSTAMP:20261126T040000Z\r\n/);
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
});

test("each month is set by the moderator for its own fiscal year", () => {
  // June 2027 belongs to the FY2026/27 moderator, July 2027 to the FY2027/28 one.
  const NEXT_MODERATOR = MEMBER;
  const byFyStart: Record<number, string> = { 2026: MODERATOR, 2027: NEXT_MODERATOR };
  const canSet = (personId: string, month: string) =>
    forumAccess({
      forumId: FORUM,
      personForumId: FORUM,
      personId,
      moderatorPersonId: byFyStart[fyStartForDate(month)],
    }).canSet;
  assert.equal(canSet(MODERATOR, "2026-12-01"), true);
  assert.equal(canSet(MODERATOR, "2027-06-01"), true);
  assert.equal(canSet(MODERATOR, "2027-07-01"), false);
  assert.equal(canSet(NEXT_MODERATOR, "2027-07-01"), true);
  assert.equal(canSet(NEXT_MODERATOR, "2027-06-01"), false);
});
