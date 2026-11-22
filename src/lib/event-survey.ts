import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEventValueFeedbackUpsert } from "./event-feedback.ts";
import type {
  SubmissionPersonInput,
  SubmissionPersonResult,
} from "./submission-person.ts";
import { FIELD_MAX, checkLengths } from "./validation.ts";

export type EventSurveyResult =
  | { ok: true }
  | { ok: false; error: string };

export type EventSurveyPersonResolver = (
  input: SubmissionPersonInput,
) => Promise<SubmissionPersonResult>;

function stringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullable(value: string): string | null {
  return value === "" ? null : value;
}

export async function submitEventSurveyWithClient(
  client: Pick<SupabaseClient, "from">,
  eventId: string,
  formData: FormData,
  resolvePerson: EventSurveyPersonResolver,
): Promise<EventSurveyResult> {
  if (!eventId) return { ok: false, error: "Missing event id" };

  const { data: event, error: eventError } = await client
    .from("events")
    .select("id, status, survey_enabled")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError || !event) return { ok: false, error: "Event not found" };
  if (event.status === "draft" || !event.survey_enabled) {
    return { ok: false, error: "This survey is not open" };
  }

  const name = stringValue(formData.get("name"));
  const email = stringValue(formData.get("email")).toLowerCase();
  const ratingRaw = stringValue(formData.get("event_value_rating"));
  const loved = stringValue(formData.get("loved_text"));
  const improve = stringValue(formData.get("improve_text"));

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Please enter a valid email" };
  }
  const rating = Number(ratingRaw);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Please answer the first question" };
  }

  const tooLong = checkLengths([
    ["Name", name, FIELD_MAX.name],
    ["Email", email, FIELD_MAX.email],
    ["Most valuable part", loved, FIELD_MAX.longText],
    ["What to improve", improve, FIELD_MAX.longText],
  ]);
  if (tooLong) return { ok: false, error: tooLong };

  let personResult: SubmissionPersonResult;
  try {
    personResult = await resolvePerson({ email, name });
  } catch {
    return { ok: false, error: "Could not save your response" };
  }
  if (personResult.error || !personResult.data) {
    return { ok: false, error: "Could not save your response" };
  }
  const person = personResult.data;

  const [primaryRegistrationResult, attendeeRegistrationResult] =
    await Promise.all([
      client
        .from("event_registrations")
        .select("review_classification")
        .eq("event_id", eventId)
        .eq("person_id", person.id),
      client
        .from("event_registration_attendees")
        .select(
          "registration:event_registrations!inner(event_id, review_classification)",
        )
        .eq("email", email)
        .eq("registration.event_id", eventId),
    ]);
  if (primaryRegistrationResult.error || attendeeRegistrationResult.error) {
    return { ok: false, error: "This survey is not available" };
  }

  const classifications = [
    ...(primaryRegistrationResult.data ?? []).map(
      (row) => row.review_classification,
    ),
    ...((attendeeRegistrationResult.data ?? []) as unknown as {
      registration: { review_classification: string } | null;
    }[]).map((row) => row.registration?.review_classification),
  ].filter((value): value is string => Boolean(value));
  const hasOperationalRegistration = classifications.some(
    (value) => value !== "spam",
  );
  if (!hasOperationalRegistration && classifications.includes("spam")) {
    return { ok: false, error: "This survey is not available" };
  }

  const { error: feedbackError } = await client.from("event_feedback").upsert(
    buildEventValueFeedbackUpsert({
      event_id: eventId,
      person_id: person.id,
      event_value_rating: rating,
      loved_text: nullable(loved),
      improve_text: nullable(improve),
    }),
    { onConflict: "event_id,person_id" },
  );
  if (feedbackError) {
    return { ok: false, error: "Could not save your response" };
  }

  return { ok: true };
}
