import assert from "node:assert/strict";
import test from "node:test";
import { isNonRefundableEvent, noShowFeeForEvent } from "./event-fee-overrides.ts";

test("Forum Training events (type forum, title contains training) get the $250 fee", () => {
  assert.equal(
    noShowFeeForEvent({ id: "e1", type: "forum", title: "SLP Forum Training with Naeda Cheri" }),
    250,
  );
});

test("non-training Forum events stay at the standard $200 fee", () => {
  assert.equal(
    noShowFeeForEvent({ id: "e2", type: "forum", title: "Forum Reformation Workshop" }),
    200,
  );
});

test("other event types stay at the standard $200 fee regardless of title", () => {
  assert.equal(
    noShowFeeForEvent({ id: "e3", type: "learning", title: "Leadership Training Day" }),
    200,
  );
});

test("missing type or title never crashes and defaults to $200", () => {
  assert.equal(noShowFeeForEvent({ id: "e4" }), 200);
  assert.equal(noShowFeeForEvent({ id: "e5", type: null, title: null }), 200);
});

test("Chapter Retreat 2026 is non-refundable", () => {
  assert.equal(isNonRefundableEvent({ id: "4e798f9d-3d3a-40d9-aaae-d829a5a0e272" }), true);
});

test("other events keep the standard cancellation policy", () => {
  assert.equal(isNonRefundableEvent({ id: "e1" }), false);
  assert.equal(isNonRefundableEvent({ id: "" }), false);
});
