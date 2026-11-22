import assert from "node:assert/strict";
import test from "node:test";

import { requireQueryData } from "./query-result.ts";

test("event metrics do not turn a failed feedback query into zero responses", () => {
  assert.throws(
    () =>
      requireQueryData(
        {
          data: null,
          error: { message: 'column "event_value_rating" does not exist' },
        },
        "Event feedback query failed",
      ),
    /Event feedback query failed: column "event_value_rating" does not exist/,
  );
});

test("event metrics accept successful empty query results", () => {
  assert.deepEqual(
    requireQueryData({ data: [], error: null }, "Event feedback query failed"),
    [],
  );
});
