import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// The event page renders the stat band live from the database. If the
// generator also embeds a stat-callout in recap_blocks, the numbers print
// twice and the embedded copy goes stale the moment another survey response
// lands. That shipped once: the Art of Belonging recap showed "from 17
// responses" in the band and "from 14 responses" in the body.

const read = (p) => readFile(new URL(`../../${p}`, import.meta.url), "utf8");

test("the generator does not embed a stat block in the recap body", async () => {
  const source = await read("src/lib/event-recap-generate.ts");
  assert.match(
    source,
    /statBlock:\s*null/,
    "generated recaps must not carry a stat-callout; the page renders stats live",
  );
  const stripped = source.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(
    stripped,
    /statCalloutBlock\s*\(/,
    "calling statCalloutBlock here would reintroduce the duplicate",
  );
});

test("the page is the single place stats are rendered", async () => {
  const detail = await read("src/app/events/[id]/page.tsx");
  assert.match(detail, /event-stat-band/, "the live stat band is the one source");
  const bands = detail.match(/className="event-stat-band"/g) ?? [];
  assert.equal(bands.length, 1, "the stat band should be rendered from one place");
});

test("stats are still computed, because the report tells marketing what was suppressed", async () => {
  const source = await read("src/lib/event-recap-generate.ts");
  assert.match(source, /getEventRecapStats/);
  assert.match(source, /statsSuppressed/);
});
