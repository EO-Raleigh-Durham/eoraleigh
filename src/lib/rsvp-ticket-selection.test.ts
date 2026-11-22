import assert from "node:assert/strict";
import test from "node:test";
import { getInitialTicketId } from "./rsvp-ticket-selection.ts";

const MEMBER = { id: "member-ticket" };
const GUEST = { id: "guest-ticket" };

test("two tickets start with nothing selected", () => {
  assert.equal(getInitialTicketId({ tickets: [MEMBER, GUEST] }), "");
});

test("a single ticket is selected because there is nothing to choose", () => {
  assert.equal(getInitialTicketId({ tickets: [GUEST] }), "guest-ticket");
});

test("no tickets selects nothing", () => {
  assert.equal(getInitialTicketId({ tickets: [] }), "");
});

test("a preferred ticket from the link wins", () => {
  assert.equal(
    getInitialTicketId({
      tickets: [MEMBER, GUEST],
      preferredTicketId: "guest-ticket",
      initialTicketTypeId: "member-ticket",
    }),
    "guest-ticket",
  );
});

test("a ticket named by a voucher or team link is selected when it is offered", () => {
  assert.equal(
    getInitialTicketId({ tickets: [MEMBER, GUEST], initialTicketTypeId: "guest-ticket" }),
    "guest-ticket",
  );
});

test("a named ticket that is not offered falls back to no selection", () => {
  assert.equal(
    getInitialTicketId({ tickets: [MEMBER, GUEST], initialTicketTypeId: "retired-ticket" }),
    "",
  );
});
