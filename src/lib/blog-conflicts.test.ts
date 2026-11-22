import assert from "node:assert/strict";
import test from "node:test";
import { uniqueViolationMessage } from "./blog-conflicts.ts";

// A real Postgres unique violation on the migration-083 index.
const EVENT_CONFLICT = {
  code: "23505",
  message:
    'duplicate key value violates unique constraint "blog_posts_event_id_key"',
};

const SLUG_CONFLICT = {
  code: "23505",
  message: 'duplicate key value violates unique constraint "blog_posts_slug_key"',
};

test("an event conflict tells the editor the event is already taken", () => {
  assert.equal(
    uniqueViolationMessage(EVENT_CONFLICT),
    "This event already has a recap post. Clear the event on that post first.",
  );
});

test("a slug conflict keeps the original slug message", () => {
  assert.equal(
    uniqueViolationMessage(SLUG_CONFLICT),
    "A post with this slug already exists",
  );
});

test("a non-conflict error is not swallowed as a conflict", () => {
  assert.equal(
    uniqueViolationMessage({ code: "42703", message: "column x does not exist" }),
    null,
  );
});

test("a duplicate-key error without a code is still recognized", () => {
  assert.equal(
    uniqueViolationMessage({
      message: 'duplicate key value violates unique constraint "blog_posts_slug_key"',
    }),
    "A post with this slug already exists",
  );
});

test("the event branch wins even when both words appear", () => {
  // PostgREST wraps the detail line in, so the constraint name is not always
  // the only thing in the message. event_id is the discriminator.
  assert.equal(
    uniqueViolationMessage({
      code: "23505",
      message:
        'duplicate key value violates unique constraint "blog_posts_event_id_key" Key (event_id)=(abc) already exists.',
    }),
    "This event already has a recap post. Clear the event on that post first.",
  );
});
