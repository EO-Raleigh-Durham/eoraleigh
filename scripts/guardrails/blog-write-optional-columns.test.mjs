import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// The app deploys before its migration is applied, so a write carrying a
// column that does not exist yet fails with PGRST204 and breaks the board
// editor on production until the schema catches up. That happened once with
// blog_posts.event_id (migration 084).
//
// Reads were already defensive. These assert the writes are too.

const blogActions = new URL("../../src/app/board/blogs/actions.ts", import.meta.url);
const eventActions = new URL("../../src/app/board/events/actions.ts", import.meta.url);

test("blog writes declare which columns may not exist yet", async () => {
  const source = await readFile(blogActions, "utf8");
  assert.match(
    source,
    /OPTIONAL_BLOG_COLUMNS/,
    "declare post-migration columns so writes can retry without them",
  );
  assert.match(source, /PGRST204/, "PGRST204 is the missing-column write error");
});

test("both blog write paths retry without the optional columns", async () => {
  const source = await readFile(blogActions, "utf8");
  const retries = source.match(/withoutOptionalColumns\(/g) ?? [];
  assert.ok(
    retries.length >= 2,
    `expected an insert retry and an update retry, found ${retries.length}`,
  );
  assert.match(source, /\.insert\(withoutOptionalColumns\(/);
  assert.match(source, /\.update\(withoutOptionalColumns\(/);
});

test("every column named optional is actually sent by the write path", async () => {
  const source = await readFile(blogActions, "utf8");
  const declared = /OPTIONAL_BLOG_COLUMNS = \[([^\]]*)\]/.exec(source);
  assert.ok(declared, "could not read OPTIONAL_BLOG_COLUMNS");

  const columns = [...declared[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(columns.length > 0, "OPTIONAL_BLOG_COLUMNS is empty");
  for (const column of columns) {
    assert.match(
      source,
      new RegExp(`${column}:`),
      `${column} is listed as optional but never written, so the entry is stale`,
    );
  }
});

test("the events actions still carry the pattern this mirrors", async () => {
  const source = await readFile(eventActions, "utf8");
  assert.match(source, /OPTIONAL_EVENT_COLUMNS/);
});
