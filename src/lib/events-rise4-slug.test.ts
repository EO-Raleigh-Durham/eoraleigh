import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// next.config.ts and events.ts cannot be imported here (a CommonJS __dirname
// and the server-only Supabase client), so both are read as text.
const nextConfig = readFileSync(
  new URL("../../next.config.ts", import.meta.url),
  "utf8",
);
const eventsLib = readFileSync(new URL("./events.ts", import.meta.url), "utf8");

const NEUTRAL = "/events/eo-rise-4";

function redirectBlocks(): { source: string; destination: string; permanent: boolean }[] {
  const blocks: { source: string; destination: string; permanent: boolean }[] = [];
  const re =
    /source:\s*"([^"]+)",\s*destination:\s*"([^"]+)",\s*permanent:\s*(true|false)/g;
  for (const m of nextConfig.matchAll(re)) {
    blocks.push({ source: m[1], destination: m[2], permanent: m[3] === "true" });
  }
  return blocks;
}

test("every earlier RISE 4 slug 301s straight to the neutral slug", () => {
  const toNeutral = redirectBlocks().filter(
    (r) => r.destination === NEUTRAL && r.source.startsWith("/events/"),
  );
  assert.deepEqual(toNeutral.map((r) => r.source).sort(), [
    "/events/eo-rise-4-building-brands-that-become-lifestyles",
    "/events/eo-rise-4-personal-branding-content-workshop",
    "/events/eo-rise-4-zero-to-200m",
  ]);
  assert.ok(toNeutral.every((r) => r.permanent));
});

test("the unpublished Randy post 307s to the event page, not a 404", () => {
  // Unpublished 26 Oct 2026 when the speaker changed. Temporary on purpose:
  // the post content stays in git history and may return for a future event.
  const randy = redirectBlocks().find(
    (r) => r.source === "/post/category-creation-randy-dobson-rise-4",
  );
  assert.ok(randy, "redirect for the unpublished Randy post is missing");
  assert.equal(randy.destination, NEUTRAL);
  assert.equal(randy.permanent, false);
});

test("the neutral slug is never redirected away, which would loop", () => {
  assert.equal(
    redirectBlocks().some((r) => r.source === NEUTRAL),
    false,
  );
});

test("the neutral slug resolves to the existing DB row until the board editor flips it", () => {
  assert.match(
    eventsLib,
    /EVENT_SLUG_ALIASES[^=]*=\s*\{[^}]*"eo-rise-4":\s*"eo-rise-4-zero-to-200m"/,
  );
});
