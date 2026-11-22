import assert from "node:assert/strict";
import test from "node:test";
import { RECEIPT_TTL_MS, issueReceipt, receiptProblem } from "./receipt.ts";

process.env.MCP_RECEIPT_SECRET = "test-secret";
const s = { personId: "p1", clientId: "claude", tool: "sap_update_deal" };
const fields = { dealId: "d1", stage: "proposal" };

test("a receipt matches only the same person, app, tool and fields, until it expires", () => {
  const now = 1_000_000;
  const r = issueReceipt(s, fields, now);
  assert.equal(receiptProblem(s, fields, r, now + 1000), null);
  assert.equal(receiptProblem(s, { stage: "proposal", dealId: "d1" }, r, now), null, "key order does not matter");
  assert.match(receiptProblem(s, { ...fields, stage: "won" }, r, now)!, /does not match/);
  assert.match(receiptProblem({ ...s, personId: "p2" }, fields, r, now)!, /does not match/);
  assert.match(receiptProblem({ ...s, clientId: "chatgpt" }, fields, r, now)!, /does not match/);
  assert.match(receiptProblem({ ...s, tool: "sap_close_deal" }, fields, r, now)!, /does not match/);
  assert.match(receiptProblem(s, fields, r, now + RECEIPT_TTL_MS + 1)!, /expired/);
  assert.match(receiptProblem(s, fields, undefined, now)!, /needs the receipt/);
  assert.match(receiptProblem(s, fields, "true", now)!, /needs the receipt/);
  const [, mac] = r.split(".");
  assert.match(receiptProblem(s, fields, `${now + 10 * RECEIPT_TTL_MS}.${mac}`, now)!, /does not match/, "a forged expiry fails");
});
