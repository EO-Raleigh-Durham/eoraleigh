import assert from "node:assert/strict";
import test from "node:test";
import {
  TICKET_LOOKUP_ERROR,
  isTicketSoldOutError,
  selectEventTicket,
} from "./event-ticket-selection.ts";

const member = { id: "ticket-member", price_amount: 0 };
const guest = { id: "ticket-guest", price_amount: 2500000 };

test("a failed ticket lookup stops the registration instead of pricing it by the event", () => {
  assert.deepEqual(
    selectEventTicket({ tickets: null, lookupFailed: true, ticketTypeId: guest.id }),
    { ok: false, error: TICKET_LOOKUP_ERROR },
  );
  assert.deepEqual(
    selectEventTicket({ tickets: null, lookupFailed: true, ticketTypeId: "" }),
    { ok: false, error: TICKET_LOOKUP_ERROR },
  );
});

test("an event with no active tickets is priced by the event", () => {
  assert.deepEqual(
    selectEventTicket({ tickets: [], lookupFailed: false, ticketTypeId: "" }),
    { ok: true, ticket: null },
  );
  assert.deepEqual(
    selectEventTicket({ tickets: null, lookupFailed: false, ticketTypeId: "" }),
    { ok: true, ticket: null },
  );
});

test("a ticketed event requires one of its own active tickets", () => {
  const tickets = [member, guest];

  assert.deepEqual(
    selectEventTicket({ tickets, lookupFailed: false, ticketTypeId: "" }),
    { ok: false, error: "Please choose a ticket" },
  );
  assert.deepEqual(
    selectEventTicket({ tickets, lookupFailed: false, ticketTypeId: "ticket-from-another-event" }),
    { ok: false, error: "Invalid ticket selection" },
  );
});

test("the chosen ticket, free or paid, is returned with its server-side price", () => {
  const tickets = [member, guest];

  assert.deepEqual(
    selectEventTicket({ tickets, lookupFailed: false, ticketTypeId: guest.id }),
    { ok: true, ticket: guest },
  );
  assert.deepEqual(
    selectEventTicket({ tickets, lookupFailed: false, ticketTypeId: member.id }),
    { ok: true, ticket: member },
  );
});

test("only the database's sold-out answer is treated as a sold-out ticket", () => {
  assert.equal(isTicketSoldOutError("ticket_sold_out"), true);
  assert.equal(isTicketSoldOutError("duplicate key value violates unique constraint"), false);
  assert.equal(isTicketSoldOutError("Could not find the function public.register_for_event"), false);
  assert.equal(isTicketSoldOutError(""), false);
  assert.equal(isTicketSoldOutError(null), false);
});
