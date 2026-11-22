import assert from "node:assert/strict";
import test from "node:test";
import type { TicketEmailInput } from "./email.ts";

// The cancellation policy names the chapter manager from chapter config, read
// at import time, so set it before loading the module.
process.env.NEXT_PUBLIC_CHAPTER_MANAGER_EMAIL = "chaptermanager@example.com";
const { renderTicketEmailHtml } = await import("./email.ts");

const BASE_EMAIL: TicketEmailInput = {
  to: "founder@example.com",
  name: "Founder",
  eventTitle: "Founder workshop",
  startsAt: "2026-07-23T06:30:00.000Z",
  endsAt: null,
  location: "Lisbon",
  ticketUrl: "https://chapter.example.org/t/FOUNDER001",
  ticketCode: "FOUNDER001",
};

test("ticket email stays unchanged when no team rate is available", () => {
  assert.doesNotMatch(renderTicketEmailHtml(BASE_EMAIL), /Register my team/);
});

test("ticket email includes waiver and cancellation policy", () => {
  const html = renderTicketEmailHtml(BASE_EMAIL);
  assert.match(html, /agreed to the following waiver and cancellation policy when you registered/);
  assert.match(html, /Event Waiver/);
  assert.match(html, /Cancellation and Late Fee/);
  assert.match(html, /USD\$100/);
  assert.match(html, /USD\$200/);
  assert.match(html, /chaptermanager@example\.com/);
});

test("ticket email uses a custom no-show fee when overridden", () => {
  const html = renderTicketEmailHtml({ ...BASE_EMAIL, noShowFeeUsd: 250 });
  assert.match(html, /USD\$100/);
  assert.match(html, /USD\$250/);
  assert.doesNotMatch(html, /USD\$200/);
});

test("ticket email for a non-refundable event says so and drops the fee terms", () => {
  const html = renderTicketEmailHtml({ ...BASE_EMAIL, nonRefundable: true });
  assert.match(html, /Event Waiver/);
  assert.match(html, /Cancellation and Refunds/);
  assert.match(html, /All payments for this event are non-refundable/);
  assert.match(html, /chaptermanager@example\.com/);
  assert.doesNotMatch(html, /Cancellation and Late Fee/);
  assert.doesNotMatch(html, /USD\$100/);
  assert.doesNotMatch(html, /USD\$200/);
});

test("ticket email keeps the late-fee policy unless the event is non-refundable", () => {
  assert.match(renderTicketEmailHtml({ ...BASE_EMAIL, nonRefundable: false }), /Cancellation and Late Fee/);
  assert.match(renderTicketEmailHtml(BASE_EMAIL), /Cancellation and Late Fee/);
});

test("ticket email includes an escaped team-rate call to action", () => {
  const html = renderTicketEmailHtml({
    ...BASE_EMAIL,
    teamRegistration: {
      url: "https://chapter.example.org/events/founders?voucher=TEAM50&invite=FOUNDER001",
      discountedUnitAmount: 5_000,
      currency: "USD",
    },
  });

  assert.match(html, /Bring your team/);
  assert.match(html, /Register colleagues for \$50\.00 per person/);
  assert.match(html, /Register my team/);
  assert.match(html, /voucher=TEAM50&amp;invite=FOUNDER001/);
});
