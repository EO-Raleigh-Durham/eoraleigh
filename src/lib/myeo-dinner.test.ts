import assert from "node:assert/strict";
import test from "node:test";
import {
  DINNER_ALLERGY_MAX,
  DINNER_MENU,
  DINNER_VENUE_PHOTO,
  DINNER_TICKET_GUEST,
  DINNER_TICKET_MEMBER,
  MYEO_DINNER_SLUG,
  RISE4_REGISTRATION_HREF,
  DINNER_ALLERGY_ERROR,
  DINNER_PHONE_ERROR,
  GUEST_INVITATION_ERROR,
  dinnerAllergyNote,
  dinnerMissingFieldError,
  dinnerPhoneNote,
  noteLineValue,
  guestTicketNeedsInvitation,
  invitationCodeAllowed,
  findDinnerTicketId,
} from "./myeo-dinner.ts";
import { usesRise4GuestVetting } from "./rise4-guest-vetting.ts";

const MEMBER = { id: "t-member", name: DINNER_TICKET_MEMBER, active: true };
const GUEST = { id: "t-guest", name: DINNER_TICKET_GUEST, active: true };
const ALL = [MEMBER, GUEST];

test("each path maps to its own ticket", () => {
  assert.equal(findDinnerTicketId(ALL, "member"), "t-member");
  assert.equal(findDinnerTicketId(ALL, "guest"), "t-guest");
});

test("ticket names match without regard to case or surrounding spaces", () => {
  const tickets = [
    { id: "b", name: ` ${DINNER_TICKET_MEMBER.toLowerCase()} ` },
    { id: "c", name: " GUEST" },
  ];
  assert.equal(findDinnerTicketId(tickets, "member"), "b");
  assert.equal(findDinnerTicketId(tickets, "guest"), "c");
});

test("a missing or renamed ticket returns an empty id so the form shows its picker", () => {
  assert.equal(findDinnerTicketId([MEMBER], "guest"), "");
  assert.equal(findDinnerTicketId([], "member"), "");
  assert.equal(
    findDinnerTicketId([{ id: "x", name: "Dinner only" }], "guest"),
    "",
  );
});

test("an inactive ticket is never preselected", () => {
  assert.equal(findDinnerTicketId([{ ...GUEST, active: false }], "guest"), "");
});

test("the RISE 4 link points at the live RISE 4 registration anchor", () => {
  assert.ok(RISE4_REGISTRATION_HREF.startsWith("/events/eo-rise-4"));
  assert.ok(RISE4_REGISTRATION_HREF.endsWith("#rsvp"));
});

test("the dinner slug is the one the board form creates", () => {
  assert.equal(MYEO_DINNER_SLUG, "myeo-beneath-the-chopsticks");
});

test("dinner guests are not put through the RISE 4 guest questions", () => {
  assert.equal(usesRise4GuestVetting({ slug: MYEO_DINNER_SLUG }), false);
});

test("the dinner menu lists seven named courses, each with ingredients", () => {
  assert.equal(DINNER_MENU.length, 7);
  for (const course of DINNER_MENU) {
    assert.ok(course.name.trim().length > 0);
    assert.ok(course.ingredients.length > 0);
    for (const item of course.ingredients) assert.ok(item.trim().length > 0);
  }
  assert.equal(new Set(DINNER_MENU.map((c) => c.name)).size, 7);
});

test("the menu opens with the salad and closes with the gelato", () => {
  assert.equal(DINNER_MENU[0].name, "Tomato Salad");
  assert.equal(DINNER_MENU[6].name, "Adzuki Bean Gelato");
});

test("the venue photo points at the committed file with its real size", () => {
  assert.ok(DINNER_VENUE_PHOTO.src.startsWith("/images/events/myeo-beneath-the-chopsticks/"));
  assert.ok(DINNER_VENUE_PHOTO.alt.length > 20);
  assert.ok(DINNER_VENUE_PHOTO.width > 0 && DINNER_VENUE_PHOTO.height > 0);
});

test("an empty or blank allergy answer adds no note", () => {
  assert.equal(dinnerAllergyNote(""), "");
  assert.equal(dinnerAllergyNote("   "), "");
  assert.equal(dinnerAllergyNote(null), "");
  assert.equal(dinnerAllergyNote(undefined), "");
});

test("an allergy answer is trimmed, flattened and prefixed for the roster", () => {
  assert.equal(
    dinnerAllergyNote("  shellfish \n allergy  "),
    "Allergies or dietary needs: shellfish allergy",
  );
});

test("a long allergy answer is cut to the form limit", () => {
  const note = dinnerAllergyNote("x".repeat(DINNER_ALLERGY_MAX + 100));
  assert.equal(note, `Allergies or dietary needs: ${"x".repeat(DINNER_ALLERGY_MAX)}`);
});

test("the typed phone is saved as a labelled note line", () => {
  assert.equal(dinnerPhoneNote("  +44 7700  900 123 "), "Phone: +44 7700 900 123");
  assert.equal(dinnerPhoneNote(""), "");
  assert.equal(dinnerPhoneNote(null), "");
});

test("a labelled note line is read back, and other lines are ignored", () => {
  const notes = "Phone: +44 7700 900 123\nAllergies or dietary needs: None\nStaff: called back";
  assert.equal(noteLineValue(notes, "Phone"), "+44 7700 900 123");
  assert.equal(noteLineValue(notes, "Allergies or dietary needs"), "None");
  assert.equal(noteLineValue(notes, "Company"), "");
  assert.equal(noteLineValue(null, "Phone"), "");
});

test("only the dinner Guest ticket needs an invitation code", () => {
  assert.equal(guestTicketNeedsInvitation(MYEO_DINNER_SLUG, "Guest"), true);
  assert.equal(guestTicketNeedsInvitation(MYEO_DINNER_SLUG, "  guest "), true);
  assert.equal(guestTicketNeedsInvitation(MYEO_DINNER_SLUG, DINNER_TICKET_MEMBER), false);
  assert.equal(guestTicketNeedsInvitation(MYEO_DINNER_SLUG, undefined), false);
  assert.equal(guestTicketNeedsInvitation("eo-rise-4", "Guest"), false);
  assert.equal(guestTicketNeedsInvitation(null, "Guest"), false);
  assert.ok(GUEST_INVITATION_ERROR.includes("invitation code"));
});

test("the invitation code is allowed on the dinner Guest ticket only", () => {
  assert.equal(invitationCodeAllowed(MYEO_DINNER_SLUG, "Guest"), true);
  assert.equal(invitationCodeAllowed(MYEO_DINNER_SLUG, DINNER_TICKET_MEMBER), false);
  assert.equal(invitationCodeAllowed(MYEO_DINNER_SLUG, undefined), false);
  // Other events keep their normal voucher behaviour.
  assert.equal(invitationCodeAllowed("eo-rise-4", "Member"), true);
  assert.equal(invitationCodeAllowed(null, undefined), true);
});

test("phone and the allergy answer are required on the dinner form", () => {
  assert.equal(dinnerMissingFieldError("", "Allergies or dietary needs: None"), DINNER_PHONE_ERROR);
  assert.equal(dinnerMissingFieldError("   ", "x"), DINNER_PHONE_ERROR);
  assert.equal(dinnerMissingFieldError("+44 7700 900 123", ""), DINNER_ALLERGY_ERROR);
  assert.equal(dinnerMissingFieldError("+44 7700 900 123", null), DINNER_ALLERGY_ERROR);
  assert.equal(
    dinnerMissingFieldError("+44 7700 900 123", "Allergies or dietary needs: None"),
    "",
  );
});
