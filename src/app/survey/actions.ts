"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { getPublishedSurveyBySlug } from "@/lib/surveys";
import { resolveSubmissionPersonWithSupabase } from "@/lib/submission-person-supabase";
import {
  submitSurveyResponseWithDependencies,
  type SubmitInput,
  type SubmitResult,
} from "@/lib/survey-submission";

// Public survey submission. Open to anyone with the link. It resolves the
// respondent through the shared identity boundary, then writes one
// survey_responses envelope + survey_answers rows. Pulse legacy-mapped fields
// also mirror onto rating/comment/topics so the existing board dashboard keeps
// working.

export type { SubmitInput, SubmitResult };

export async function submitSurveyResponse(input: SubmitInput): Promise<SubmitResult> {
  return submitSurveyResponseWithDependencies(input, {
    client: supabase,
    getSurvey: getPublishedSurveyBySlug,
    resolvePerson: resolveSubmissionPersonWithSupabase,
    onSuccess: () => revalidatePath("/board/surveys"),
  });
}
