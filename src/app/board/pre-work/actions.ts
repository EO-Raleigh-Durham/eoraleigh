"use server";

import { requireBoardOrAbove } from "@/lib/auth";
import { PREWORK_DEADLINE_LABEL, isPreworkOpen, sanitizeAnswers } from "@/lib/board-prework";
import { saveMyPrework } from "@/lib/board-prework-store";

type Result = { ok: true; savedAt: string; submittedAt: string | null } | { ok: false; error: string };

// Saves the signed-in board member's own worksheet. The row is always keyed
// by the session user, never by anything the browser sends. Pass `finished`
// to mark it finished or put it back to draft; leave it out for an auto-save.
export async function savePrework(input: unknown, finished?: boolean): Promise<Result> {
  const user = await requireBoardOrAbove();
  if (!isPreworkOpen()) {
    return { ok: false, error: `The worksheet closed at ${PREWORK_DEADLINE_LABEL}.` };
  }
  try {
    const saved = await saveMyPrework(
      { id: user.id, name: user.fullName ?? user.email },
      sanitizeAnswers(input),
      typeof finished === "boolean" ? finished : undefined,
    );
    return { ok: true, ...saved };
  } catch (error) {
    console.error("savePrework failed:", error);
    return { ok: false, error: "Could not save. Check your connection and try again." };
  }
}
