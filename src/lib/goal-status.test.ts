import assert from "node:assert/strict";
import test from "node:test";
import { fiscalYearElapsed, forumDaysAverage, goalStatus } from "./goal-status.ts";

test("fiscal year elapsed runs from 1 July", () => {
  assert.equal(fiscalYearElapsed("2026-07-01", 2026), 0);
  assert.equal(Math.round(fiscalYearElapsed("2026-11-20", 2026) * 100), 39);
  assert.equal(fiscalYearElapsed("2027-08-01", 2026), 1);
});

test("cumulative goals are judged against where they should be by now", () => {
  assert.equal(goalStatus(15, 100, { kind: "cumulative" }, 0.39), "off_track"); // prospects
  assert.equal(goalStatus(102323, 132960, { kind: "cumulative" }, 0.39), "on_track"); // revenue
  assert.equal(goalStatus(35, 100, { kind: "cumulative" }, 0.39), "at_risk");
  assert.equal(goalStatus(100, 100, { kind: "cumulative" }, 0.5), "done");
});

test("level goals are judged against the target itself", () => {
  assert.equal(goalStatus(40, 70, { kind: "level" }, 0.39), "off_track"); // engagement
  assert.equal(goalStatus(4.1, 4.5, { kind: "level" }, 0.39), "at_risk"); // Learning rating
  assert.equal(goalStatus(3.8, 3, { kind: "level" }, 0.39), "done"); // events per member
});

test("growth goals follow the straight line from the starting count", () => {
  assert.equal(goalStatus(40, 65, { kind: "growth", baseline: 38 }, 0.39), "at_risk");
  assert.equal(goalStatus(49, 65, { kind: "growth", baseline: 38 }, 0.39), "on_track");
  assert.equal(goalStatus(38, 65, { kind: "growth", baseline: 38 }, 0.39), "off_track");
});

test("ceiling goals are on track at or under the target", () => {
  assert.equal(goalStatus(85, 90, { kind: "ceiling" }, 0.39), "on_track");
  assert.equal(goalStatus(100, 90, { kind: "ceiling" }, 0.39), "at_risk");
  assert.equal(goalStatus(120, 90, { kind: "ceiling" }, 0.39), "off_track");
});

test("forum average matches the 20 Nov 2026 roster review", () => {
  const today = "2026-11-20";
  const r = forumDaysAverage(
    [
      { clockStart: "2026-05-18", forumStatus: "placed", placedOn: "2026-07-17", primary: true }, // Yen, 60
      { clockStart: "2026-05-31", forumStatus: "placed", placedOn: "2026-07-30", primary: true }, // Trang, 60
      { clockStart: "2026-04-28", forumStatus: "placed", placedOn: "2026-07-20", primary: true }, // Trung, 83
      { clockStart: "2026-09-01", forumStatus: null, placedOn: null, primary: true }, // Minh Anh, 80 so far
      { clockStart: "2026-07-01", forumStatus: null, placedOn: null, primary: true }, // Daniel, 142 so far
      { clockStart: "2026-06-10", forumStatus: "placed", placedOn: null, primary: true }, // Quan, no date
      { clockStart: "2026-07-01", forumStatus: "no_forum", placedOn: null, primary: true }, // John, opted out
      { clockStart: "2026-02-13", forumStatus: "other_chapter", placedOn: null, primary: false }, // secondary
      { clockStart: "2016-07-01", forumStatus: "placed", placedOn: null, primary: true }, // long-standing member
    ],
    today,
  );
  assert.deepEqual(r, { average: 85, counted: 5, undated: 1 });
});

test("no new members gives no average", () => {
  assert.deepEqual(forumDaysAverage([], "2026-11-20"), { average: null, counted: 0, undated: 0 });
});
