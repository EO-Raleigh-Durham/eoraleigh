import assert from "node:assert/strict";
import test from "node:test";

import {
  isMissingMemberAttendanceViewError,
  loadMemberEventAttendance,
} from "./member-event-attendance.ts";

type Result = { data: unknown[] | null; error: { code?: string; message: string } | null };

class FakeQuery implements PromiseLike<Result> {
  readonly calls: Array<[string, ...unknown[]]> = [];
  private readonly result: Result;

  constructor(result: Result) {
    this.result = result;
  }

  select(value: string) { this.calls.push(["select", value]); return this; }
  eq(column: string, value: unknown) { this.calls.push(["eq", column, value]); return this; }
  in(column: string, value: unknown[]) { this.calls.push(["in", column, value]); return this; }
  neq(column: string, value: unknown) { this.calls.push(["neq", column, value]); return this; }
  not(column: string, operator: string, value: unknown) { this.calls.push(["not", column, operator, value]); return this; }
  or(value: string) { this.calls.push(["or", value]); return this; }
  gte(column: string, value: unknown) { this.calls.push(["gte", column, value]); return this; }
  lt(column: string, value: unknown) { this.calls.push(["lt", column, value]); return this; }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

function fakeClient(results: Result[]) {
  const tables: string[] = [];
  const queries: FakeQuery[] = [];
  return {
    tables,
    queries,
    client: {
      from(table: string) {
        tables.push(table);
        const query = new FakeQuery(results[queries.length]);
        queries.push(query);
        return query;
      },
    },
  };
}

const attendanceRow = {
  event_id: "event-1",
  person_id: "person-1",
  attended_at: "2026-08-10T01:00:00Z",
  attendance_source: "global_cohort",
  event_title: "EO Global Leadership Conference",
  event_starts_at: "2026-08-10T01:00:00Z",
  event_status: "published",
  event_type: "conference",
  event_scope: "global",
};

test("loads confirmed normalized attendance once without inferring Going transitions", async () => {
  const fake = fakeClient([{ data: [attendanceRow], error: null }]);

  const rows = await loadMemberEventAttendance(
    { personIds: ["person-1"], eventStartsFrom: "2026-07-01" },
    fake.client,
  );

  assert.deepEqual(rows, [attendanceRow]);
  assert.deepEqual(fake.tables, ["member_event_attendance"]);
  assert.ok(!fake.queries[0].calls.some((call) => call.includes("status")));
});

test("falls back to attended registration semantics only when the view is missing", async () => {
  const fake = fakeClient([
    { data: null, error: { code: "PGRST205", message: "schema cache miss" } },
    {
      data: [{
        event_id: "event-1",
        person_id: "person-1",
        checked_in_at: null,
        events: {
          title: "EO Example Dinner",
          starts_at: "2026-08-10T01:00:00Z",
          status: "published",
          type: "social",
          scope: "local",
        },
      }],
      error: null,
    },
  ]);

  const rows = await loadMemberEventAttendance({}, fake.client);

  assert.deepEqual(fake.tables, ["member_event_attendance", "event_registrations"]);
  assert.deepEqual(rows, [{
    event_id: "event-1",
    person_id: "person-1",
    attended_at: "2026-08-10T01:00:00Z",
    attendance_source: "registration",
    event_title: "EO Example Dinner",
    event_starts_at: "2026-08-10T01:00:00Z",
    event_status: "published",
    event_type: "social",
    event_scope: "local",
  }]);
});

test("recognizes only database and PostgREST missing-relation codes", () => {
  assert.equal(isMissingMemberAttendanceViewError({ code: "42P01" }), true);
  assert.equal(isMissingMemberAttendanceViewError({ code: "PGRST205" }), true);
  assert.equal(isMissingMemberAttendanceViewError({ code: "42501" }), false);
  assert.equal(
    isMissingMemberAttendanceViewError({ message: "relation member_event_attendance does not exist" }),
    false,
  );
});

test("propagates permission and query failures instead of losing attendance", async () => {
  for (const code of ["42501", "PGRST204", undefined]) {
    const fake = fakeClient([{
      data: null,
      error: { code, message: "attendance query failed" },
    }]);

    await assert.rejects(
      loadMemberEventAttendance({}, fake.client),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes("attendance query failed") &&
        fake.tables.length === 1,
    );
  }
});
