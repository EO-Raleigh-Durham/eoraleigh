// Membership growth projection for one EO fiscal year (1 July to 30 June).
// Pure, unit tested in growth-projection.test.ts; growth-forecast.ts loads the
// inputs from chapter_metrics, chapter_memberships and the prospect pipeline.
//
// The headline assumes the chapter repeats last year's pace: last year's joins,
// timed the way last year's wins actually landed (most close in Dec to Jan and
// May to Jun, around renewal), on top of the joins already in this year. Three
// other views sit beside it so the board can see the spread:
//
//   Stretch    last year's joins plus a little more (STRETCH_UPLIFT)
//   Pipeline   only what today's evidence supports: the live prospects
//              weighted by stage, plus the new leads still to come at this
//              year's lead rate and last year's conversion
//   Downside   last year's pace, with the members showing renewal risk
//              lapsing at the board's lapse rate
//
// Departures: most members leave at renewal in June, so a year-to-date run
// rate says little mid-year. Every view expects at least last year's churn of
// the members the year started with. A finished year reads its actuals.

export const STRETCH_UPLIFT = 0.2; // "last year's growth and a little bit better"
// Leads created after this many months into the year rarely become members
// before 30 June, so the pipeline view counts new leads only until then.
export const LEAD_CUTOFF_MONTH = 9; // 1 April

export type ProjectionInput = {
  startMembers: number; // active members on 1 July
  joinsYtd: number; // members who joined since 1 July
  departuresYtd: number; // members who left since 1 July
  monthsElapsed: number; // months since 1 July, 0 to 12
  finished: boolean; // the fiscal year is over: report actuals
  baselineChurnRate: number; // last year's churn, 0 to 1
  lastYearJoins: number; // members who joined last fiscal year
  /** Share of last year's dated wins that closed after this point of the year, 0 to 1. */
  lastYearShareRemaining: number;
  pipelineExpected: number; // live open prospects weighted by stage
  leadsPerMonth: number; // new prospects per month so far this year
  conversionRate: number; // last year's closed prospects that became members, 0 to 1
  renewalRiskMembers: number;
  riskLapseRate: number; // 0 to 1
  targetPct: number;
};

export type ScenarioKey = "pace" | "stretch" | "pipeline" | "downside";

export type Scenario = {
  key: ScenarioKey;
  label: string;
  joins: number;
  departures: number;
  yearEndMembers: number;
  netGrowthPct: number;
};

export type Projection = {
  scenarios: Scenario[]; // pace (the headline), stretch, pipeline, downside
  headline: Scenario;
  projectedDepartures: number;
  gapPct: number; // headline minus target, percentage points
  verdict: "ahead" | "on_track" | "behind";
  /** What it takes to hit the target. */
  joinsNeeded: number; // total joins this year for the target
  joinsStillNeeded: number; // beyond those already in
  pipelineJoins: number; // joins today's pipeline and lead flow support, beyond those already in
  newLeadsNeeded: number; // extra leads, at last year's conversion, to close the gap the pipeline leaves
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function projectGrowth(i: ProjectionInput): Projection {
  const growth = (end: number) => (i.startMembers ? round1(((end - i.startMembers) / i.startMembers) * 100) : 0);
  const months = Math.max(0, Math.min(12, i.monthsElapsed));
  const scenario = (key: ScenarioKey, label: string, joins: number, departures: number): Scenario => {
    const yearEndMembers = i.startMembers + joins - departures;
    return { key, label, joins, departures, yearEndMembers, netGrowthPct: growth(yearEndMembers) };
  };

  if (i.finished) {
    const actual = scenario("pace", "Actual", i.joinsYtd, i.departuresYtd);
    return {
      scenarios: [actual],
      headline: actual,
      projectedDepartures: i.departuresYtd,
      gapPct: round1(actual.netGrowthPct - i.targetPct),
      verdict: verdictOf(actual.netGrowthPct - i.targetPct),
      joinsNeeded: 0,
      joinsStillNeeded: 0,
      pipelineJoins: 0,
      newLeadsNeeded: 0,
    };
  }

  // Departures: at least last year's churn of the start, or this year's run rate if worse.
  const runRateDepartures = months > 0 ? Math.round((i.departuresYtd * 12) / months) : 0;
  const projectedDepartures = Math.max(
    i.departuresYtd,
    runRateDepartures,
    Math.round(i.startMembers * i.baselineChurnRate),
  );
  const riskDepartures = Math.max(projectedDepartures, i.departuresYtd + Math.round(i.renewalRiskMembers * i.riskLapseRate));

  const share = Math.max(0, Math.min(1, i.lastYearShareRemaining));
  const paceJoins = i.joinsYtd + Math.round(i.lastYearJoins * share);
  const stretchJoins = i.joinsYtd + Math.round(i.lastYearJoins * (1 + STRETCH_UPLIFT) * share);
  const leadMonthsLeft = Math.max(0, LEAD_CUTOFF_MONTH - months);
  const pipelineJoins = Math.round(i.pipelineExpected + i.leadsPerMonth * leadMonthsLeft * i.conversionRate);

  const pace = scenario("pace", "Last year's pace", paceJoins, projectedDepartures);
  const scenarios = [
    pace,
    scenario("stretch", `Stretch (+${Math.round(STRETCH_UPLIFT * 100)}% joins)`, stretchJoins, projectedDepartures),
    scenario("pipeline", "Pipeline today", i.joinsYtd + pipelineJoins, projectedDepartures),
    scenario("downside", "Downside (renewal risk)", paceJoins, riskDepartures),
  ];

  const targetMembers = Math.ceil(i.startMembers * (1 + i.targetPct / 100));
  const joinsNeeded = Math.max(0, targetMembers - i.startMembers + projectedDepartures);
  const joinsStillNeeded = Math.max(0, joinsNeeded - i.joinsYtd);
  const gapAfterPipeline = Math.max(0, joinsStillNeeded - pipelineJoins);
  const newLeadsNeeded = i.conversionRate > 0 ? Math.ceil(gapAfterPipeline / i.conversionRate) : 0;

  return {
    scenarios,
    headline: pace,
    projectedDepartures,
    gapPct: round1(pace.netGrowthPct - i.targetPct),
    verdict: verdictOf(pace.netGrowthPct - i.targetPct),
    joinsNeeded,
    joinsStillNeeded,
    pipelineJoins,
    newLeadsNeeded,
  };
}

function verdictOf(gap: number): Projection["verdict"] {
  return gap >= 1 ? "ahead" : gap >= -1 ? "on_track" : "behind";
}

/**
 * The share of last year's dated wins that closed after the same point of the
 * year (months since 1 July). With no dated wins, the joins are spread evenly.
 */
export function shareRemaining(lastYearWinMonths: number[], monthsElapsed: number): number {
  if (lastYearWinMonths.length === 0) return Math.max(0, Math.min(1, (12 - monthsElapsed) / 12));
  return lastYearWinMonths.filter((m) => m >= monthsElapsed).length / lastYearWinMonths.length;
}
