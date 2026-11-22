import assert from "node:assert/strict";
import test from "node:test";

import {
  currentBoardTerm,
  hasCurrentBoardAppointment,
  type BoardAccessClient,
} from "./board-access.ts";

type Appointment = {
  id: string;
  person_id: string;
  position: string;
  fiscal_year_start: number;
};

// Minimal stand-in for the supabase query builder over board_appointments.
function fakeClient(rows: Appointment[]): BoardAccessClient {
  const query = (current: Appointment[]) => ({
    eq: (col: string, v: string | number) =>
      query(current.filter((r) => r[col as keyof Appointment] === v)),
    lte: (col: string, v: number) =>
      query(current.filter((r) => (r[col as keyof Appointment] as number) <= v)),
    in: (col: string, vs: readonly string[]) =>
      query(current.filter((r) => vs.includes(r[col as keyof Appointment] as string))),
    order: (col: string, o: { ascending: boolean }) =>
      query(
        [...current].sort((a, b) => {
          const d = (a[col as keyof Appointment] as number) - (b[col as keyof Appointment] as number);
          return o.ascending ? d : -d;
        }),
      ),
    limit: (n: number) => query(current.slice(0, n)),
    then: <T>(resolve: (r: { data: Appointment[] }) => T) =>
      Promise.resolve({ data: current }).then(resolve),
  });
  return { from: () => ({ select: () => query(rows) }) } as unknown as BoardAccessClient;
}

const sitting: Appointment[] = [
  { id: "a1", person_id: "old-chair", position: "Chair", fiscal_year_start: 2025 },
  { id: "a2", person_id: "chair", position: "Chair", fiscal_year_start: 2026 },
  { id: "a3", person_id: "cochair", position: "Co-Chair", fiscal_year_start: 2026 },
  { id: "a4", person_id: "committee", position: "Committee Member", fiscal_year_start: 2026 },
];

test("current term is the latest one on record when none is future-dated", async () => {
  const client = fakeClient(sitting);
  assert.equal(await currentBoardTerm(client, 2026), 2026);
  assert.equal(await hasCurrentBoardAppointment(client, "chair", 2026), true);
  assert.equal(await hasCurrentBoardAppointment(client, "cochair", 2026), true);
  assert.equal(await hasCurrentBoardAppointment(client, "committee", 2026), false);
  assert.equal(await hasCurrentBoardAppointment(client, "old-chair", 2026), false);
});

test("a future-dated appointment does not become the current term", async () => {
  const client = fakeClient([
    ...sitting,
    { id: "a5", person_id: "incoming", position: "Chair", fiscal_year_start: 2027 },
    { id: "a6", person_id: "mistake", position: "Chair", fiscal_year_start: 2099 },
  ]);
  assert.equal(await currentBoardTerm(client, 2026), 2026);
  // Sitting chairs keep access; the future appointees do not get it early.
  assert.equal(await hasCurrentBoardAppointment(client, "chair", 2026), true);
  assert.equal(await hasCurrentBoardAppointment(client, "cochair", 2026), true);
  assert.equal(await hasCurrentBoardAppointment(client, "incoming", 2026), false);
  assert.equal(await hasCurrentBoardAppointment(client, "mistake", 2026), false);
});

test("the next term takes over once its fiscal year starts", async () => {
  const client = fakeClient([
    ...sitting,
    { id: "a5", person_id: "incoming", position: "Chair", fiscal_year_start: 2027 },
  ]);
  assert.equal(await currentBoardTerm(client, 2027), 2027);
  assert.equal(await hasCurrentBoardAppointment(client, "incoming", 2027), true);
  assert.equal(await hasCurrentBoardAppointment(client, "chair", 2027), false);
});

test("the previous term stays in force until the new board is entered", async () => {
  const client = fakeClient(sitting);
  assert.equal(await currentBoardTerm(client, 2027), 2026);
  assert.equal(await hasCurrentBoardAppointment(client, "chair", 2027), true);
});

test("no appointments, or no person, means no access", async () => {
  assert.equal(await currentBoardTerm(fakeClient([]), 2026), null);
  assert.equal(await hasCurrentBoardAppointment(fakeClient([]), "chair", 2026), false);
  assert.equal(await hasCurrentBoardAppointment(fakeClient(sitting), "", 2026), false);
});
