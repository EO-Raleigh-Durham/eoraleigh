import assert from "node:assert/strict";
import test from "node:test";
// Local-currency ticket sales read chapter config at import time, so set a
// local currency before loading the module.
process.env.NEXT_PUBLIC_CHAPTER_LOCAL_CURRENCY = "JPY";
process.env.NEXT_PUBLIC_CHAPTER_LOCAL_PER_USD = "26000";
const { duesMonths, eventSalesUsd, joinedThisFy, liveRevenue, VND_PER_USD } = await import("./chapter-revenue.ts");

// FY2026/27 on 17 Nov: 37 members from before, Quan (10 Jun), John (1 Jul), Minh Anh (1 Sep).
const starts = [...Array(37).fill("2025-03-01"), "2026-06-10", "2026-07-01", "2026-09-01"];

test("FY2026/27: prorated dues, three initiation fees, RISE grant, no SAP cash, tickets", () => {
  const r = liveRevenue({ fyStart: 2026, memberStartDates: starts, duesRate: 2200, initiationFee: 2000, grants: 5000, sapCash: 0, events: 3690 });
  // 39 full years x 2,200 + Minh Anh's 10 months (1,833)
  assert.equal(r.dues, 85800 + 1833);
  assert.equal(r.newMembers, 3);
  assert.equal(r.initiation, 6000);
  assert.equal(r.total, 87633 + 6000 + 5000 + 0 + 3690);
  assert.equal(r.members, 40);
  assert.equal(r.perMember, Math.round(102323 / 40));
});

test("dues months: from the join month to June; a June join is a full next year", () => {
  assert.equal(duesMonths("2025-03-01", 2026), 12);
  assert.equal(duesMonths("2026-06-10", 2026), 12);
  assert.equal(duesMonths("2026-07-01", 2026), 12);
  assert.equal(duesMonths("2026-09-01", 2026), 10);
  assert.equal(duesMonths("2027-01-15", 2026), 6);
  assert.equal(duesMonths("2027-06-01", 2026), 1);
  assert.equal(duesMonths("2027-07-01", 2026), 0);
  assert.equal(duesMonths(null, 2026), 12);
});

test("this year's joins run from 1 June of the year before to 31 May", () => {
  assert.equal(joinedThisFy("2026-05-31", 2026), false);
  assert.equal(joinedThisFy("2026-06-01", 2026), true);
  assert.equal(joinedThisFy("2027-05-31", 2026), true);
  assert.equal(joinedThisFy("2027-06-01", 2026), false, "June 2027 joins pay into FY2027/28");
  assert.equal(joinedThisFy(null, 2026), false);
});

test("ticket sales: USD cents and whole JPY, cancellations excluded", () => {
  assert.equal(
    eventSalesUsd([
      { amountPaid: 10000, currency: "USD", status: "attended" },
      { amountPaid: 5000, currency: "usd", status: "registered" },
      { amountPaid: 2_400_000, currency: "JPY", status: "cancelled" },
      { amountPaid: VND_PER_USD * 10, currency: "JPY", status: "attended" },
      { amountPaid: 0, currency: "USD", status: "attended" },
    ]),
    160,
  );
});

test("no rates count nothing for them, and no members gives no per-member figure", () => {
  const r = liveRevenue({ fyStart: 2026, memberStartDates: starts, duesRate: null, initiationFee: null, grants: 5000, sapCash: 0, events: 0 });
  assert.equal(r.total, 5000);
  assert.equal(liveRevenue({ fyStart: 2026, memberStartDates: [], duesRate: 2200, initiationFee: 2000, grants: null, sapCash: 0, events: 0 }).perMember, null);
});
