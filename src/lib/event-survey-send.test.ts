import assert from "node:assert/strict";
import test from "node:test";

import {
  isDueForSurvey,
  pickSurveyRecipients,
  runEventSurveySend,
  type SurveySendEvent,
} from "./event-survey-send.ts";

const now = new Date("2026-11-20T12:00:00Z");
const base: SurveySendEvent = {
  id: "e1",
  title: "Learning night",
  slug: "learning-night",
  starts_at: "2026-11-20T06:00:00Z",
  ends_at: "2026-11-20T09:00:00Z",
  status: "open",
  scope: "local",
  survey_enabled: true,
  survey_sent_at: null,
};

test("a chapter event is due 1 to 72 hours after it ends", () => {
  assert.equal(isDueForSurvey(base, now), true);
  assert.equal(isDueForSurvey({ ...base, ends_at: "2026-11-20T11:30:00Z" }, now), false);
  assert.equal(isDueForSurvey({ ...base, ends_at: "2026-11-17T11:00:00Z" }, now), false);
  assert.equal(isDueForSurvey({ ...base, ends_at: null, starts_at: "2026-11-20T08:00:00Z" }, now), true);
});

test("sent, global, draft, cancelled or survey-off events are never due", () => {
  assert.equal(isDueForSurvey({ ...base, survey_sent_at: "2026-11-20T10:05:00Z" }, now), false);
  assert.equal(isDueForSurvey({ ...base, scope: "global" }, now), false);
  assert.equal(isDueForSurvey({ ...base, status: "draft" }, now), false);
  assert.equal(isDueForSurvey({ ...base, status: "cancelled" }, now), false);
  assert.equal(isDueForSurvey({ ...base, survey_enabled: false }, now), false);
});

test("recipients are registrants and guests, minus spam, other statuses and responders", () => {
  const recipients = pickSurveyRecipients(
    [
      { status: "registered", review_classification: "ok", person: { email: "A@x.com ", name: "A" },
        attendees: [{ email: "guest@x.com", full_name: "Guest" }, { email: "a@x.com", full_name: "Dup" }] },
      { status: "attended", review_classification: null, person: { email: "b@x.com", name: "B" } },
      { status: "registered", review_classification: "spam", person: { email: "spam@x.com", name: null } },
      { status: "waitlisted", review_classification: "ok", person: { email: "w@x.com", name: null } },
      { status: "cancelled", review_classification: "ok", person: { email: "c@x.com", name: null } },
      { status: "registered", review_classification: "ok", person: { email: "done@x.com", name: null } },
      { status: "registered", review_classification: "ok", person: { email: "not-an-email", name: null } },
    ],
    ["DONE@x.com"],
  );
  assert.deepEqual(recipients, [
    { email: "a@x.com", name: "A" },
    { email: "guest@x.com", name: "Guest" },
    { email: "b@x.com", name: "B" },
  ]);
});

// Minimal fake of the Supabase query builder for the runner.
function fakeClient(tables: Record<string, unknown[]>, updates: unknown[]) {
  return {
    from(table: string) {
      let pendingUpdate: unknown = null;
      const builder: Record<string, unknown> = {
        select: () => builder,
        gte: () => builder,
        lte: () => builder,
        eq: () => builder,
        is: () => builder,
        update: (values: unknown) => {
          pendingUpdate = values;
          updates.push({ table, values });
          return builder;
        },
        then: (resolve: (v: unknown) => unknown) =>
          resolve({
            data: pendingUpdate ? [{ id: "e1" }] : tables[table] ?? [],
            error: null,
          }),
      };
      return builder;
    },
  };
}

test("runner claims the event, mails the survey link and records the count", async () => {
  const updates: unknown[] = [];
  const mails: { subject: string; bodyText: string; recipients: unknown[] }[] = [];
  const client = fakeClient(
    {
      events: [base, { ...base, id: "e2", scope: "global" }],
      event_registrations: [
        { status: "registered", review_classification: "ok", person: { email: "a@x.com", name: "A" } },
      ],
      event_feedback: [],
    },
    updates,
  );
  const report = await runEventSurveySend(
    client as never,
    async (input) => {
      mails.push(input);
      return { sent: input.recipients.length, failed: 0 };
    },
    "https://chapter.example.org",
    now,
  );
  assert.equal(report.checked, 1);
  assert.equal(mails.length, 1);
  assert.match(mails[0].bodyText, /https:\/\/chapter\.example\.org\/events\/learning-night\/survey/);
  assert.deepEqual(updates, [
    { table: "events", values: { survey_sent_at: now.toISOString(), survey_sent_count: 0 } },
    { table: "events", values: { survey_sent_count: 1 } },
  ]);
});
