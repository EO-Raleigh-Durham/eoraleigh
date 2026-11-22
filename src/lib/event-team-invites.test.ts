import assert from "node:assert/strict";
import test from "node:test";
import { CHAPTER_NAME } from "../kernel/config/chapter.ts";
import {
  buildTeamRegistrationUrl,
  canOfferTeamRegistration,
} from "./event-team-invites.ts";

test("buildTeamRegistrationUrl creates a focused, attributable RSVP link", () => {
  assert.equal(
    buildTeamRegistrationUrl("/events/art-of-belonging", {
      voucherCode: "TEAM 50",
      ticketTypeId: "guest-ticket",
      inviterTicketCode: "FOUNDER001",
    }),
    "/events/art-of-belonging?voucher=TEAM+50&ticket=guest-ticket&team=1&invite=FOUNDER001#rsvp",
  );
});

test("only normal, confirmed, full-price registrations receive a team offer", () => {
  const paidGuest = { status: "registered", reviewClassification: "normal", voucherId: null, ticketName: "Guest", amountPaid: 10000 };
  assert.equal(canOfferTeamRegistration(paidGuest), true);
  assert.equal(canOfferTeamRegistration({ ...paidGuest, status: "attended" }), true);
  assert.equal(canOfferTeamRegistration({ ...paidGuest, ticketName: `${CHAPTER_NAME} Member`, amountPaid: 0 }), true);
  assert.equal(canOfferTeamRegistration({ ...paidGuest, ticketName: "Staff", amountPaid: 0 }), false);
  assert.equal(canOfferTeamRegistration({ ...paidGuest, ticketName: "Staff Member", amountPaid: 0 }), false);
  assert.equal(canOfferTeamRegistration({ ...paidGuest, ticketName: "Non-member Guest", amountPaid: 0 }), false);
  assert.equal(canOfferTeamRegistration({ ...paidGuest, ticketName: "Sponsor", amountPaid: 0 }), false);
  assert.equal(canOfferTeamRegistration({ ...paidGuest, reviewClassification: "spam" }), false);
  assert.equal(canOfferTeamRegistration({ ...paidGuest, status: "pending_payment" }), false);
  assert.equal(canOfferTeamRegistration({ ...paidGuest, voucherId: "voucher" }), false);
});
