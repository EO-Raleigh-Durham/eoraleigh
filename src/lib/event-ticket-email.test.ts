import assert from "node:assert/strict";
import test from "node:test";
import { shouldSendEventTicketEmail } from "./event-ticket-email.ts";

test("does not send a ticket email for a cancelled exact webhook retry", () => {
  assert.equal(
    shouldSendEventTicketEmail({
      status: "cancelled",
      confirmationSentAt: null,
    }),
    false,
  );
});

test("allows unsent ticket emails only for active registrations", () => {
  assert.equal(
    shouldSendEventTicketEmail({
      status: "registered",
      confirmationSentAt: null,
    }),
    true,
  );
  assert.equal(
    shouldSendEventTicketEmail({
      status: "attended",
      confirmationSentAt: null,
    }),
    true,
  );
  assert.equal(
    shouldSendEventTicketEmail({
      status: "registered",
      confirmationSentAt: "2026-09-01T00:00:00.000Z",
    }),
    false,
  );
});
