import assert from "node:assert/strict";
import test from "node:test";
import {
  clearOut,
  priorityQueue,
  prospectFunnel,
  prospectScoreboard,
  prospectSignals,
  type EventTouch,
  type ProspectDeal,
} from "./prospect-pipeline.ts";

const TODAY = "2026-11-17";
const FY = { start: "2026-07-01", end: "2027-07-01" };

let n = 0;
function deal(o: Partial<ProspectDeal> = {}): ProspectDeal {
  n += 1;
  return {
    id: `d${n}`,
    name: `Prospect ${n}`,
    stage: "Connect & Qualify",
    deal_status: "open",
    close_date: null,
    channel_source: null,
    last_activity_at: "2026-11-01T03:00:00Z",
    created_at: "2026-06-01T03:00:00Z",
    person_id: `p${n}`,
    ...o,
  };
}
const touch = (person_id: string, event_day: string, status = "attended"): EventTouch => ({
  person_id,
  status,
  event_title: "Event",
  event_day,
});

test("signals: event attendance refreshes the last touch", () => {
  const d = deal({ last_activity_at: "2026-07-24T00:00:00Z" });
  const s = prospectSignals(d, [touch(d.person_id!, "2026-11-13"), touch(d.person_id!, "2026-07-23")], TODAY);
  assert.equal(s.lastTouchDay, "2026-11-13");
  assert.equal(s.daysSinceTouch, 4);
  assert.equal(s.attendedCount, 2);
  assert.equal(s.lastAttended?.daysAgo, 4);
  assert.equal(s.daysSinceActivity, 116);
});

test("signals: future registration is upcoming, not attended", () => {
  const d = deal();
  const s = prospectSignals(d, [touch(d.person_id!, "2026-12-17", "registered")], TODAY);
  assert.equal(s.upcoming?.daysUntil, 30);
  assert.equal(s.attendedCount, 0);
});

test("queue ranks warmth over age; dead and just-contacted leave the list", () => {
  const oldStale = deal({ name: "OldStale", stage: "Experience EO", last_activity_at: "2026-09-01T00:00:00Z" });
  const hot = deal({ name: "Hot", stage: "Experience EO", channel_source: "Referrals", last_activity_at: "2026-07-24T00:00:00Z" });
  const coming = deal({ name: "Coming", last_activity_at: "2026-10-07T00:00:00Z" });
  const dead = deal({ name: "Dead", last_activity_at: "2026-06-29T00:00:00Z" });
  const justDone = deal({ name: "JustDone", stage: "Interview", last_activity_at: "2026-11-16T09:00:00Z" });
  const won = deal({ name: "Won", deal_status: "closed_won" });
  const touches = [touch(hot.person_id!, "2026-11-13"), touch(coming.person_id!, "2026-12-17", "registered")];
  const q = priorityQueue([oldStale, hot, coming, dead, justDone, won], touches, TODAY);
  assert.deepEqual(q.map((i) => i.deal.name), ["Hot", "Coming", "OldStale"]);
  assert.deepEqual(q[0].reasons.map((r) => r.text), ["Attended 13 Nov", "Referral", "Experience EO"]);
  assert.equal(q[0].score, 20 + 60 + 10 + 15);
});

test("clear-out: 90+ days quiet with nothing upcoming, quietest first", () => {
  const a = deal({ name: "A", last_activity_at: "2026-08-01T00:00:00Z" }); // 108d
  const b = deal({ name: "B", last_activity_at: "2026-06-29T00:00:00Z" }); // 141d
  const saved = deal({ name: "Saved", last_activity_at: "2026-06-29T00:00:00Z" });
  const recent = deal({ name: "Recent", last_activity_at: "2026-09-01T00:00:00Z" }); // 77d
  const fresh = deal({ name: "Fresh", last_activity_at: null, created_at: "2026-10-30T00:00:00Z" });
  const out = clearOut([a, b, saved, recent, fresh], [touch(saved.person_id!, "2026-12-17", "registered")], TODAY);
  assert.deepEqual(out.map((i) => i.deal.name), ["B", "A"]);
});

test("scoreboard: FY wins against target; dead leads do not count as pipeline", () => {
  const deals = [
    deal({ deal_status: "closed_won", close_date: "2026-09-01T00:00:00Z" }),
    deal({ deal_status: "closed_won", close_date: "2026-05-01T00:00:00Z" }), // prior FY
    deal({ deal_status: "closed_lost", close_date: "2026-10-01T00:00:00Z" }),
    deal({ stage: "Experience EO" }),
    deal({ stage: "Interview" }),
    deal({ last_activity_at: "2026-06-01T00:00:00Z" }), // dead
  ];
  const s = prospectScoreboard(deals, [], FY, 24, TODAY);
  assert.equal(s.won, 1);
  assert.equal(s.lost, 1);
  assert.equal(s.remaining, 23);
  assert.equal(s.live, 2);
  assert.equal(s.dead, 1);
  assert.equal(s.expected, 0.9);
  assert.equal(s.coverage, 0.1);
});

test("funnel lists every open stage in order", () => {
  const rows = prospectFunnel([deal({ stage: "Experience EO" }), deal({ stage: "Experience EO" }), deal()]);
  assert.equal(rows.length, 6);
  assert.equal(rows[0].count, 1);
  assert.equal(rows[1].count, 2);
});
