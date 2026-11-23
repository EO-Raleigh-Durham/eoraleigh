import { supabase } from "./supabase";
import { PREWORK_CYCLE, hasAnyAnswer, sanitizeAnswers, type PreworkAnswers } from "./board-prework";

// Server-only reads and writes for the board pre-work worksheet (migration
// 131). This client bypasses RLS: callers must already have passed
// requireBoardOrAbove(), and must only ever pass the signed-in user's own id.

const TABLE = "board_prework_responses";

export type MyPrework = { answers: PreworkAnswers; submittedAt: string | null; updatedAt: string };

export async function getMyPrework(userId: string): Promise<MyPrework | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("answers, submitted_at, updated_at")
    .eq("cycle", PREWORK_CYCLE)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    answers: sanitizeAnswers(data.answers),
    submittedAt: data.submitted_at,
    updatedAt: data.updated_at,
  };
}

// `finished` undefined leaves the finished mark as it is.
export async function saveMyPrework(
  user: { id: string; name: string },
  answers: PreworkAnswers,
  finished: boolean | undefined,
): Promise<{ savedAt: string; submittedAt: string | null }> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        cycle: PREWORK_CYCLE,
        user_id: user.id,
        respondent_name: user.name,
        answers,
        updated_at: now,
        ...(finished === undefined ? {} : { submitted_at: finished ? now : null }),
      },
      { onConflict: "cycle,user_id" },
    )
    .select("submitted_at")
    .single();
  if (error) throw error;
  return { savedAt: now, submittedAt: data.submitted_at };
}

// Who has finished, and how many are still in draft. No answers.
export async function getPreworkProgress(): Promise<{ finished: string[]; drafts: number }> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("respondent_name, submitted_at")
    .eq("cycle", PREWORK_CYCLE);
  if (error) throw error;
  const rows = data ?? [];
  return {
    finished: rows
      .filter((r) => r.submitted_at)
      .map((r) => r.respondent_name ?? "A board member")
      .sort((a, b) => a.localeCompare(b)),
    drafts: rows.filter((r) => !r.submitted_at).length,
  };
}

// Everyone's answers for the combined view: answers only, no names.
export async function listPreworkAnswers(): Promise<PreworkAnswers[]> {
  const { data, error } = await supabase.from(TABLE).select("answers").eq("cycle", PREWORK_CYCLE);
  if (error) throw error;
  return (data ?? []).map((r) => sanitizeAnswers(r.answers)).filter(hasAnyAnswer);
}
