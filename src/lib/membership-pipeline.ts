import {
  getDealsByPipeline,
  CHANNEL_SOURCES,
  type DealCard,
} from "@/lib/deals";

// ============================================================
// Membership pipeline analytics.
//
// Reads the Member Acquisition deals (the Prospects funnel) and
// computes the board/operational metrics in memory. One query via
// getDealsByPipeline, everything else derived here. Mirrors the
// chapter-overview convention: a lib computes, the page renders.
//
// What is buildable today: stage funnel, win rate, cycle time,
// channel efficacy, loss reasons, qualification rate, aging.
// What is NOT (and is noted in the UI): a stored membership goal
// (for pace/coverage) and per-stage timestamps (for true
// time-in-stage). Velocity here is apply -> close only.
//
// Server-only: getDealsByPipeline imports the secret-key client.
// ============================================================

// The working stages (everything before the closed outcomes).
const FUNNEL_STAGES = [
  "Connect & Qualify",
  "Experience EO",
  "Go <> No Go Call",
  "Revenue Verification Sent",
  "Interview",
  "Payment Request",
] as const;

export type StageCount = { stage: string; count: number };
export type ChannelStat = {
  channel: string;
  total: number;
  won: number;
  winRatePct: number | null;
};
export type LossReason = { reason: string; count: number };

export type MembershipPipeline = {
  total: number; // all member-acquisition deals on record
  open: number; // deal_status = open
  won: number; // closed_won
  lost: number; // closed_lost
  winRatePct: number | null; // won / (won + lost)
  openValueUsd: number; // sum of amount on open deals
  funnel: StageCount[]; // open deals per working stage
  avgCycleDays: number | null; // created_at -> close_date on won deals
  byChannel: ChannelStat[]; // sorted by volume, channels with deals only
  lossReasons: LossReason[]; // sorted by count
  qualifiedOpen: number; // open deals with all four ql_* true
  qualifiedPct: number | null; // qualifiedOpen / open
  stale30: number; // open deals with no activity in 30+ days
  loadedAt: string;
};

function daysBetween(aIso: string, bIso: string): number {
  return Math.round(
    (new Date(bIso).getTime() - new Date(aIso).getTime()) / 86_400_000,
  );
}

export async function loadMembershipPipeline(): Promise<MembershipPipeline> {
  let cards: DealCard[] = [];
  try {
    cards = await getDealsByPipeline("Member Acquisition");
  } catch (e) {
    console.warn("loadMembershipPipeline:", (e as Error).message);
  }
  const deals = cards.map((c) => c.deal);

  const open = deals.filter((d) => d.deal_status === "open");
  const won = deals.filter((d) => d.deal_status === "closed_won");
  const lost = deals.filter((d) => d.deal_status === "closed_lost");

  const decided = won.length + lost.length;
  const winRatePct = decided ? Math.round((won.length / decided) * 100) : null;

  const openValueUsd = open.reduce((sum, d) => sum + (d.amount ?? 0), 0);

  const funnel: StageCount[] = FUNNEL_STAGES.map((stage) => ({
    stage,
    count: open.filter((d) => d.stage === stage).length,
  }));

  const cycles = won
    .filter((d) => d.close_date)
    .map((d) => daysBetween(d.created_at, d.close_date as string))
    .filter((n) => Number.isFinite(n) && n >= 0);
  const avgCycleDays = cycles.length
    ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length)
    : null;

  const byChannel: ChannelStat[] = CHANNEL_SOURCES.map((channel) => {
    const inCh = deals.filter((d) => d.channel_source === channel);
    const w = inCh.filter((d) => d.deal_status === "closed_won").length;
    const l = inCh.filter((d) => d.deal_status === "closed_lost").length;
    const dec = w + l;
    return {
      channel,
      total: inCh.length,
      won: w,
      winRatePct: dec ? Math.round((w / dec) * 100) : null,
    };
  })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const lossMap = new Map<string, number>();
  for (const d of lost) {
    const reason = d.closed_lost_description ?? "Other (Specify in Notes)";
    lossMap.set(reason, (lossMap.get(reason) ?? 0) + 1);
  }
  const lossReasons: LossReason[] = [...lossMap.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  const qualifiedOpen = open.filter(
    (d) =>
      d.ql_financial_commitment === true &&
      d.ql_founder_controlling_owner === true &&
      d.ql_revenue_verified === true &&
      d.ql_time_commitment === true,
  ).length;
  const qualifiedPct = open.length
    ? Math.round((qualifiedOpen / open.length) * 100)
    : null;

  const now = Date.now();
  const stale30 = open.filter((d) => {
    const ts = d.last_activity_at ?? d.updated_at;
    return ts ? (now - new Date(ts).getTime()) / 86_400_000 > 30 : false;
  }).length;

  return {
    total: deals.length,
    open: open.length,
    won: won.length,
    lost: lost.length,
    winRatePct,
    openValueUsd,
    funnel,
    avgCycleDays,
    byChannel,
    lossReasons,
    qualifiedOpen,
    qualifiedPct,
    stale30,
    loadedAt: new Date().toISOString(),
  };
}
