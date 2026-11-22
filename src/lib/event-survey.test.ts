import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  submitEventSurveyWithClient,
  type EventSurveyPersonResolver,
} from "./event-survey.ts";

type QueryResult = { data: unknown; error: { message: string } | null };

function queryBuilder(
  result: QueryResult,
  filters: Array<[string, unknown]> = [],
) {
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      filters.push([column, value]);
      return builder;
    },
    maybeSingle: async () => result,
    single: async () => result,
    then: (
      resolve: (value: QueryResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

function surveyClient(options?: { feedbackError?: string }) {
  let feedbackPayload: Record<string, unknown> | null = null;
  const registrationFilters: Array<[string, unknown]> = [];

  const client = {
    from(table: string) {
      if (table === "events") {
        return queryBuilder({
          data: { id: "event-1", status: "published", survey_enabled: true },
          error: null,
        });
      }
      if (table === "people") {
        throw new Error("event survey must resolve people through the shared resolver");
      }
      if (table === "event_registrations") {
        return queryBuilder({
          data: [{ review_classification: "normal" }],
          error: null,
        }, registrationFilters);
      }
      if (table === "event_registration_attendees") {
        return queryBuilder({ data: [], error: null });
      }
      if (table === "event_feedback") {
        return {
          upsert: async (payload: Record<string, unknown>) => {
            feedbackPayload = payload;
            return {
              data: null,
              error: options?.feedbackError
                ? { message: options.feedbackError }
                : null,
            };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as Pick<SupabaseClient, "from">;

  const resolvePerson: EventSurveyPersonResolver = async (input) => {
    assert.equal(input.email, "member@example.com");
    return {
      data: { id: "person-1" },
      error: null,
      mode: "alternate",
    };
  };

  return {
    client,
    resolvePerson,
    feedbackPayload: () => feedbackPayload,
    registrationFilters,
  };
}

function validFormData() {
  const formData = new FormData();
  formData.set("email", " MEMBER@EXAMPLE.COM ");
  formData.set("event_value_rating", "5");
  formData.set("loved_text", " Practical examples ");
  return formData;
}

test("public survey submits event value without overwriting historical growth", async () => {
  const store = surveyClient();

  assert.deepEqual(
    await submitEventSurveyWithClient(
      store.client,
      "event-1",
      validFormData(),
      store.resolvePerson,
    ),
    { ok: true },
  );
  assert.deepEqual(store.feedbackPayload(), {
    event_id: "event-1",
    person_id: "person-1",
    event_value_rating: 5,
    loved_text: "Practical examples",
    improve_text: null,
  });
  assert.deepEqual(store.registrationFilters, [
    ["event_id", "event-1"],
    ["person_id", "person-1"],
  ]);
  assert.equal("rating_overall" in (store.feedbackPayload() ?? {}), false);
});

test("public survey rejects an out-of-range event value before writing", async () => {
  const store = surveyClient();
  const formData = validFormData();
  formData.set("event_value_rating", "6");

  assert.deepEqual(
    await submitEventSurveyWithClient(
      store.client,
      "event-1",
      formData,
      store.resolvePerson,
    ),
    { ok: false, error: "Please answer the first question" },
  );
  assert.equal(store.feedbackPayload(), null);
});

test("public survey hides database errors from attendees", async () => {
  const store = surveyClient({
    feedbackError: 'column "event_value_rating" does not exist',
  });

  assert.deepEqual(
    await submitEventSurveyWithClient(
      store.client,
      "event-1",
      validFormData(),
      store.resolvePerson,
    ),
    { ok: false, error: "Could not save your response" },
  );
});
