import assert from "node:assert/strict";
import test from "node:test";
import { projectGrowth, shareRemaining } from "./growth-projection.ts";

// FY2026/27 on 17 Nov 2026, from production data.
const base = {
  startMembers: 38,
  joinsYtd: 1,
  departuresYtd: 0,
  monthsElapsed: 4.6,
  finished: false,
  baselineChurnRate: 0.073,
  lastYearJoins: 10,
  lastYearShareRemaining: 1, // every dated FY25/26 win closed in Dec to Jun
  pipelineExpected: 2.3,
  leadsPerMonth: 3.3,
  conversionRate: 10 / 64,
  renewalRiskMembers: 15,
  riskLapseRate: 0.45,
  targetPct: 20,
};

test("headline repeats last year's pace on top of this year's joins", () => {
  const p = projectGrowth(base);
  const [pace, stretch, pipeline, downside] = p.scenarios;
  assert.deepEqual([pace.joins, pace.departures, pace.yearEndMembers, pace.netGrowthPct], [11, 3, 46, 21.1]);
  assert.equal(p.headline.key, "pace");
  assert.equal(p.verdict, "ahead", "21.1% against a 20% goal");
  assert.deepEqual([stretch.joins, stretch.yearEndMembers, stretch.netGrowthPct], [13, 48, 26.3]);
  // 2.3 weighted live prospects + 3.3 leads/month x 4.4 months x 15.6% = 4.6
  assert.equal(p.pipelineJoins, 5);
  assert.deepEqual([pipeline.joins, pipeline.yearEndMembers, pipeline.netGrowthPct], [6, 41, 7.9]);
  assert.deepEqual([downside.joins, downside.departures, downside.yearEndMembers, downside.netGrowthPct], [11, 7, 42, 10.5]);
});

test("what it takes: joins needed for the goal, and the leads to close the pipeline's gap", () => {
  const p = projectGrowth(base);
  // 20% of 38 -> 46 members; 46 - 38 + 3 departures = 11 joins; 10 still to come
  assert.equal(p.joinsNeeded, 11);
  assert.equal(p.joinsStillNeeded, 10);
  // the pipeline supports 5; 5 more at 15.6% conversion is 32 extra leads
  assert.equal(p.newLeadsNeeded, 32);
  assert.ok(p.joinsStillNeeded > p.pipelineJoins, "pace clears the goal, today's pipeline does not");
});

test("timing: last year's wins that landed later in the year shrink as the year goes on", () => {
  // FY25/26 wins: Dec x3, Jan x2, May, Jun x4 = months 5,5,5,6,6,10,11,11,11,11 since July
  const wins = [5.5, 5.5, 5.5, 6.5, 6.5, 10.5, 11.5, 11.5, 11.5, 11.5];
  assert.equal(shareRemaining(wins, 4.6), 1);
  assert.equal(shareRemaining(wins, 7), 0.5);
  assert.equal(shareRemaining(wins, 12), 0);
  assert.equal(shareRemaining([], 6), 0.5, "no dated wins spreads joins evenly");
  const p = projectGrowth({ ...base, lastYearShareRemaining: 0.5, joinsYtd: 6 });
  assert.equal(p.scenarios[0].joins, 11);
});

test("departures expect last year's churn, or this year's run rate if worse", () => {
  assert.equal(projectGrowth(base).projectedDepartures, 3);
  assert.equal(projectGrowth({ ...base, departuresYtd: 4, monthsElapsed: 6 }).projectedDepartures, 8);
});

test("a finished year reports its actuals only", () => {
  const p = projectGrowth({ ...base, finished: true, startMembers: 29, joinsYtd: 10, departuresYtd: 2, targetPct: 8 });
  assert.equal(p.scenarios.length, 1);
  assert.deepEqual([p.headline.yearEndMembers, p.headline.netGrowthPct], [37, 27.6]);
  assert.equal(p.verdict, "ahead");
});
