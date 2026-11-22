import assert from "node:assert/strict";
import test from "node:test";
import {
  MTP_FNL_EVENT_ID,
  MTP_SEAT_LIMIT,
  countMtpSeats,
  isMtpSelection,
} from "./mtp-fnl-seats.ts";

test("MTP alone and both trainings take an MTP seat; FNL alone does not", () => {
  assert.equal(isMtpSelection("Chapter: EO Example. Training: Moderator Training Program (MTP)"), true);
  assert.equal(
    isMtpSelection(
      "Chapter: EO Example. Training: Moderator Training Program (MTP) and Forum Next Level (FNL)",
    ),
    true,
  );
  assert.equal(isMtpSelection("Chapter: EO Example. Training: Forum Next Level (FNL)"), false);
  assert.equal(isMtpSelection(null), false);
  assert.equal(isMtpSelection(""), false);
});

test("seat limit is 12", () => {
  assert.equal(MTP_SEAT_LIMIT, 12);
});

function fakeClient(result: { count: number | null; error: { message: string } | null }) {
  const calls: Record<string, unknown> = {};
  const client = {
    from(table: string) {
      calls.table = table;
      return {
        select() {
          return {
            eq(col: string, val: string) {
              calls.eq = [col, val];
              return {
                in(col2: string, vals: readonly string[]) {
                  calls.in = [col2, vals];
                  return {
                    like(col3: string, pattern: string) {
                      calls.like = [col3, pattern];
                      return Promise.resolve(result);
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
  return { client, calls };
}

test("countMtpSeats counts held MTP registrations for the event", async () => {
  const { client, calls } = fakeClient({ count: 11, error: null });
  assert.equal(await countMtpSeats(client), 11);
  assert.deepEqual(calls.eq, ["event_id", MTP_FNL_EVENT_ID]);
  assert.deepEqual(calls.in, ["status", ["registered", "attended", "pending_payment"]]);
  assert.equal(calls.table, "event_registrations");
});

test("countMtpSeats returns null on a read error so registration is not blocked", async () => {
  const { client } = fakeClient({ count: null, error: { message: "boom" } });
  assert.equal(await countMtpSeats(client), null);
});
