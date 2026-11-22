import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSubmissionPersonStore } from "./submission-person-supabase-store.ts";

type QueryError = { message?: string; code?: string | null } | null;
type QueryResult = { data: Record<string, unknown> | null; error: QueryError };
type QueryCall = [string, ...unknown[]];

class FakeQuery {
  readonly calls: QueryCall[] = [];
  private readonly result: QueryResult;

  constructor(result: QueryResult) {
    this.result = result;
  }

  select(columns: string) {
    this.calls.push(["select", columns]);
    return this;
  }

  ilike(column: string, pattern: string) {
    this.calls.push(["ilike", column, pattern]);
    return this;
  }

  insert(payload: Record<string, unknown>) {
    this.calls.push(["insert", payload]);
    return this;
  }

  async maybeSingle() {
    this.calls.push(["maybeSingle"]);
    return this.result;
  }

  async single() {
    this.calls.push(["single"]);
    return this.result;
  }
}

function fakeClient(
  responses: Array<{ table: string; result: QueryResult }>,
): {
  client: Pick<SupabaseClient, "from">;
  queries: Array<{ table: string; query: FakeQuery }>;
} {
  const remaining = [...responses];
  const queries: Array<{ table: string; query: FakeQuery }> = [];
  const client = {
    from(table: string) {
      const response = remaining.shift();
      assert.ok(response, `Unexpected query for ${table}`);
      assert.equal(table, response.table);
      const query = new FakeQuery(response.result);
      queries.push({ table, query });
      return query;
    },
  } as unknown as Pick<SupabaseClient, "from">;
  return { client, queries };
}

test("normalizes exact alias lookup and escapes every PostgREST wildcard", async () => {
  const fake = fakeClient([
    {
      table: "person_emails",
      result: {
        data: { person_id: "person-1", is_primary: false },
        error: null,
      },
    },
  ]);

  assert.deepEqual(
    await createSubmissionPersonStore(fake.client).findByEmail("  *@Example.COM "),
    { data: { id: "person-1" }, error: null, mode: "alternate" },
  );
  assert.deepEqual(fake.queries[0].query.calls, [
    ["select", "person_id, is_primary"],
    ["ilike", "email", "\\*@example.com"],
    ["maybeSingle"],
  ]);
});

test("falls back to people.email and preserves primary mode", async () => {
  const fake = fakeClient([
    { table: "person_emails", result: { data: null, error: null } },
    { table: "people", result: { data: { id: "person-2" }, error: null } },
  ]);

  assert.deepEqual(
    await createSubmissionPersonStore(fake.client).findByEmail(" MEMBER@example.com "),
    { data: { id: "person-2" }, error: null, mode: "primary" },
  );
  assert.deepEqual(fake.queries[1].query.calls, [
    ["select", "id"],
    ["ilike", "email", "member@example.com"],
    ["maybeSingle"],
  ]);
});

test("returns alias lookup errors without attempting an insert or fallback", async () => {
  const fake = fakeClient([
    {
      table: "person_emails",
      result: { data: null, error: { message: "permission denied", code: "42501" } },
    },
  ]);

  assert.deepEqual(
    await createSubmissionPersonStore(fake.client).findByEmail("member@example.com"),
    {
      data: null,
      error: { message: "permission denied", code: "42501" },
      mode: null,
    },
  );
  assert.equal(fake.queries.length, 1);
});

test("inserts the exact typed person patch and translates conflict errors", async () => {
  const payload = { email: "new@example.com", source_site: "chapter-site" };
  const success = fakeClient([
    { table: "people", result: { data: { id: "person-3" }, error: null } },
  ]);
  assert.deepEqual(await createSubmissionPersonStore(success.client).insert(payload), {
    data: { id: "person-3" },
    error: null,
  });
  assert.deepEqual(success.queries[0].query.calls, [
    ["insert", payload],
    ["select", "id"],
    ["single"],
  ]);

  const conflict = fakeClient([
    {
      table: "people",
      result: { data: null, error: { message: "duplicate", code: "23505" } },
    },
  ]);
  assert.deepEqual(await createSubmissionPersonStore(conflict.client).insert(payload), {
    data: null,
    error: { message: "duplicate", code: "23505" },
  });
});
