import assert from "node:assert/strict";
import test from "node:test";
import { buildReminderTemplate } from "./event-message-templates.ts";

test("reminder includes the event logistics and response path", () => {
  const reminder = buildReminderTemplate({
    eventTitle: "Founder Workshop",
    eventDate: "Jul 23, 2026",
    eventTime: "1:30 PM - 6:00 PM",
    eventLocation: "Grand Harbor Hotel",
    eventUrl: "https://www.chapter.example.org/events/founder-workshop",
  });

  assert.equal(reminder.subject, "Reminder: Founder Workshop");
  assert.match(reminder.body, /Date: Jul 23, 2026/);
  assert.match(reminder.body, /Time: 1:30 PM - 6:00 PM/);
  assert.match(reminder.body, /Venue: Grand Harbor Hotel/);
  assert.match(
    reminder.body,
    /Event details: https:\/\/www\.chapter\.example\.org\/events\/founder-workshop/,
  );
  assert.match(reminder.body, /reply to this email so we can update the guest list/);
});

test("reminder omits an unavailable venue without adding placeholder copy", () => {
  const reminder = buildReminderTemplate({
    eventTitle: "Founder Workshop",
    eventDate: "Jul 23, 2026",
    eventTime: "1:30 PM",
    eventLocation: null,
    eventUrl: "https://www.chapter.example.org/events/founder-workshop",
  });

  assert.doesNotMatch(reminder.body, /Venue:/);
  assert.doesNotMatch(reminder.body, /undefined|null/);
});
