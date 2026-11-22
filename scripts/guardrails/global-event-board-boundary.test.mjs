import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

const LOCAL_OPERATION_CONTROLS =
  /RsvpSection|AttendeePhotosSection|FeedbackSection|TicketsSection|VouchersSection|MessageParticipants|QuickActions|QrActions/;

test("global event management branches before registration-only loaders", async () => {
  const page = await read("src/app/board/events/[id]/page.tsx");
  const scopeBranch = page.indexOf('eventScope(event) === "global"');

  assert(scopeBranch >= 0, "event management page must branch on normalized event scope");
  for (const localRead of [
    "getBoardRegistrationsForEvent(id)",
    "getFeedbackForEvent(id)",
    "getTicketTypesForEvent(id)",
    "getEventVouchersForEvent(id)",
    "getEventInviterCandidates()",
    "getEventFeedbackTrend(event.starts_at)",
  ]) {
    const localLoader = page.indexOf(localRead);
    assert(localLoader >= 0, `${localRead} must remain available to local events`);
    assert(
      scopeBranch < localLoader,
      `global scope must branch before ${localRead} is loaded`,
    );
  }
});

test("global components exclude local event operations", async () => {
  for (const path of [
    "src/app/board/events/[id]/GlobalEventOverview.tsx",
    "src/app/board/events/[id]/GlobalEventCohort.tsx",
  ]) {
    const source = await read(path);
    assert.doesNotMatch(
      source,
      LOCAL_OPERATION_CONTROLS,
      `${path} crossed the local registration operations boundary`,
    );
    assert.doesNotMatch(source, /\bemail\b/i, `${path} must not request or display email`);
  }
});

test("global and local tabs preserve their distinct operations", async () => {
  const page = await read("src/app/board/events/[id]/page.tsx");
  const globalStart = page.indexOf("async function renderGlobalEventPage");
  const localStart = page.indexOf("async function renderLocalEventPage");

  assert(globalStart >= 0, "missing isolated global event renderer");
  assert(localStart > globalStart, "missing isolated local event renderer");

  const globalBranch = page.slice(globalStart, localStart);
  const localBranch = page.slice(localStart);
  assert.doesNotMatch(globalBranch, LOCAL_OPERATION_CONTROLS);
  assert.match(globalBranch, /variant="global"/);
  assert.match(localBranch, /RsvpSection/);
  assert.match(localBranch, /FeedbackSection/);
  assert.match(localBranch, /MessageParticipants/);
  assert.match(localBranch, /TicketsSection/);
  assert.match(localBranch, /VouchersSection/);

  const tabs = await read("src/app/board/events/[id]/EventTabs.tsx");
  assert.match(
    tabs,
    /GLOBAL_EVENT_TABS[\s\S]*overview[\s\S]*people[\s\S]*settings/,
    "global event tabs must expose Overview, People, and Settings",
  );
});

test("global settings omit registration-operation fields", async () => {
  const page = await read("src/app/board/events/[id]/page.tsx");
  const form = await read("src/app/board/events/EventForm.tsx");
  const globalStart = page.indexOf("async function renderGlobalEventPage");
  const localStart = page.indexOf("async function renderLocalEventPage");
  const globalBranch = page.slice(globalStart, localStart);

  assert.match(
    globalBranch,
    /<EventForm event=\{event\} saved=\{saved === "1"\} variant="global" \/>/,
    "global settings must select the metadata-only form variant",
  );
  assert.match(form, /showRegistrationOperations = variant === "local"/);
  assert.match(form, /showRegistrationOperations && \(/);
  for (const field of [
    "capacity",
    "price_dollars",
    "price_note",
    "survey_enabled",
    "allow_guests",
    "max_guests_per_member",
    "guest_price_dollars",
  ]) {
    assert.match(form, new RegExp(`name="${field}"`), `${field} must remain available locally`);
  }
});
