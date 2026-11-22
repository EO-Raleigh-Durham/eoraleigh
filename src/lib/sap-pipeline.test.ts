import assert from "node:assert/strict";
import test from "node:test";
import {
  actionQueue,
  addDays,
  cashOf,
  dealFyStart,
  funnel,
  inKindOf,
  ownerRollup,
  resolveStage,
  scoreboard,
  type PipelineDeal,
} from "./sap-pipeline.ts";

const TODAY = "2026-11-17";
const FY = { start: "2026-07-01", end: "2027-07-01" };

let n = 0;
function deal(o: Partial<PipelineDeal> = {}): PipelineDeal {
  n += 1;
  return {
    id: `d${n}`,
    companyName: `Co ${n}`,
    status: "lead",
    pipeline_stage: null,
    amount_usd: 0,
    cash_usd: null,
    in_kind_usd: null,
    deal_owner: "TK",
    last_contact_at: TODAY,
    next_followup_at: addDays(TODAY, 20),
    next_step: null,
    closed_won_at: null,
    created_at: "2026-11-01T00:00:00Z",
    ...o,
  };
}

test("stage resolution", () => {
  assert.equal(resolveStage({ status: "lead", pipeline_stage: null }), "lead");
  assert.equal(resolveStage({ status: "in_discussion", pipeline_stage: null }), "in_discussion");
  assert.equal(resolveStage({ status: "in_discussion", pipeline_stage: "proposal" }), "proposal");
  assert.equal(resolveStage({ status: "active", pipeline_stage: "proposal" }), "won");
  assert.equal(resolveStage({ status: "lost", pipeline_stage: "meeting" }), "lost");
});

test("cash split defaults: legacy amount is cash, partial splits fill the remainder", () => {
  assert.equal(cashOf({ amount_usd: 5000, cash_usd: null, in_kind_usd: null }), 5000);
  assert.equal(inKindOf({ amount_usd: 5000, cash_usd: null, in_kind_usd: null }), 0);
  assert.equal(cashOf({ amount_usd: 15000, cash_usd: 10000, in_kind_usd: 5000 }), 10000);
  assert.equal(cashOf({ amount_usd: 6100, cash_usd: null, in_kind_usd: 6100 }), 0);
  assert.equal(inKindOf({ amount_usd: 8000, cash_usd: 5000, in_kind_usd: null }), 3000);
});

test("scoreboard: cash secured counts only FY wins; coverage uses open cash over remaining", () => {
  const deals = [
    deal({ status: "active", amount_usd: 6100, in_kind_usd: 6100, cash_usd: 0, closed_won_at: "2026-10-07" }),
    deal({ status: "active", amount_usd: 5000, closed_won_at: "2026-08-01" }), // legacy: all cash
    deal({ status: "active", amount_usd: 9999, closed_won_at: "2026-05-01" }), // prior FY
    deal({ status: "active", amount_usd: 9999, closed_won_at: null }), // no date: no year
    deal({ status: "in_discussion", pipeline_stage: "proposal", amount_usd: 15000, cash_usd: 10000, in_kind_usd: 5000 }),
    deal({ status: "lead", amount_usd: 10000 }),
    deal({ status: "lost", amount_usd: 5000 }),
  ];
  const s = scoreboard(deals, FY, 30000);
  assert.equal(s.cashSecured, 5000);
  assert.equal(s.inKindSecured, 6100);
  assert.equal(s.wonCount, 2);
  assert.equal(s.remaining, 25000);
  assert.equal(s.openCount, 2);
  assert.equal(s.openTotal, 25000);
  assert.equal(s.openCash, 20000);
  assert.equal(s.weightedCash, 10000 * 0.6 + 10000 * 0.1);
  assert.equal(s.coverage, 0.8);
  assert.equal(s.forecastCash, 5000 + 7000);
});

test("scoreboard: coverage is null once the target is met", () => {
  const s = scoreboard([deal({ status: "active", amount_usd: 40000, closed_won_at: "2026-09-01" })], FY, 30000);
  assert.equal(s.remaining, 0);
  assert.equal(s.coverage, null);
});

test("funnel orders open stages and hides empty unstaged in-discussion", () => {
  const rows = funnel([
    deal({ status: "lead", amount_usd: 3000 }),
    deal({ status: "lead", amount_usd: 2000 }),
    deal({ status: "in_discussion", pipeline_stage: "meeting", amount_usd: 8000 }),
    deal({ status: "active", amount_usd: 9000 }),
  ]);
  assert.deepEqual(rows.map((r) => r.stage), ["lead", "contacted", "meeting", "proposal"]);
  assert.deepEqual(rows[0], { stage: "lead", count: 2, total: 5000, weight: 0.1 });
  assert.equal(rows[2].count, 1);
  const withUnstaged = funnel([deal({ status: "in_discussion", amount_usd: 1 })]);
  assert.ok(withUnstaged.some((r) => r.stage === "in_discussion"));
});

test("action queue: one row per deal, most urgent reason, sensible order", () => {
  const overdue2 = deal({ companyName: "Overdue2", next_followup_at: "2026-11-15" });
  const overdue7 = deal({ companyName: "Overdue7", next_followup_at: "2026-11-10" });
  const dueTomorrow = deal({ companyName: "Due1", next_followup_at: "2026-11-18" });
  const dueToday = deal({ companyName: "Due0", next_followup_at: TODAY });
  const noStepBig = deal({ companyName: "NoStepBig", next_followup_at: null, amount_usd: 10000 });
  const noStepSmall = deal({ companyName: "NoStepSmall", next_followup_at: null, amount_usd: 3000 });
  const stale = deal({ companyName: "Stale", last_contact_at: "2026-09-23" });
  const neverContactedOld = deal({ companyName: "NeverOld", last_contact_at: null, created_at: "2026-09-01T00:00:00Z" });
  const fine = deal({ companyName: "Fine" });
  const won = deal({ status: "active", next_followup_at: "2026-11-01" });
  const lost = deal({ status: "lost", next_followup_at: null });
  const q = actionQueue(
    [fine, won, lost, stale, noStepSmall, dueTomorrow, overdue2, neverContactedOld, noStepBig, dueToday, overdue7],
    TODAY,
  );
  assert.deepEqual(
    q.map((i) => `${i.reason}:${i.deal.companyName}`),
    [
      "overdue:Overdue7",
      "overdue:Overdue2",
      "due_soon:Due0",
      "due_soon:Due1",
      "no_next_step:NoStepBig",
      "no_next_step:NoStepSmall",
      "stale:Stale",
      "stale:NeverOld",
    ],
  );
  assert.equal(q[0].days, 7);
  assert.equal(q.find((i) => i.deal.companyName === "Stale")!.days, 55);
});

test("action queue: overdue wins over stale on the same deal", () => {
  const q = actionQueue([deal({ next_followup_at: "2026-11-01", last_contact_at: "2026-01-01" })], TODAY);
  assert.equal(q.length, 1);
  assert.equal(q[0].reason, "overdue");
});

test("owner rollup sorts by weighted value and buckets blank owners", () => {
  const rows = ownerRollup(
    [
      deal({ deal_owner: "TK", status: "in_discussion", pipeline_stage: "proposal", amount_usd: 10000, next_followup_at: "2026-11-01" }),
      deal({ deal_owner: "TK", status: "lead", amount_usd: 10000 }),
      deal({ deal_owner: "Grace", status: "in_discussion", pipeline_stage: "meeting", amount_usd: 5000 }),
      deal({ deal_owner: null, status: "lead", amount_usd: 1000 }),
      deal({ deal_owner: "TK", status: "lost", amount_usd: 99999 }),
    ],
    TODAY,
  );
  assert.deepEqual(rows[0], { owner: "TK", open: 2, weighted: 7000, overdue: 1, advanced: 1 });
  assert.deepEqual(rows[1], { owner: "Grace", open: 1, weighted: 2000, overdue: 0, advanced: 1 });
  assert.equal(rows[2].owner, "Unassigned");
});

test("fiscal year: won by close date, lost by lost date, open is current", () => {
  assert.equal(dealFyStart({ status: "lead", closed_won_at: null }, 2026), 2026);
  assert.equal(dealFyStart({ status: "in_discussion", closed_won_at: null }, 2026), 2026);
  assert.equal(dealFyStart({ status: "active", closed_won_at: "2026-10-07" }, 2026), 2026);
  assert.equal(dealFyStart({ status: "active", closed_won_at: "2026-06-30" }, 2026), 2025);
  assert.equal(dealFyStart({ status: "active", closed_won_at: "2026-07-01" }, 2026), 2026);
  assert.equal(dealFyStart({ status: "active", closed_won_at: null }, 2026), null);
  assert.equal(dealFyStart({ status: "lost", closed_won_at: null, lost_at: "2026-05-12T03:00:00Z" }, 2026), 2025);
  assert.equal(dealFyStart({ status: "lost", closed_won_at: null, lost_at: "2026-11-02T03:00:00Z" }, 2026), 2026);
  assert.equal(dealFyStart({ status: "lost", closed_won_at: null }, 2026), null);
});
