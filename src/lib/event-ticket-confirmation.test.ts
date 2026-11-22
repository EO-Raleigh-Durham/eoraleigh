import assert from "node:assert/strict";
import test from "node:test";
// Node's built-in type stripping requires the explicit extension here.
import { deliverTicketConfirmation } from "./event-ticket-confirmation.ts";

test("records a ticket confirmation only after delivery succeeds", async () => {
  let recorded = 0;

  const result = await deliverTicketConfirmation({
    send: async () => true,
    recordSent: async () => {
      recorded += 1;
    },
  });

  assert.deepEqual(result, { sent: true, recorded: true });
  assert.equal(recorded, 1);
});

test("does not record a ticket confirmation when delivery fails", async () => {
  let recorded = 0;

  const result = await deliverTicketConfirmation({
    send: async () => false,
    recordSent: async () => {
      recorded += 1;
    },
  });

  assert.deepEqual(result, { sent: false, recorded: false });
  assert.equal(recorded, 0);
});

test("reports bookkeeping failures without turning a sent email into a failed delivery", async () => {
  const failure = new Error("database unavailable");

  const result = await deliverTicketConfirmation({
    send: async () => true,
    recordSent: async () => {
      throw failure;
    },
  });

  assert.equal(result.sent, true);
  assert.equal(result.recorded, false);
  if (!result.recorded) assert.equal(result.error, failure);
});
