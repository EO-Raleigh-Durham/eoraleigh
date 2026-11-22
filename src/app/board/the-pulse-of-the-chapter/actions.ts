"use server";

import { revalidatePath } from "next/cache";
import { requireBoardOrAbove } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// Board-editable chapter growth goal (chapter_goals, migration 066).
// The action authorizes independently of the page layout.

type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateChapterGoal(
  fiscalYearStart: number,
  input: { netGrowthTargetPct: number; riskLapseRate: number; sourceNote: string },
): Promise<ActionResult> {
  await requireBoardOrAbove();
  const target = Number(input.netGrowthTargetPct);
  const lapse = Number(input.riskLapseRate);

  if (!Number.isFinite(target) || target < -100 || target > 100) {
    return { ok: false, error: "Growth target must be a percentage between -100 and 100" };
  }
  if (!Number.isFinite(lapse) || lapse < 0 || lapse > 1) {
    return { ok: false, error: "Risk lapse rate must be between 0% and 100%" };
  }

  const { error } = await supabase.from("chapter_goals").upsert(
    {
      fiscal_year_start: fiscalYearStart,
      net_growth_target_pct: target,
      risk_lapse_rate: lapse,
      source_note: input.sourceNote.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "fiscal_year_start" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/board/the-pulse-of-the-chapter");
  return { ok: true };
}
