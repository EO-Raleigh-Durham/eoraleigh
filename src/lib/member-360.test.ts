import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { loadMemberEmailAliases } from "./member-360.ts";

type QueryResult = {
  data: unknown[] | null;
  error: { code?: string; message?: string } | null;
};

class FakeQuery implements PromiseLike<QueryResult> {
  readonly calls: Array<[string, ...unknown[]]> = [];
  private readonly result: QueryResult;

  constructor(result: QueryResult) {
    this.result = result;
  }

  select(columns: string) {
    this.calls.push(["select", columns]);
    return this;
  }

  eq(column: string, value: unknown) {
    this.calls.push(["eq", column, value]);
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

function fakeClient(result: QueryResult) {
  const query = new FakeQuery(result);
  const client = {
    from(table: string) {
      assert.equal(table, "person_emails");
      return query;
    },
  } as unknown as Pick<SupabaseClient, "from">;
  return { client, query };
}

test("loads only alternate member emails from the narrow person_emails query", async () => {
  const { client, query } = fakeClient({
    data: [{ email: "  alternate@example.com  " }],
    error: null,
  });

  assert.deepEqual(await loadMemberEmailAliases("person-1", client), {
    status: "loaded",
    emails: ["alternate@example.com"],
  });
  assert.deepEqual(query.calls, [
    ["select", "email"],
    ["eq", "person_id", "person-1"],
    ["eq", "is_primary", false],
  ]);
});

test("returns unavailable and logs only safe query failure metadata", async () => {
  const { client } = fakeClient({
    data: null,
    error: {
      code: "42501",
      message: 'permission denied for alternate@example.com',
    },
  });
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => warnings.push(args);

  try {
    assert.deepEqual(await loadMemberEmailAliases("person-1", client), {
      status: "unavailable",
    });
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(warnings.length, 1);
  const warning = JSON.stringify(warnings[0]);
  assert.match(warning, /person-1/);
  assert.match(warning, /42501/);
  assert.match(warning, /DatabaseError/);
  assert.doesNotMatch(warning, /alternate@example\.com/);
});

test("turns thrown query failures into an unavailable state without leaking the message", async () => {
  const query = {
    select: () => query,
    eq: () => query,
    then: (
      _onfulfilled?: ((value: QueryResult) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null,
    ) => Promise.reject(new Error("query failed for secret@example.com")).catch(onrejected),
  };
  const client = {
    from: () => query,
  } as unknown as Pick<SupabaseClient, "from">;
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => warnings.push(args);

  try {
    assert.deepEqual(await loadMemberEmailAliases("person-2", client), {
      status: "unavailable",
    });
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(warnings.length, 1);
  assert.doesNotMatch(JSON.stringify(warnings[0]), /secret@example\.com/);
});

test("keeps the alias block after authorization, member lookup, and Contact", async () => {
  const pagePath = path.resolve("src/app/board/members/[id]/page.tsx");
  const source = await readFile(pagePath, "utf8");
  const authorization = source.indexOf("await requireBoardOrAbove()");
  const memberNotFound = source.indexOf("if (!loaded) notFound();");
  const aliasLoad = source.indexOf("loadMemberEmailAliases(id)");
  const contact = source.indexOf("<MemberProfileForm member={member} />");
  const otherEmails = source.indexOf(">Other emails</h3>");

  assert.ok(authorization >= 0);
  assert.ok(memberNotFound > authorization);
  assert.ok(aliasLoad > memberNotFound);
  assert.ok(otherEmails > contact);
  assert.match(source, /No other emails recorded/);
  assert.match(source, /Other emails unavailable\. Refresh the page to try again/);
  assert.match(source, /Corrections require a site administrator review/);
  assert.doesNotMatch(source, /MemberProfileForm member=\{emailAliases/);
});
