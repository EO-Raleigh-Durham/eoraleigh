// SAP pipeline metrics: stage resolution, stage weights, cash split, the
// FY scoreboard, funnel, Today action queue and owner rollup. Pure functions,
// no runtime imports, so they are unit tested directly.
// Plan: docs/plans/11-sap-pipeline-redesign.html

export type SapDealStatusValue = "lead" | "in_discussion" | "active" | "lost";
export type SapPipelineStage = "contacted" | "meeting" | "proposal";

export type PipelineDeal = {
  id: string;
  companyName: string;
  status: SapDealStatusValue;
  pipeline_stage: SapPipelineStage | null;
  amount_usd: number;
  cash_usd: number | null;
  in_kind_usd: number | null;
  deal_owner: string | null;
  last_contact_at: string | null; // YYYY-MM-DD
  next_followup_at: string | null; // YYYY-MM-DD
  next_step: string | null;
  closed_won_at: string | null; // YYYY-MM-DD
  created_at: string;
};

// The resolved stage the funnel and forecast use.
export type FunnelStage =
  | "lead"
  | "contacted"
  | "in_discussion"
  | "meeting"
  | "proposal"
  | "won"
  | "lost";

export const STAGE_LABEL: Record<FunnelStage, string> = {
  lead: "Lead",
  contacted: "Contacted",
  in_discussion: "In discussion",
  meeting: "Meeting",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

// Probability a deal at this stage closes. In-discussion deals without a
// sub-stage sit between Contacted and Meeting.
export const STAGE_WEIGHT: Record<FunnelStage, number> = {
  lead: 0.1,
  contacted: 0.2,
  in_discussion: 0.3,
  meeting: 0.4,
  proposal: 0.6,
  won: 1,
  lost: 0,
};

export const OPEN_FUNNEL_ORDER: FunnelStage[] = [
  "lead",
  "contacted",
  "in_discussion",
  "meeting",
  "proposal",
];

export const STALE_DAYS = 30;
export const DUE_SOON_DAYS = 7;

export function resolveStage(d: Pick<PipelineDeal, "status" | "pipeline_stage">): FunnelStage {
  if (d.status === "active") return "won";
  if (d.status === "lost") return "lost";
  if (d.status === "lead") return "lead";
  return d.pipeline_stage ?? "in_discussion";
}

export function isOpen(d: Pick<PipelineDeal, "status">): boolean {
  return d.status === "lead" || d.status === "in_discussion";
}

// Cash part of a deal. With no split recorded, the whole amount is cash
// (legacy deals predate the split); with only in-kind recorded, cash is the
// remainder.
export function cashOf(d: Pick<PipelineDeal, "amount_usd" | "cash_usd" | "in_kind_usd">): number {
  if (d.cash_usd !== null) return d.cash_usd;
  if (d.in_kind_usd !== null) return Math.max(d.amount_usd - d.in_kind_usd, 0);
  return d.amount_usd;
}

export function inKindOf(d: Pick<PipelineDeal, "amount_usd" | "cash_usd" | "in_kind_usd">): number {
  if (d.in_kind_usd !== null) return d.in_kind_usd;
  if (d.cash_usd !== null) return Math.max(d.amount_usd - d.cash_usd, 0);
  return 0;
}

// Whole days from a to b (both YYYY-MM-DD). Positive when b is later.
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(day + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
}

// ---- Fiscal year filter --------------------------------------------------

// The EO fiscal year (Jul to Jun, named by its start year) a deal belongs to:
// won deals by close date, lost deals by when they were marked lost, open
// deals to the current year because they are live pipeline. Null when a won
// deal has no close date, so it shows only under All.
export function dealFyStart(
  d: Pick<PipelineDeal, "status" | "closed_won_at"> & { lost_at?: string | null },
  currentFy: number,
): number | null {
  if (isOpen(d)) return currentFy;
  const day = d.status === "active" ? d.closed_won_at : d.lost_at ?? null;
  if (!day) return null;
  const y = Number(day.slice(0, 4));
  return Number(day.slice(5, 7)) >= 7 ? y : y - 1;
}

// ---- Scoreboard ----------------------------------------------------------

export type Scoreboard = {
  target: number;
  cashSecured: number; // won deals closed inside the FY window
  inKindSecured: number;
  wonCount: number;
  remaining: number; // target - cashSecured, floored at 0
  openCount: number;
  openTotal: number; // cash + in-kind
  openCash: number;
  weightedCash: number;
  coverage: number | null; // openCash / remaining; null once the target is met
  forecastCash: number; // cashSecured + weightedCash
};

export function scoreboard(
  deals: PipelineDeal[],
  fy: { start: string; end: string }, // [start, end) as YYYY-MM-DD
  target: number,
): Scoreboard {
  let cashSecured = 0;
  let inKindSecured = 0;
  let wonCount = 0;
  let openCount = 0;
  let openTotal = 0;
  let openCash = 0;
  let weightedCash = 0;
  for (const d of deals) {
    if (d.status === "active") {
      if (d.closed_won_at && d.closed_won_at >= fy.start && d.closed_won_at < fy.end) {
        cashSecured += cashOf(d);
        inKindSecured += inKindOf(d);
        wonCount += 1;
      }
      continue;
    }
    if (!isOpen(d)) continue;
    openCount += 1;
    openTotal += d.amount_usd;
    const cash = cashOf(d);
    openCash += cash;
    weightedCash += cash * STAGE_WEIGHT[resolveStage(d)];
  }
  const remaining = Math.max(target - cashSecured, 0);
  weightedCash = Math.round(weightedCash);
  return {
    target,
    cashSecured,
    inKindSecured,
    wonCount,
    remaining,
    openCount,
    openTotal,
    openCash,
    weightedCash,
    coverage: remaining > 0 ? Math.round((openCash / remaining) * 10) / 10 : null,
    forecastCash: cashSecured + weightedCash,
  };
}

// ---- Funnel --------------------------------------------------------------

export type FunnelRow = { stage: FunnelStage; count: number; total: number; weight: number };

// Open stages in order. In-discussion without a sub-stage appears only when
// such deals exist, so the funnel reads Lead > Contacted > Meeting > Proposal.
export function funnel(deals: PipelineDeal[]): FunnelRow[] {
  const rows = new Map<FunnelStage, FunnelRow>(
    OPEN_FUNNEL_ORDER.map((s) => [s, { stage: s, count: 0, total: 0, weight: STAGE_WEIGHT[s] }]),
  );
  for (const d of deals) {
    if (!isOpen(d)) continue;
    const row = rows.get(resolveStage(d))!;
    row.count += 1;
    row.total += d.amount_usd;
  }
  return OPEN_FUNNEL_ORDER.map((s) => rows.get(s)!).filter(
    (r) => r.stage !== "in_discussion" || r.count > 0,
  );
}

// ---- Today queue ---------------------------------------------------------

export type QueueReason = "overdue" | "due_soon" | "no_next_step" | "stale";

export type QueueItem = {
  deal: PipelineDeal;
  stage: FunnelStage;
  reason: QueueReason;
  days: number; // overdue: days late; due_soon: days until; stale: days since contact
};

const REASON_RANK: Record<QueueReason, number> = {
  overdue: 0,
  due_soon: 1,
  no_next_step: 2,
  stale: 3,
};

// One row per open deal that needs attention, with its most urgent reason:
// overdue follow-up, follow-up due within 7 days, no next follow-up date, or
// no contact in 30+ days (never-contacted deals count from creation).
export function actionQueue(deals: PipelineDeal[], today: string): QueueItem[] {
  const items: QueueItem[] = [];
  for (const d of deals) {
    if (!isOpen(d)) continue;
    const stage = resolveStage(d);
    if (d.next_followup_at && d.next_followup_at < today) {
      items.push({ deal: d, stage, reason: "overdue", days: daysBetween(d.next_followup_at, today) });
      continue;
    }
    if (d.next_followup_at && daysBetween(today, d.next_followup_at) <= DUE_SOON_DAYS) {
      items.push({ deal: d, stage, reason: "due_soon", days: daysBetween(today, d.next_followup_at) });
      continue;
    }
    if (!d.next_followup_at) {
      items.push({ deal: d, stage, reason: "no_next_step", days: 0 });
      continue;
    }
    const since = d.last_contact_at ?? d.created_at.slice(0, 10);
    const quiet = daysBetween(since, today);
    if (quiet >= STALE_DAYS) items.push({ deal: d, stage, reason: "stale", days: quiet });
  }
  return items.sort((a, b) => {
    if (a.reason !== b.reason) return REASON_RANK[a.reason] - REASON_RANK[b.reason];
    if (a.reason === "overdue") return b.days - a.days; // most overdue first
    if (a.reason === "due_soon") return a.days - b.days; // soonest first
    return b.deal.amount_usd - a.deal.amount_usd; // biggest first
  });
}

// ---- Owners --------------------------------------------------------------

export type OwnerRow = {
  owner: string;
  open: number;
  weighted: number;
  overdue: number;
  advanced: number; // deals at Meeting or Proposal
};

export function ownerRollup(deals: PipelineDeal[], today: string): OwnerRow[] {
  const by = new Map<string, OwnerRow>();
  for (const d of deals) {
    if (!isOpen(d)) continue;
    const owner = d.deal_owner?.trim() || "Unassigned";
    const row = by.get(owner) ?? { owner, open: 0, weighted: 0, overdue: 0, advanced: 0 };
    const stage = resolveStage(d);
    row.open += 1;
    row.weighted += d.amount_usd * STAGE_WEIGHT[stage];
    if (d.next_followup_at && d.next_followup_at < today) row.overdue += 1;
    if (stage === "meeting" || stage === "proposal") row.advanced += 1;
    by.set(owner, row);
  }
  return [...by.values()]
    .map((r) => ({ ...r, weighted: Math.round(r.weighted) }))
    .sort((a, b) => b.weighted - a.weighted);
}
