import { supabase } from "@/lib/supabase";
import { loadMemberEngagementReview, type MemberEngagementDetail } from "@/lib/engagement";
import { fyLabel, fyWindow } from "@/lib/fiscal-year";
import { projectGrowth, shareRemaining, type Projection, type Scenario } from "@/lib/growth-projection";
import { getDealsByPipeline, getProspectEventTouches } from "@/lib/deals";
import { prospectScoreboard, type ProspectDeal } from "@/lib/prospect-pipeline";

// ============================================================
// Membership growth forecast for one EO fiscal year (1 July to 30 June).
//
// The headline assumes the chapter repeats last year's pace (last year's
// joins, timed as last year's wins actually landed), with stretch, pipeline
// and downside views beside it, and what it takes to hit the board's goal in
// joins and new leads. The math is in growth-projection.ts; this file loads
// the inputs. Server-only.
//
// It runs on the fiscal year, not the calendar year: imported members carry a
// placeholder start date in May 2026, and the calendar version projected +207%
// for FY2026/27 (fixed 17 Nov 2026). Past years read their recorded actuals.
//
// The target and the downside lapse assumption are board-editable, stored in
// chapter_goals (migration 066) keyed by fiscal_year_start.
// ============================================================

// Fallback defaults, used only when the board has not set a chapter_goals row
// for the fiscal year (migration 066). The live values are board-editable.
export const DEFAULT_NET_GROWTH_TARGET_PCT = 8;
// Share of renewal-risk members assumed to actually lapse by year-end in the
// downside case. Deliberately conservative: not everyone flagged churns.
export const DEFAULT_RISK_LAPSE_RATE = 0.45;
const PULSE_SLUG = "transformational-growth-pulse";
const DEPARTED_STATUSES = ["elumni", "terminated", "transferred"];

export type GrowthVerdict = "ahead" | "on_track" | "behind";

// Last year's churn when chapter_metrics has no retention for the prior year.
const DEFAULT_BASELINE_CHURN_RATE = 0.1;

export type GrowthForecast = {
  year: number; // fiscal_year_start (2026 = FY2026/27)
  fiscalYearStart: number;
  fyLabel: string;
  finished: boolean; // the year is over: actuals only
  targetPct: number;
  startOfYearMembers: number; // active members on 1 July
  currentMembers: number;
  joinsYtd: number;
  departuresYtd: number;
  monthsElapsed: number;
  baselineChurnPct: number; // last year's churn applied, percent
  lastYearJoins: number;
  lastYearLabel: string;
  lastYearShareRemainingPct: number; // share of last year's wins that landed after this point of the year
  livePipeline: number; // open prospects not gone quiet
  leadsThisYear: number; // prospects added to the deal board this fiscal year
  wonThisYear: number; // prospects closed won this fiscal year
  pipelineExpected: number; // live prospects weighted by stage
  leadsPerMonth: number;
  conversionPct: number; // last year's closed prospects that became members
  renewalRiskMembers: number; // not-renewing intent or at_risk
  riskLapseRate: number; // downside lapse assumption applied, 0-1
  sourceNote: string | null; // provenance of the target, board-set
  projection: Projection; // scenarios, headline, verdict and what it takes
  headline: Scenario;
  verdict: GrowthVerdict;
  gapPct: number;
};

export type ChapterGoal = {
  netGrowthTargetPct: number;
  riskLapseRate: number;
  sourceNote: string | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

// Coerce a Supabase `numeric` (returned as a string) to a finite number, or
// fall back to a default.
const toNum = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// Board-editable goal for a fiscal year (chapter_goals, migration 066).
// Resilient: missing table/row falls back to the defaults, so the forecast
// renders unchanged before the migration is applied.
export async function loadChapterGoal(fiscalYearStart: number): Promise<ChapterGoal> {
  const { data } = await supabase
    .from("chapter_goals")
    .select("net_growth_target_pct, risk_lapse_rate, source_note")
    .eq("fiscal_year_start", fiscalYearStart)
    .maybeSingle();
  const row = data as
    | { net_growth_target_pct: number | string; risk_lapse_rate: number | string; source_note: string | null }
    | null;
  return {
    netGrowthTargetPct: toNum(row?.net_growth_target_pct, DEFAULT_NET_GROWTH_TARGET_PCT),
    riskLapseRate: toNum(row?.risk_lapse_rate, DEFAULT_RISK_LAPSE_RATE),
    sourceNote: row?.source_note ?? null,
  };
}

type MetricRow = { fiscal_year_start: number; members: number | null; retention_pct: number | string | null };

// Months since 1 July of a fiscal year for an ISO date or timestamp.
function monthsIntoFy(iso: string, fiscalYearStart: number): number {
  return (Date.parse(iso.length <= 10 ? `${iso}T00:00:00+07:00` : iso) - Date.parse(`${fiscalYearStart}-07-01T00:00:00+07:00`)) / (30.44 * 86_400_000);
}

export async function loadGrowthForecast(
  fiscalYearStart: number,
  preloadedMembers?: MemberEngagementDetail[],
): Promise<GrowthForecast> {
  const { start, end } = fyWindow(fiscalYearStart);
  const last = fyWindow(fiscalYearStart - 1);
  const goal = await loadChapterGoal(fiscalYearStart);

  const [{ data: active }, { data: departed }, { data: metricRows }, allProspects] = await Promise.all([
    supabase.from("chapter_memberships").select("person_id, start_date").eq("status", "active"),
    supabase
      .from("chapter_memberships")
      .select("id, end_date")
      .in("status", DEPARTED_STATUSES)
      .gte("end_date", start)
      .lt("end_date", end),
    supabase
      .from("chapter_metrics")
      .select("fiscal_year_start, members, retention_pct")
      .in("fiscal_year_start", [fiscalYearStart - 2, fiscalYearStart - 1, fiscalYearStart]),
    getDealsByPipeline("Member Acquisition"),
  ]);
  const metricFor = (fy: number) => ((metricRows ?? []) as MetricRow[]).find((r) => r.fiscal_year_start === fy) ?? null;
  const twoBack = metricFor(fiscalYearStart - 2);
  const prior = metricFor(fiscalYearStart - 1);
  const closing = metricFor(fiscalYearStart);
  const retentionOf = (r: MetricRow | null) => {
    const n = Number(r?.retention_pct);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const activeRows = (active ?? []) as { person_id: string; start_date: string | null }[];
  const currentMembers = activeRows.length;
  let joinsYtd = activeRows.filter((m) => m.start_date && m.start_date >= start && m.start_date < end).length;
  let departuresYtd = (departed ?? []).length;
  let startOfYearMembers = currentMembers - joinsYtd + departuresYtd;

  // A finished year reads its recorded actuals when chapter_metrics has them:
  // last year's year-end members to this year's, departures from this year's
  // retention. Membership start dates can't rebuild past years, because
  // imported members carry a placeholder start date (May 2026).
  const finished = Date.now() >= Date.parse(`${end}T00:00:00+07:00`);
  const closingRetention = retentionOf(closing);
  if (finished && prior?.members != null && closing?.members != null && closingRetention !== null) {
    startOfYearMembers = prior.members;
    departuresYtd = Math.round(startOfYearMembers * (1 - closingRetention / 100));
    joinsYtd = closing.members - startOfYearMembers + departuresYtd;
  }

  const priorRetention = retentionOf(prior);
  const baselineChurnRate = priorRetention !== null ? 1 - priorRetention / 100 : DEFAULT_BASELINE_CHURN_RATE;

  // Months since 1 July (a finished fiscal year reads 12).
  const monthsElapsed = Math.max(0, Math.min(12, monthsIntoFy(new Date().toISOString(), fiscalYearStart)));

  // Last year: joins from the recorded year-end counts, and when its wins landed.
  const priorWins = allProspects.filter(
    (c) => c.deal.deal_status === "closed_won" && c.deal.close_date && c.deal.close_date.slice(0, 10) >= last.start && c.deal.close_date.slice(0, 10) < last.end,
  );
  const priorLost = allProspects.filter(
    (c) => c.deal.deal_status === "closed_lost" && c.deal.close_date && c.deal.close_date.slice(0, 10) >= last.start && c.deal.close_date.slice(0, 10) < last.end,
  );
  const lastYearJoins =
    prior?.members != null && twoBack?.members != null && priorRetention !== null
      ? prior.members - twoBack.members + Math.round(twoBack.members * (1 - priorRetention / 100))
      : priorWins.length;
  const winMonths = priorWins.map((c) => monthsIntoFy(c.deal.close_date!, fiscalYearStart - 1));
  const lastYearShare = shareRemaining(winMonths, monthsElapsed);
  const closedLastYear = priorWins.length + priorLost.length;
  const conversionRate = closedLastYear > 0 ? priorWins.length / closedLastYear : 0;

  // This year's pipeline: live open prospects weighted by stage, and the lead rate.
  const today = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
  const pipelineDeals: ProspectDeal[] = allProspects.map((c) => ({
    id: c.deal.id,
    name: c.deal.name,
    stage: c.deal.stage,
    deal_status: c.deal.deal_status,
    close_date: c.deal.close_date,
    channel_source: c.deal.channel_source,
    last_activity_at: c.deal.last_activity_at,
    created_at: c.deal.created_at,
    person_id: c.deal.person_id,
  }));
  const touches = await getProspectEventTouches(
    pipelineDeals.filter((d) => d.deal_status === "open" && d.person_id).map((d) => d.person_id!),
  );
  const board = prospectScoreboard(pipelineDeals, touches, { start, end }, goal.netGrowthTargetPct, today);
  const leadsThisYear = allProspects.filter((c) => c.deal.created_at.slice(0, 10) >= start && c.deal.created_at.slice(0, 10) < end).length;
  const wonThisYear = allProspects.filter(
    (c) => c.deal.deal_status === "closed_won" && c.deal.close_date && c.deal.close_date.slice(0, 10) >= start && c.deal.close_date.slice(0, 10) < end,
  ).length;
  const leadsPerMonth = monthsElapsed >= 1 ? round1(leadsThisYear / monthsElapsed) : leadsThisYear;

  // Renewal-risk pool: stated non-renewal intent OR at risk (the churn case
  // on The Pulse of the Chapter).
  const members = preloadedMembers ?? (await loadMemberEngagementReview()).members;
  const riskBySignal = new Set(
    members.filter((m) => m.signal === "at_risk").map((m) => m.personId),
  );
  const { data: survey } = await supabase
    .from("surveys")
    .select("id")
    .eq("slug", PULSE_SLUG)
    .maybeSingle();
  if (survey) {
    const { data: resp } = await supabase
      .from("survey_responses")
      .select("person_id, will_renew, submitted_at")
      .eq("survey_id", (survey as { id: string }).id)
      .not("person_id", "is", null)
      .order("submitted_at", { ascending: false });
    const latest = new Map<string, boolean | null>();
    for (const r of (resp ?? []) as { person_id: string; will_renew: boolean | null }[]) {
      if (!latest.has(r.person_id)) latest.set(r.person_id, r.will_renew);
    }
    for (const [pid, willRenew] of latest) if (willRenew === false) riskBySignal.add(pid);
  }
  const activeIds = new Set(activeRows.map((m) => m.person_id));
  // Renewal risk is about the renewal still ahead; a finished year has none.
  const renewalRiskMembers = finished ? 0 : [...riskBySignal].filter((id) => activeIds.has(id)).length;

  const projection = projectGrowth({
    startMembers: startOfYearMembers,
    joinsYtd,
    departuresYtd,
    monthsElapsed,
    finished,
    baselineChurnRate,
    lastYearJoins,
    lastYearShareRemaining: lastYearShare,
    pipelineExpected: board.expected,
    leadsPerMonth,
    conversionRate,
    renewalRiskMembers,
    riskLapseRate: goal.riskLapseRate,
    targetPct: goal.netGrowthTargetPct,
  });

  return {
    year: fiscalYearStart,
    fiscalYearStart,
    fyLabel: fyLabel(fiscalYearStart),
    finished,
    targetPct: goal.netGrowthTargetPct,
    startOfYearMembers,
    currentMembers,
    joinsYtd,
    departuresYtd,
    monthsElapsed: round1(monthsElapsed),
    baselineChurnPct: round1(baselineChurnRate * 100),
    lastYearJoins,
    lastYearLabel: fyLabel(fiscalYearStart - 1),
    lastYearShareRemainingPct: Math.round(lastYearShare * 100),
    livePipeline: board.live,
    leadsThisYear,
    wonThisYear,
    pipelineExpected: board.expected,
    leadsPerMonth,
    conversionPct: Math.round(conversionRate * 100),
    renewalRiskMembers,
    riskLapseRate: goal.riskLapseRate,
    sourceNote: goal.sourceNote,
    projection,
    headline: projection.headline,
    verdict: projection.verdict,
    gapPct: projection.gapPct,
  };
}
