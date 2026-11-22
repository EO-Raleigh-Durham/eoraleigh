import assert from "node:assert/strict";
import test from "node:test";
import type { EventRegistration } from "./events.ts";
import { occupiedSeats } from "./event-registration-review.ts";
import {
  activeRosterPeopleCount,
  filterRosterRegistrations,
  isMemberTicket,
  registrationAmountCents,
  registrationCompanies,
  registrationDetailAttendees,
  isRosterPaymentDue,
  rosterFilterCounts,
} from "./rsvp-roster.ts";

function registration(
  id: string,
  status: EventRegistration["status"],
  review: EventRegistration["review_classification"] = "normal",
): EventRegistration {
  return {
    id,
    event_id: "event-1",
    person_id: `person-${id}`,
    status,
    waitlist_position: null,
    guest_count: 0,
    confirmed_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    notes: null,
    stripe_session_id: null,
    stripe_payment_intent_id: null,
    amount_paid: null,
    price_final_total: null,
    paid_at: null,
    ticket_code: null,
    checked_in_at: null,
    waiver_accepted_at: null,
    review_classification: review,
    invited_by_registration_id: null,
    invited_by_person_id: null,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    person: {
      id: `person-${id}`,
      name: id === "harley" ? "Harley Trung" : id,
      email: `${id}@example.com`,
    },
  };
}

test("active roster hides cancelled, no-show, and spam registrations", () => {
  const rows = [
    registration("harley", "registered"),
    registration("pending", "pending_payment"),
    registration("waitlist", "waitlisted"),
    registration("attended", "attended"),
    registration("cancelled", "cancelled"),
    registration("no-show", "no_show"),
    registration("spam", "registered", "spam"),
  ];

  assert.deepEqual(
    filterRosterRegistrations(rows, "active", "").map((row) => row.id),
    ["harley", "pending", "waitlist", "attended"],
  );
  assert.deepEqual(rosterFilterCounts(rows), {
    active: 4,
    cancelled: 1,
    spam: 1,
    prospects: 0,
    all: 7,
  });
});

test("active roster people count includes every person in a group registration", () => {
  const group = registration("group", "registered");
  group.guest_count = 2;
  const pending = registration("pending", "pending_payment");
  pending.guest_count = 1;
  const waitlist = registration("waitlist", "waitlisted");
  waitlist.guest_count = 3;
  const cancelled = registration("cancelled", "cancelled");
  cancelled.guest_count = 4;
  const noShow = registration("no-show", "no_show");
  noShow.guest_count = 5;
  const spam = registration("spam", "registered", "spam");
  spam.guest_count = 6;

  assert.equal(
    activeRosterPeopleCount([
      group,
      pending,
      waitlist,
      cancelled,
      noShow,
      spam,
    ]),
    9,
  );
});

test("prospect filter composes with lifecycle filters", () => {
  const prospect = registration("prospect", "registered");
  prospect.is_prospect = true;
  const ordinary = registration("ordinary", "registered");
  const cancelledProspect = registration("cancelled-prospect", "cancelled");
  cancelledProspect.is_prospect = true;

  assert.deepEqual(
    filterRosterRegistrations(
      [prospect, ordinary, cancelledProspect],
      "active",
      "",
      "all",
      "prospects",
    ).map((row) => row.id),
    ["prospect"],
  );
  assert.deepEqual(
    filterRosterRegistrations(
      [prospect, ordinary, cancelledProspect],
      "all",
      "",
      "all",
      "prospects",
    ).map((row) => row.id),
    ["prospect", "cancelled-prospect"],
  );
  assert.equal(rosterFilterCounts([prospect, ordinary, cancelledProspect]).prospects, 2);
});

test("company display uses only attendee-entered values", () => {
  const row = registration("company", "registered");
  row.attendees = [
    {
      id: "attendee-1",
      registration_id: row.id,
      full_name: "Lien",
      email: "lien@example.com",
      phone: "",
      company: " Dreamlab ",
      title: null,
      food_allergy: null,
      created_at: row.created_at,
    },
    {
      id: "attendee-2",
      registration_id: row.id,
      full_name: "Colleague",
      email: "colleague@example.com",
      phone: "",
      company: "Dreamlab",
      title: null,
      food_allergy: null,
      created_at: row.created_at,
    },
  ];

  assert.deepEqual(registrationCompanies(row), ["Dreamlab"]);
  assert.deepEqual(registrationCompanies(registration("blank", "registered")), []);
});

test("payment amount prefers the charged or final price and keeps free rows at zero", () => {
  const paid = registration("paid", "registered");
  paid.amount_paid = 5000;
  paid.price_final_total = 5000;
  assert.equal(registrationAmountCents(paid), 5000);

  const voucherPending = registration("voucher-pending", "pending_payment");
  voucherPending.price_final_total = 10000;
  assert.equal(registrationAmountCents(voucherPending), 10000);

  const standardPending = registration("standard-pending", "pending_payment");
  standardPending.ticket_type = {
    name: "Guest",
    price_amount: 5000,
    currency: "USD",
  };
  assert.equal(registrationAmountCents(standardPending), 5000);

  const groupPending = registration("group-pending", "pending_payment");
  groupPending.ticket_type = {
    id: "group-ticket",
    name: "Guest",
    price_amount: 5000,
    currency: "USD",
    max_attendees: 4,
  };
  groupPending.guest_count = 2;
  assert.equal(registrationAmountCents(groupPending), 15000);

  const memberWithGuest = registration("member-with-guest", "pending_payment");
  memberWithGuest.guest_count = 1;
  assert.equal(registrationAmountCents(memberWithGuest, 0, 10000), 10000);

  memberWithGuest.ticket_type = {
    id: "member-ticket",
    name: "EO Example Member",
    price_amount: 0,
    max_attendees: 1,
  };
  const ticketTierGuestPrice = [
    {
      id: "member-ticket",
      event_id: "event",
      name: "EO Example Member",
      description: null,
      price_amount: 0,
      currency: "USD",
      capacity: null,
      max_attendees: 1,
      sort_order: 0,
      active: true,
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
    },
    {
      id: "guest-ticket",
      event_id: "event",
      name: "Guest",
      description: null,
      price_amount: 10000,
      currency: "USD",
      capacity: null,
      max_attendees: 3,
      sort_order: 1,
      active: true,
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
    },
  ];
  assert.equal(
    registrationAmountCents(memberWithGuest, 0, 0, ticketTierGuestPrice),
    10000,
  );

  const complimentary = registration("complimentary", "registered");
  complimentary.amount_paid = 0;
  complimentary.price_final_total = 0;
  complimentary.ticket_type = { name: "Guest", price_amount: 5000 };
  assert.equal(registrationAmountCents(complimentary), 0);
});

test("payment due excludes inactive and spam registrations", () => {
  const pending = registration("pending", "pending_payment");
  assert.equal(isRosterPaymentDue(pending, 5000), true);

  const cancelled = registration("cancelled", "cancelled");
  assert.equal(isRosterPaymentDue(cancelled, 5000), false);

  const noShow = registration("no-show", "no_show");
  assert.equal(isRosterPaymentDue(noShow, 5000), false);

  const spam = registration("spam", "registered", "spam");
  assert.equal(isRosterPaymentDue(spam, 5000), false);
});

test("waitlisted registrations stay visible without consuming capacity", () => {
  const registered = registration("registered", "registered");
  registered.guest_count = 1;
  const rows = [
    registered,
    registration("pending", "pending_payment"),
    registration("waitlist", "waitlisted"),
    registration("attended", "attended"),
    registration("cancelled", "cancelled"),
  ];

  assert.deepEqual(
    filterRosterRegistrations(rows, "active", "").map((row) => row.id),
    ["registered", "pending", "waitlist", "attended"],
  );
  assert.equal(occupiedSeats(rows), 4);
});

test("search matches names and emails within the selected filter", () => {
  const rows = [
    registration("harley", "registered"),
    registration("elaine", "registered"),
  ];
  assert.deepEqual(
    filterRosterRegistrations(rows, "active", "HARLEY").map((row) => row.id),
    ["harley"],
  );
  assert.deepEqual(
    filterRosterRegistrations(rows, "active", "elaine@example").map((row) => row.id),
    ["elaine"],
  );

  const invitee = registration("invitee", "registered");
  invitee.invited_by_registration_id = "registration-harley";
  invitee.invited_by_person_id = "person-harley";
  invitee.inviter = {
    id: "registration-harley",
    person: {
      id: "person-harley",
      name: "Harley Trung",
      email: "harley@example.com",
    },
  };
  assert.deepEqual(
    filterRosterRegistrations([invitee], "active", "harley").map((row) => row.id),
    ["invitee"],
  );
});

test("inviter filter composes with status and supports unattributed rows", () => {
  const invited = registration("invited", "registered");
  invited.invited_by_person_id = "harley";
  const otherInvite = registration("other", "registered");
  otherInvite.invited_by_person_id = "lan";
  const unattributed = registration("unattributed", "registered");
  const cancelledInvite = registration("cancelled-invite", "cancelled");
  cancelledInvite.invited_by_person_id = "harley";
  const rows = [invited, otherInvite, unattributed, cancelledInvite];

  assert.deepEqual(
    filterRosterRegistrations(rows, "active", "", "harley").map((row) => row.id),
    ["invited"],
  );
  assert.deepEqual(
    filterRosterRegistrations(rows, "active", "", "none").map((row) => row.id),
    ["unattributed"],
  );
});

test("roster shows the latest registrations first", () => {
  const older = registration("older", "registered");
  older.created_at = "2026-07-01T00:00:00.000Z";
  const newest = registration("newest", "registered");
  newest.created_at = "2026-07-19T05:20:00.000Z";
  const middle = registration("middle", "registered");
  middle.created_at = "2026-07-10T12:00:00.000Z";

  assert.deepEqual(
    filterRosterRegistrations([older, newest, middle], "active", "").map(
      (row) => row.id,
    ),
    ["newest", "middle", "older"],
  );
});

test("member marker excludes guests, non-members, and member staff", () => {
  assert.equal(isMemberTicket("EO Example Member"), true);
  assert.equal(isMemberTicket("Member"), true);
  assert.equal(isMemberTicket("EO Guests, SLPs"), false);
  assert.equal(isMemberTicket("Non-Member"), false);
  assert.equal(isMemberTicket("EO Member Staff"), false);
});

test("dinner registrations get a details row from their note lines", () => {
  const row = {
    ...registration("elaine", "registered"),
    notes: "Phone: +44 7700 900 123\nAllergies or dietary needs: shellfish",
  };
  const [detail, ...rest] = registrationDetailAttendees(row);
  assert.equal(rest.length, 0);
  assert.equal(detail.full_name, "elaine");
  assert.equal(detail.email, "elaine@example.com");
  assert.equal(detail.phone, "+44 7700 900 123");
  assert.equal(detail.food_allergy, "shellfish");
});

test("a registration with no attendee rows and no dinner note lines has no details panel", () => {
  assert.deepEqual(registrationDetailAttendees(registration("plain", "registered")), []);
  const staffNote = { ...registration("plain", "registered"), notes: "Called to confirm" };
  assert.deepEqual(registrationDetailAttendees(staffNote), []);
});

test("real attendee rows are shown as they are", () => {
  const attendee = {
    id: "a1",
    registration_id: "x",
    full_name: "Real Person",
    email: "real@example.com",
    phone: "0900",
    company: null,
    title: null,
    food_allergy: null,
    created_at: "2026-07-01T00:00:00.000Z",
  };
  const row = { ...registration("x", "registered"), attendees: [attendee], notes: "Phone: 111" };
  assert.deepEqual(registrationDetailAttendees(row), [attendee]);
});
