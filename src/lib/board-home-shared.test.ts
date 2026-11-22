import assert from "node:assert/strict";
import test from "node:test";
import { goalValueText, meetingsSince, myTools, nextBoardMeeting } from "./board-home-shared.ts";

test("next board meeting is the second Tuesday on or after today", () => {
  assert.equal(nextBoardMeeting("2026-11-20"), "2026-12-08");
  assert.equal(nextBoardMeeting("2026-11-10"), "2026-11-10");
  assert.equal(nextBoardMeeting("2026-12-09"), "2027-01-12");
  assert.equal(nextBoardMeeting("2026-07-01"), "2026-07-14");
});

test("my tools merge every role without repeats", () => {
  const tools = myTools(["president-elect", "member-engagement"]);
  assert.deepEqual(tools.map((t) => t.label), ["Strategy", "Goals", "Member Engagement", "Member Roster", "Surveys"]);
  assert.deepEqual(myTools(["unknown"]), []);
});

test("goal values read the way the board talks about them", () => {
  assert.equal(goalValueText(40, 65, "members", "up"), "40 / 65 members");
  assert.equal(goalValueText(106340, 132960, "usd", "up"), "$106k / $133k");
  assert.equal(goalValueText(39, 70, "%", "up"), "39% / 70%");
  assert.equal(goalValueText(0, 30000, "usd", "up"), "$0 / $30k");
  assert.equal(goalValueText(84, 90, "days", "down"), "84 days, target 90 or under");
  assert.equal(goalValueText(1, 0, "issues", "down"), "1 issues, target 0");
  assert.equal(goalValueText(4.1, 4.5, "out of 5", "up"), "4.1 / 4.5 out of 5");
});

test("meetings since counts the second Tuesdays that have passed", () => {
  assert.equal(meetingsSince("2026-11-10", "2026-11-20"), 1); // raised at the 10 Nov meeting
  assert.equal(meetingsSince("2026-11-11", "2026-11-20"), 0);
  assert.equal(meetingsSince("2026-07-13", "2026-11-20"), 5); // Jul 14, Aug 11, Sep 8, Oct 13, Nov 10
  assert.equal(meetingsSince("2026-07-13T00:00:00+00:00", "2026-12-08"), 6);
});
