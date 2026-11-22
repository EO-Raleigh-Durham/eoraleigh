"use server";

import { supabase } from "@/lib/supabase";
import { submitEventSurveyWithClient } from "@/lib/event-survey";
import { resolveSubmissionPersonWithSupabase } from "@/lib/submission-person-supabase";

// Public post-event survey submission. Lives outside /admin so it is not behind
// the admin gate. Writes the 3-question survey into event_feedback:
//   Q1 (1-5 event value)       -> event_value_rating
//   Q2 (most valuable part)    -> loved_text
//   Q3 (one thing to improve)  -> improve_text
// Historical rating_overall values remain a separate transformational-growth
// measure and are not reused for the new question.
// One response per (event, canonical person), deduped by the event_feedback
// unique constraint after alias-first identity resolution.

export async function submitEventSurvey(
  eventId: string,
  formData: FormData,
) {
  return submitEventSurveyWithClient(
    supabase,
    eventId,
    formData,
    resolveSubmissionPersonWithSupabase,
  );
}
