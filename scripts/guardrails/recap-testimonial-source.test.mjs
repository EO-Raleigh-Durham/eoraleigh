import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

// event_feedback.improve_text is critical feedback members give in confidence.
// Recaps publish without human approval, so improve_text must never be read by
// any recap module: not to filter it, not to score it, not at all. The only
// safe handling is never loading it.
//
// loved_text is the sanctioned testimonial source and is expected here.

const libDir = new URL("../../src/lib/", import.meta.url);

async function recapModules() {
  const entries = await readdir(libDir);
  return entries.filter(
    (name) =>
      name.startsWith("event-recap-") &&
      name.endsWith(".ts") &&
      !name.endsWith(".test.ts"),
  );
}

test("no recap module reads improve_text", async () => {
  const modules = await recapModules();
  assert(modules.length > 0, "no recap modules found, has the prefix changed?");

  for (const name of modules) {
    const source = await readFile(new URL(name, libDir), "utf8");
    const stripped = source.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.equal(
      /improve_text/.test(stripped),
      false,
      `${name} references improve_text outside a comment; it must never be read`,
    );
  }
});

test("the testimonial loader selects loved_text explicitly, not a wildcard", async () => {
  const source = await readFile(
    new URL("event-recap-testimonials-server.ts", libDir),
    "utf8",
  );

  assert.match(source, /loved_text/, "loved_text is the sanctioned quote source");
  assert.equal(
    /\.select\(\s*["'`]\*/.test(source),
    false,
    "a select('*') on event_feedback would pull improve_text in with it",
  );
});

test("testimonial selection is gated on active membership", async () => {
  const source = await readFile(
    new URL("event-recap-testimonials.ts", libDir),
    "utf8",
  );
  assert.match(
    source,
    /isActiveMember/,
    "member gating is what keeps guests and staff off the recap",
  );
});
