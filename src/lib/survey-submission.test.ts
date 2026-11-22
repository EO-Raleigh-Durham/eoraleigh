import assert from "node:assert/strict";
import test from "node:test";

import {
  submitSurveyResponseWithDependencies,
  type SurveySubmissionDependencies,
} from "./survey-submission.ts";
import type { SurveyWithFields } from "./surveys.ts";

const survey = {
  id: "survey-1",
  kind: "pulse",
  slug: "pulse",
  name: "Pulse",
  description: null,
  status: "published",
  intro_text: null,
  thank_you_text: "Thanks",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  fields: [
    {
      id: "comment",
      survey_id: "survey-1",
      position: 1,
      type: "short_text",
      label: "Comment",
      help_text: null,
      required: true,
      config: {},
      legacy_map: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ],
} as SurveyWithFields;

function queryBuilder(
  result: { data: unknown; error: { message: string } | null },
  inserts: Array<{ table: string; value: unknown }>,
  table: string,
) {
  const builder = {
    insert(value: unknown) {
      inserts.push({ table, value });
      return builder;
    },
    select: () => builder,
    single: async () => result,
    then: (
      resolve: (value: typeof result) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

function dependencies(
  resolvePerson: SurveySubmissionDependencies["resolvePerson"],
) {
  const inserts: Array<{ table: string; value: unknown }> = [];
  const client = {
    from(table: string) {
      if (table === "survey_responses") {
        return queryBuilder({ data: { id: "response-1" }, error: null }, inserts, table);
      }
      if (table === "survey_answers") {
        return queryBuilder({ data: null, error: null }, inserts, table);
      }
      if (table === "survey_response_topics") {
        return queryBuilder({ data: null, error: null }, inserts, table);
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SurveySubmissionDependencies["client"];

  return {
    deps: {
      client,
      getSurvey: async () => survey,
      resolvePerson,
    } satisfies SurveySubmissionDependencies,
    inserts,
  };
}

function input() {
  return {
    slug: "pulse",
    name: "Submitted Name",
    email: " ALTERNATE@EXAMPLE.COM ",
    answers: { comment: "A useful answer" },
  };
}

test("attributes an alternate-email survey response to the canonical person", async () => {
  let peopleCalls = 0;
  const store = dependencies(async (personInput) => {
    assert.deepEqual(personInput, {
      email: "alternate@example.com",
      name: "Submitted Name",
    });
    peopleCalls += 1;
    return {
      data: { id: "person-canonical" },
      error: null,
      mode: "alternate",
    };
  });

  assert.deepEqual(
    await submitSurveyResponseWithDependencies(input(), store.deps),
    { ok: true, thankYou: "Thanks" },
  );
  assert.equal(peopleCalls, 1);
  assert.deepEqual(store.inserts, [
    {
      table: "survey_responses",
      value: {
        survey_id: "survey-1",
        person_id: "person-canonical",
        respondent_name: "Submitted Name",
        respondent_email: "alternate@example.com",
        rating: null,
        comment: null,
      },
    },
    {
      table: "survey_answers",
      value: [{ response_id: "response-1", field_id: "comment", value: "A useful answer" }],
    },
  ]);
});

test("keeps resolver failures generic for a public survey", async () => {
  const store = dependencies(async () => ({
    data: null,
    error: { code: "42501", message: "secret database detail" },
    mode: null,
  }));

  assert.deepEqual(
    await submitSurveyResponseWithDependencies(input(), store.deps),
    { ok: false, error: "Could not save your submission" },
  );
  assert.deepEqual(store.inserts, []);
});

test("does not expose whether the person was primary, alternate, or created", async () => {
  const results = [];
  for (const mode of ["primary", "alternate", "created"] as const) {
    const store = dependencies(async () => ({
      data: { id: "person-canonical" },
      error: null,
      mode,
    }));
    results.push(await submitSurveyResponseWithDependencies(input(), store.deps));
  }

  assert.deepEqual(results, [
    { ok: true, thankYou: "Thanks" },
    { ok: true, thankYou: "Thanks" },
    { ok: true, thankYou: "Thanks" },
  ]);
});
