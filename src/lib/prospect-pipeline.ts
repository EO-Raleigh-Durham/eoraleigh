// Prospects (Member Acquisition) cockpit metrics: stage weights, warmth
// signals from event registrations, the ranked "contact next" queue, the
// dead-lead clear-out list, scoreboard and funnel. Pure functions, no runtime
// imports, so they are unit tested directly.
// Plan: docs/plans/12-prospects-cockpit.html

export const OPEN_STAGES = [
  "Connect & Qualify",
  "Experience EO",
  "Go <> No Go Call",
  "Revenue Verification Sent",
  "Interview",
  "Payment Request",
] as const;

// Probability a prospect at this stage joins.
export const STAGE_WEIGHT: Record<string, number> = {
  "Connect & Qualify": 0.1,
  "Experience EO": 0.2,
  "Go <> No Go Call": 0.3,
  "Revenue Verification Sent": 0.5,
  Interview: 0.65,
  "Payment Request": 0.85,
};

export const DEAD_DAYS = 90;
export const JUST_CONTACTED_DAYS = 3;

export type ProspectDeal = {
  id: string;
  name: string;
  stage: string;
  deal_status: "open" | "closed_won" | "closed_lost";
  close_date: string | null;
  channel_source: string | null;
  last_activity_at: string | null; // ISO timestamp
  created_at: string;
  person_id: string | null;
};

// One event registration for a prospect, joined to the event's date.
export type EventTouch = {
  person_id: string;
  status: string; // registered | attended | ...
  event_title: string;
  event_day: string; // YYYY-MM-DD (chapter time zone)
};

export type Signals = {
  lastTouchDay: string; // latest of deal activity and attended events
  daysSinceTouch: number;
  attendedCount: number;
  lastAttended: { title: string; day: string; daysAgo: number } | null;
  upcoming: { title: string; day: string; daysUntil: number } | null;
  daysSinceActivity: number | null;
};

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}

const day = (iso: string) => iso.slice(0, 10);

export function prospectSignals(deal: ProspectDeal, touches: EventTouch[], today: string): Signals {
  const mine = deal.person_id ? touches.filter((t) => t.person_id === deal.person_id) : [];
  const attended = mine
    .filter((t) => t.status === "attended" && t.event_day <= today)
    .sort((a, b) => b.event_day.localeCompare(a.event_day));
  const upcoming = mine
    .filter((t) => t.event_day >= today && t.status !== "cancelled" && t.status !== "attended")
    .sort((a, b) => a.event_day.localeCompare(b.event_day))[0];
  const activityDay = deal.last_activity_at ? day(deal.last_activity_at) : null;
  const candidates = [activityDay, attended[0]?.event_day, day(deal.created_at)].filter(
    (d): d is string => Boolean(d),
  );
  const lastTouchDay = candidates.sort().at(-1)!;
  return {
    lastTouchDay,
    daysSinceTouch: daysBetween(lastTouchDay, today),
    attendedCount: attended.length,
    lastAttended: attended[0]
      ? { title: attended[0].event_title, day: attended[0].event_day, daysAgo: daysBetween(attended[0].event_day, today) }
      : null,
    upcoming: upcoming
      ? { title: upcoming.event_title, day: upcoming.event_day, daysUntil: daysBetween(today, upcoming.event_day) }
      : null,
    daysSinceActivity: activityDay ? daysBetween(activityDay, today) : null,
  };
}

export function isDead(s: Signals): boolean {
  return !s.upcoming && s.daysSinceTouch >= DEAD_DAYS;
}

export type Reason = { text: string; tone: "hot" | "warm" | "info" };

export type QueueItem = {
  deal: ProspectDeal;
  signals: Signals;
  score: number;
  reasons: Reason[];
};

function fmtDay(d: string): string {
  const [, m, dd] = d.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${dd} ${months[m - 1]}`;
}

// Priority score: stage progress, plus warmth (recent or upcoming events),
// depth of engagement, and referral source. Higher is more worth a call now.
export function scoreProspect(deal: ProspectDeal, s: Signals): { score: number; reasons: Reason[] } {
  const reasons: Reason[] = [];
  let score = (STAGE_WEIGHT[deal.stage] ?? 0.1) * 100;
  if (s.upcoming) {
    score += 50;
    reasons.push({ text: `Coming ${fmtDay(s.upcoming.day)}`, tone: "hot" });
  }
  if (s.lastAttended && s.lastAttended.daysAgo <= 14) {
    score += 60;
    reasons.push({ text: `Attended ${fmtDay(s.lastAttended.day)}`, tone: "hot" });
  } else if (s.lastAttended && s.lastAttended.daysAgo <= 30) {
    score += 40;
    reasons.push({ text: `Attended ${fmtDay(s.lastAttended.day)}`, tone: "warm" });
  }
  score += Math.min(s.attendedCount, 3) * 10;
  if (s.attendedCount >= 2) reasons.push({ text: `${s.attendedCount} events`, tone: "warm" });
  if (deal.channel_source === "Referrals") {
    score += 15;
    reasons.push({ text: "Referral", tone: "warm" });
  }
  reasons.push({ text: deal.stage, tone: "info" });
  return { score: Math.round(score), reasons };
}

// Open prospects worth contacting now, highest priority first. Excludes dead
// leads (see clearOut) and anyone contacted in the last few days.
export function priorityQueue(deals: ProspectDeal[], touches: EventTouch[], today: string): QueueItem[] {
  const items: QueueItem[] = [];
  for (const deal of deals) {
    if (deal.deal_status !== "open") continue;
    const signals = prospectSignals(deal, touches, today);
    if (isDead(signals)) continue;
    if (signals.daysSinceActivity !== null && signals.daysSinceActivity < JUST_CONTACTED_DAYS) continue;
    const { score, reasons } = scoreProspect(deal, signals);
    items.push({ deal, signals, score, reasons });
  }
  return items.sort((a, b) => b.score - a.score || b.signals.daysSinceTouch - a.signals.daysSinceTouch);
}

export type DeadItem = { deal: ProspectDeal; signals: Signals };

// Open prospects with no touch in DEAD_DAYS and nothing upcoming: candidates
// to close as ghosted. Quietest first.
export function clearOut(deals: ProspectDeal[], touches: EventTouch[], today: string): DeadItem[] {
  return deals
    .filter((d) => d.deal_status === "open")
    .map((deal) => ({ deal, signals: prospectSignals(deal, touches, today) }))
    .filter((i) => isDead(i.signals))
    .sort((a, b) => b.signals.daysSinceTouch - a.signals.daysSinceTouch);
}

export type ProspectScoreboard = {
  target: number;
  won: number; // closed_won with close_date in the FY
  lost: number;
  remaining: number;
  live: number; // open and not dead
  dead: number;
  expected: number; // sum of stage weights over live deals, 1 decimal
  coverage: number | null; // live / remaining; null once the target is met
};

export function prospectScoreboard(
  deals: ProspectDeal[],
  touches: EventTouch[],
  fy: { start: string; end: string },
  target: number,
  today: string,
): ProspectScoreboard {
  let won = 0;
  let lost = 0;
  let live = 0;
  let dead = 0;
  let expected = 0;
  for (const d of deals) {
    const inFy = d.close_date !== null && day(d.close_date) >= fy.start && day(d.close_date) < fy.end;
    if (d.deal_status === "closed_won") {
      if (inFy) won += 1;
      continue;
    }
    if (d.deal_status === "closed_lost") {
      if (inFy) lost += 1;
      continue;
    }
    if (isDead(prospectSignals(d, touches, today))) {
      dead += 1;
      continue;
    }
    live += 1;
    expected += STAGE_WEIGHT[d.stage] ?? 0.1;
  }
  const remaining = Math.max(target - won, 0);
  return {
    target,
    won,
    lost,
    remaining,
    live,
    dead,
    expected: Math.round(expected * 10) / 10,
    coverage: remaining > 0 ? Math.round((live / remaining) * 10) / 10 : null,
  };
}

export type FunnelRow = { stage: string; count: number; weight: number };

export function prospectFunnel(deals: ProspectDeal[]): FunnelRow[] {
  return OPEN_STAGES.map((stage) => ({
    stage,
    count: deals.filter((d) => d.deal_status === "open" && d.stage === stage).length,
    weight: STAGE_WEIGHT[stage],
  }));
}
