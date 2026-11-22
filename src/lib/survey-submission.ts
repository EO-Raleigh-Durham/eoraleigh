import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  SubmissionPersonInput,
  SubmissionPersonResult,
} from "./submission-person.ts";
import type { SurveyWithFields } from "./surveys.ts";

export type SubmitInput = {
  slug: string;
  name: string;
  email: string;
  answers: Record<string, string | string[]>;
};

export type SurveySubmissionDependencies = {
  client: Pick<SupabaseClient, "from">;
  getSurvey: (slug: string) => Promise<SurveyWithFields | null>;
  resolvePerson: (
    input: SubmissionPersonInput,
  ) => Promise<SubmissionPersonResult>;
  onSuccess?: () => void | Promise<void>;
};

export type SubmitResult =
  | { ok: true; thankYou: string | null }
  | { ok: false; error: string };

function isBlank(value: string | string[] | undefined): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  return value.trim() === "";
}

/**
 * Persist a generic survey response after resolving its person through the
 * shared alias-first identity boundary. The caller supplies server-owned
 * dependencies so the behavior can be verified without a database connection.
 */
export async function submitSurveyResponseWithDependencies(
  input: SubmitInput,
  dependencies: SurveySubmissionDependencies,
): Promise<SubmitResult> {
  const survey = await dependencies.getSurvey(input.slug);
  if (!survey) return { ok: false, error: "This survey is not available" };

  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();
  if (!name) return { ok: false, error: "Please enter your name" };
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Please enter a valid email" };
  }

  const answers = input.answers ?? {};

  for (const field of survey.fields) {
    if (field.required && isBlank(answers[field.id])) {
      return { ok: false, error: `Please answer: ${field.label}` };
    }
  }

  let personResult: SubmissionPersonResult;
  try {
    personResult = await dependencies.resolvePerson({ email, name });
  } catch {
    return { ok: false, error: "Could not save your submission" };
  }
  if (personResult.error || !personResult.data) {
    return { ok: false, error: "Could not save your submission" };
  }
  const person = personResult.data;

  let legacyRating: number | null = null;
  let legacyComment: string | null = null;
  let legacyTopics: string[] = [];
  for (const field of survey.fields) {
    if (!field.legacy_map) continue;
    const answer = answers[field.id];
    if (
      field.legacy_map === "rating" &&
      typeof answer === "string" &&
      answer.trim() !== ""
    ) {
      const rating = Number(answer);
      if (Number.isFinite(rating) && rating >= 1 && rating <= 5) {
        legacyRating = Math.round(rating);
      }
    } else if (field.legacy_map === "comment" && typeof answer === "string") {
      legacyComment = answer.trim() || null;
    } else if (field.legacy_map === "topic") {
      legacyTopics = Array.isArray(answer) ? answer : answer ? [answer] : [];
    }
  }

  const { data: response, error: responseError } = await dependencies.client
    .from("survey_responses")
    .insert({
      survey_id: survey.id,
      person_id: person.id,
      respondent_name: name,
      respondent_email: email,
      rating: legacyRating,
      comment: legacyComment,
    })
    .select("id")
    .single();
  if (responseError || !response) {
    return { ok: false, error: "Could not save your submission" };
  }

  const answerRows: Array<{
    response_id: string;
    field_id: string;
    value: string;
  }> = [];
  for (const field of survey.fields) {
    const answer = answers[field.id];
    if (isBlank(answer)) continue;
    if (Array.isArray(answer)) {
      for (const value of answer) {
        const trimmed = value.trim();
        if (trimmed) {
          answerRows.push({
            response_id: response.id,
            field_id: field.id,
            value: trimmed,
          });
        }
      }
    } else {
      answerRows.push({
        response_id: response.id,
        field_id: field.id,
        value: answer.trim(),
      });
    }
  }
  if (answerRows.length > 0) {
    const { error: answerError } = await dependencies.client
      .from("survey_answers")
      .insert(answerRows);
    if (answerError) return { ok: false, error: "Could not save your submission" };
  }

  if (legacyTopics.length > 0) {
    const topicRows = legacyTopics
      .map((topic) => topic.trim())
      .filter(Boolean)
      .map((topic) => ({ response_id: response.id, topic }));
    if (topicRows.length > 0) {
      await dependencies.client.from("survey_response_topics").insert(topicRows);
    }
  }

  await dependencies.onSuccess?.();
  return { ok: true, thankYou: survey.thank_you_text };
}
