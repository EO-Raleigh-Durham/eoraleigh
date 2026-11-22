// Live revenue for the in-progress fiscal year (17 Nov 2026). Pure: only config and
// currency imports, unit tested in chapter-revenue.test.ts. chapter-overview.ts loads
// the inputs and overrides the current year's revenue with this.
//
// Revenue = dues + initiation fees + EO grants + SAP cash + event ticket sales.
//   dues        the board-set dues rate for every active member; a member who
//               joined this year pays from their join month to June (prorated
//               by month). Most dues are paid by bank transfer, so payments
//               can't show them.
//   initiation  the board-set fee, once for each member who joined this year
//   grants      chapter_metrics.eo_grants_usd, entered by the board
//   SAP         cash of SAP deals won this FY (in-kind is not revenue)
//   events      website ticket payments this FY, cancellations excluded
// A June join belongs to the next fiscal year: that is the year it is billed for.
// Revenue per member = revenue / active members.

import { CHAPTER_LOCAL_CURRENCY, CHAPTER_LOCAL_PER_USD } from "../kernel/config/chapter.ts";
import { toMajorUnits } from "./currency.ts";

// Local-currency tickets convert at a fixed planning rate (chapter config);
// there is no live FX source.
export const VND_PER_USD = CHAPTER_LOCAL_PER_USD;

export type EventPayment = { amountPaid: number; currency: string | null; status: string };

/** Ticket sales in whole USD: USD amounts are cents, local amounts are stored units. */
export function eventSalesUsd(payments: EventPayment[]): number {
  let cents = 0;
  for (const p of payments) {
    if (p.status === "cancelled" || !(p.amountPaid > 0)) continue;
    const cur = (p.currency ?? "USD").toUpperCase();
    if (cur === "USD") cents += p.amountPaid;
    else if (CHAPTER_LOCAL_CURRENCY && cur === CHAPTER_LOCAL_CURRENCY && VND_PER_USD > 0) {
      cents += (toMajorUnits(p.amountPaid, cur) / VND_PER_USD) * 100;
    }
  }
  return Math.round(cents / 100);
}

/**
 * Months of dues a member owes in fiscal year `fyStart` (12 for a full year):
 * a member who joined during the year pays from their join month to June. A
 * join in June of the year before counts as a full year in this one.
 */
export function duesMonths(startDate: string | null, fyStart: number): number {
  if (!startDate) return 12;
  const y = Number(startDate.slice(0, 4));
  const m = Number(startDate.slice(5, 7)); // 1-12
  const monthIndex = (y - fyStart) * 12 + (m - 7); // 0 = July of this FY
  if (monthIndex <= 0) return 12; // joined before this FY (or in July)
  if (monthIndex >= 12) return 0; // joins after this FY
  return 12 - monthIndex;
}

/** Whether a member's start date makes them a join of fiscal year `fyStart`. */
export function joinedThisFy(startDate: string | null, fyStart: number): boolean {
  if (!startDate) return false;
  // From 1 June of the year before (billed for this year) to 31 May of this one.
  return startDate >= `${fyStart}-06-01` && startDate < `${fyStart + 1}-06-01`;
}

export type RevenueBreakdown = {
  dues: number;
  initiation: number;
  grants: number;
  sapCash: number;
  events: number;
  total: number;
  perMember: number | null;
  members: number;
  newMembers: number;
  duesRate: number | null;
  initiationFee: number | null;
};

export function liveRevenue(i: {
  fyStart: number;
  memberStartDates: (string | null)[]; // one per active member
  duesRate: number | null;
  initiationFee: number | null;
  grants: number | null;
  sapCash: number;
  events: number;
}): RevenueBreakdown {
  const members = i.memberStartDates.length;
  const dues =
    i.duesRate !== null
      ? Math.round(i.memberStartDates.reduce((sum, d) => sum + (i.duesRate! * duesMonths(d, i.fyStart)) / 12, 0))
      : 0;
  const newMembers = i.memberStartDates.filter((d) => joinedThisFy(d, i.fyStart)).length;
  const initiation = (i.initiationFee ?? 0) * newMembers;
  const grants = i.grants ?? 0;
  const total = dues + initiation + grants + i.sapCash + i.events;
  return {
    dues,
    initiation,
    grants,
    sapCash: i.sapCash,
    events: i.events,
    total,
    perMember: members > 0 ? Math.round(total / members) : null,
    members,
    newMembers,
    duesRate: i.duesRate,
    initiationFee: i.initiationFee,
  };
}
