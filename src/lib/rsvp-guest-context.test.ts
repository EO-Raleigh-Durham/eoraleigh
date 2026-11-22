import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGuestRegistrationNotes,
  getGuestRegistrationDetails,
  type GuestRegistrationContext,
} from "./rsvp-guest-context.ts";

const EMPTY_CONTEXT: GuestRegistrationContext = {
  relationship: "",
  host_member: "",
  visiting_chapter: "",
  referral_source: "",
};

test("guest registration notes stay empty without context", () => {
  assert.equal(buildGuestRegistrationNotes(EMPTY_CONTEXT), "");
});

test("guest registration notes preserve a referral source by itself", () => {
  assert.equal(
    buildGuestRegistrationNotes({
      ...EMPTY_CONTEXT,
      referral_source: "LinkedIn",
    }),
    "Registration details:\nHow they heard: LinkedIn",
  );
});

test("guest registration notes include every supplied context field", () => {
  assert.equal(
    buildGuestRegistrationNotes({
      relationship: "Visiting EO member from another chapter",
      host_member: "Harley",
      visiting_chapter: "EO Singapore",
      referral_source: "Member invite",
    }),
    [
      "Registration details:",
      "How they are joining: Visiting EO member from another chapter",
      "Invited by: Harley",
      "Home EO chapter: EO Singapore",
      "How they heard: Member invite",
    ].join("\n"),
  );
});

test("guest registration details read back every saved field in form order", () => {
  const context: GuestRegistrationContext = {
    relationship: "Visiting EO member from another chapter",
    host_member: "Harley",
    visiting_chapter: "EO Singapore",
    referral_source: "Member invite",
  };
  assert.deepEqual(getGuestRegistrationDetails(buildGuestRegistrationNotes(context)), [
    { label: "How they are joining", value: "Visiting EO member from another chapter" },
    { label: "Invited by", value: "Harley" },
    { label: "Home EO chapter", value: "EO Singapore" },
    { label: "How they heard", value: "Member invite" },
  ]);
});

test("guest registration details return only the fields that were filled in", () => {
  assert.deepEqual(
    getGuestRegistrationDetails(
      buildGuestRegistrationNotes({ ...EMPTY_CONTEXT, referral_source: "LinkedIn" }),
    ),
    [{ label: "How they heard", value: "LinkedIn" }],
  );
});

test("guest registration details are empty for notes without them", () => {
  assert.deepEqual(getGuestRegistrationDetails(null), []);
  assert.deepEqual(getGuestRegistrationDetails(undefined), []);
  assert.deepEqual(getGuestRegistrationDetails(""), []);
  assert.deepEqual(getGuestRegistrationDetails("Called Tam about the venue"), []);
});

test("guest registration details ignore staff text around the saved lines", () => {
  const notes = [
    "Spoke to him on Friday",
    "Registration details:",
    "Invited by: Harley",
    "He said Invited by: someone else",
    "Complimentary guest, approved by Tam",
  ].join("\r\n");
  assert.deepEqual(getGuestRegistrationDetails(notes), [
    { label: "Invited by", value: "Harley" },
  ]);
});
