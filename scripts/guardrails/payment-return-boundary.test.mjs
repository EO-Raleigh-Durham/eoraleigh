import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("Stripe success return requires its matching checkout session", async () => {
  const actions = await read("src/app/board/events/actions.ts");
  assert.match(actions, /session_id=\{CHECKOUT_SESSION_ID\}/);
  assert.match(actions, /attach_standard_checkout_session/);
  assert.doesNotMatch(actions, /update\(\{ stripe_session_id: session\.id \}\)/);
  assert.match(actions, /attach_voucher_checkout_session/);

  const page = await read("src/app/events/[id]/page.tsx");
  assert.match(page, /getTicketCodeForCheckoutReturn\s*\(/);
  assert.doesNotMatch(page, /getTicketCodeForRegistration\s*\(/);
  assert.match(page, /const paymentConfirmed = Boolean\(paidTicketCode\)/);
  assert.doesNotMatch(page, /\{paid === "1"/);

  const events = await read("src/lib/events.ts");
  const start = events.indexOf("export async function getTicketCodeForCheckoutReturn");
  const end = events.indexOf("\nexport ", start + 1);
  assert(start >= 0, "missing checkout return verifier");
  const lookup = events.slice(start, end < 0 ? undefined : end);
  assert.match(lookup, /\.eq\("event_id", eventId\)/);
  assert.match(lookup, /\.eq\("stripe_session_id", sessionId\)/);
  assert.match(lookup, /\.eq\("status", "registered"\)/);
  assert.match(lookup, /\.not\("paid_at", "is", null\)/);
});

test("standard checkout attachment requires a pending registration row", async () => {
  const actions = await read("src/app/board/events/actions.ts");
  const start = actions.indexOf("async function attachStandardCheckoutSession");
  const end = actions.indexOf("export type VoucherPreviewResult", start);
  assert(start >= 0 && end > start, "missing standard checkout attachment helper");
  const attachment = actions.slice(start, end);
  assert.match(attachment, /attach_standard_checkout_session/);
  assert.match(attachment, /p_registration_id: input\.registrationId/);
  assert.match(attachment, /p_stripe_session_id: input\.sessionId/);
  assert.match(attachment, /p_expected_amount: input\.amount/);
  assert.match(attachment, /p_expected_currency: input\.currency\.toUpperCase\(\)/);

  const calls = actions.match(/attach: \(\) => attachStandardCheckoutSession\(/g) ?? [];
  assert.equal(calls.length, 2, "both standard checkout entry points must use the locked RPC");
});

test("standard checkout retries recover the same Stripe session", async () => {
  const actions = await read("src/app/board/events/actions.ts");
  assert.match(actions, /existingRegistration\.status !== "pending_payment"/);
  assert.match(actions, /idempotencyKey:[\s\S]*event-registration-\$\{registrationId\}/);
  assert.match(actions, /if \(!voucherReservation && reserved\.reused\)/);
  assert.match(actions, /stripe\.checkout\.sessions\.retrieve\(existing\.stripe_session_id\)/);

  const catchStart = actions.indexOf("} catch (err) {", actions.indexOf("let session;"));
  const catchEnd = actions.indexOf("if (!session.url)", catchStart);
  const checkoutCatch = actions.slice(catchStart, catchEnd);
  assert.doesNotMatch(checkoutCatch, /event_registrations"\)\.delete/);
});

test("cancelled events only allow a checkout return with a matched ticket", async () => {
  const page = await read("src/app/events/[id]/page.tsx");
  const ticketLookup = page.indexOf("getTicketCodeForCheckoutReturn(event.id");
  const cancelledGate = page.indexOf('event.status === "cancelled"');
  assert(ticketLookup >= 0 && ticketLookup < cancelledGate);
  assert.match(page, /event\.status === "cancelled" && !paidTicketCode/);
});
