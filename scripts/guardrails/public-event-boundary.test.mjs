import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("public event reads enforce audience on listings and details", async () => {
  for (const path of [
    "src/app/events/page.tsx",
    "src/app/global-events/page.tsx",
    "src/app/past-events/page.tsx",
    "src/app/community-events/page.tsx",
    "src/app/blog/blog-index-data.ts", // the /blog page and member Blog read events here
  ]) {
    const listing = await read(path);
    assert.match(listing, /getViewableEvents\s*\(/, `${path} bypasses event audience`);
    assert.doesNotMatch(listing, /\bgetEvents\s*\(/, `${path} reads unrestricted events`);
  }

  // The detail page loads members-only events for any viewer, but must gate
  // the full page (registration, tickets, availability) on canView and render
  // only the MemberEventPitch to non-members. Board events stay hidden.
  // Owner-approved policy change, 2026-07-24: member event titles are
  // advertised publicly as a membership benefit.
  const detail = await read("src/app/events/[id]/page.tsx");
  assert.match(detail, /canView\s*\(user\?\.role \?\? null, eventAudience\(event\)\)/);
  assert.match(detail, /if \(!viewable\) \{/);
  assert.match(detail, /<MemberEventPitch\b/);
  assert.match(detail, /eventAudience\(event\) === "board"\) notFound\(\)/);
  assert.match(detail, /eventAudience\(event\) === "board"\) notFound\(\)/);

  // Owner decision, 11 Aug 2026: a published recap is public content, so the
  // pitch carries the recap body, the aggregate stat band, and the link to the
  // write-up. Those three and nothing else. The pitch must still never expose
  // registration, tickets, availability or pricing.
  const pitchStart = detail.indexOf("function MemberEventPitch");
  const pitchEnd = detail.indexOf("\nfunction ", pitchStart + 1);
  assert(pitchStart >= 0, "missing MemberEventPitch");
  const pitch = detail.slice(pitchStart, pitchEnd < 0 ? undefined : pitchEnd);
  assert.doesNotMatch(
    pitch,
    /RsvpForm|TicketTypes|availability|price/i,
    "member pitch must not expose registration or pricing",
  );

  // Only these props may reach the pitch. A new one is a boundary change and
  // has to be argued for here rather than slipped in.
  const pitchProps = /function MemberEventPitch\(\{([^}]*)\}/.exec(detail);
  assert(pitchProps, "could not read MemberEventPitch props");
  const props = pitchProps[1]
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .sort();
  assert.deepEqual(
    props,
    ["event", "linkedPost", "recapStats"],
    "MemberEventPitch received an unexpected prop; widening what non-members see is a boundary change",
  );

  // The stat band is aggregate by construction. Guard the source too: the
  // loader feeding it must not read names, emails or anything identifying.
  const statsLoader = (await read("src/lib/event-recap-stats-server.ts"))
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(
    statsLoader,
    /\b(email|full_name|first_name|last_name)\b/,
    "the public stat loader must stay aggregate: no identifying fields",
  );

  // The blog block reads unrestricted events on purpose (same policy change),
  // but must stay on live lifecycles and never surface board events.
  const blogBlock = await read("src/components/blog/BlogUpcomingEvents.tsx");
  assert.match(blogBlock, /status: \["open", "published"\]/);
  assert.match(blogBlock, /eventAudience\(e\) !== "board"/);

  const survey = await read("src/app/events/[id]/survey/page.tsx");
  assert.match(survey, /getEventBySlugOrId\s*\(/);
  assert.doesNotMatch(survey, /verifySurveyCapability|getAttendedSurveyRegistration/);

  const homepage = await read("src/components/home/UpcomingEvents.tsx");
  assert.match(homepage, /getViewableEvents\s*\(null,/);
  assert.doesNotMatch(homepage, /\bgetEvents\s*\(/);

  const sitemap = await read("src/app/sitemap.ts");
  assert.match(sitemap, /canView\s*\(null,\s*eventAudience\(e\)\)/);
});

test("public event detail loads only occupied-seat fields", async () => {
  const detail = await read("src/app/events/[id]/page.tsx");
  assert.doesNotMatch(detail, /getRegistrationsForEvent/);
  assert.match(detail, /getOccupiedSeatsForEvent\s*\(/);

  const events = await read("src/lib/events.ts");
  const start = events.indexOf("export async function getOccupiedSeatsForEvent");
  const end = events.indexOf("\nexport ", start + 1);
  assert(start >= 0, "missing public occupied-seat loader");
  const loader = events.slice(start, end < 0 ? undefined : end);
  const selectedFields = loader.match(/\.select\("([^"]+)"\)/)?.[1];
  assert.equal(selectedFields, "status, guest_count");
});

test("public RSVP and voucher preview enforce the event audience", async () => {
  const actions = await read("src/app/board/events/actions.ts");
  for (const name of ["previewEventVoucher", "publicRsvp"]) {
    const start = actions.indexOf(`export async function ${name}`);
    const end = actions.indexOf("\nexport async function ", start + 1);
    const body = actions.slice(start, end < 0 ? undefined : end);
    assert(start >= 0, `missing ${name}`);
    assert.match(body, /canView\s*\(/, `${name} does not enforce event audience`);
    assert.match(body, /eventAudience\s*\(/, `${name} does not resolve event audience`);
  }
});
