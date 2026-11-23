"use server";

import { revalidatePath } from "next/cache";
import { requireBoardOrAbove } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { recordAudit } from "@/kernel/audit/audit";
import {
  CHAPTER_METRIC_FIELDS,
  type ChapterMetricField,
} from "@/lib/chapter-metrics";

type ActionResult = { ok: true } | { ok: false; error: string };

const TEXT_FIELDS: ChapterMetricField[] = ["president", "forum_health"];
const INTEGER_FIELDS: ChapterMetricField[] = [
  "members",
  "forum_count",
  "chapter_events",
  "revenue_usd",
  "revenue_per_member_usd",
  "end_of_year_reserves_usd",
  "eo_grants_usd",
  "sap_usd",
  "dues_per_member_usd",
  "initiation_fee_usd",
  "secondary_dues_usd",
];

function parseFieldValue(
  raw: string,
  field: ChapterMetricField,
): { ok: true; value: string | number | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  if (TEXT_FIELDS.includes(field)) return { ok: true, value: trimmed };

  const cleaned = trimmed.replace(/[$,%\s]/g, "");
  const num = Number(cleaned);
  if (!Number.isFinite(num)) {
    return { ok: false, error: `"${raw}" is not a number` };
  }
  if (INTEGER_FIELDS.includes(field)) {
    if (num < 0) return { ok: false, error: "Value cannot be negative" };
    return { ok: true, value: Math.round(num) };
  }
  if (field === "retention_pct") {
    if (num < 0 || num > 100) {
      return { ok: false, error: "Retention must be between 0 and 100" };
    }
    return { ok: true, value: num };
  }
  if (field === "average_event_score") {
    if (num < 0 || num > 10) {
      return { ok: false, error: "Score must be between 0 and 10" };
    }
    return { ok: true, value: num };
  }
  return { ok: true, value: num };
}

export async function updateCell(
  fiscalYear: string,
  field: ChapterMetricField,
  rawValue: string,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!CHAPTER_METRIC_FIELDS.includes(field)) {
    return { ok: false, error: `Invalid field: ${field}` };
  }
  const parsed = parseFieldValue(rawValue, field);
  if (!parsed.ok) return parsed;

  const { error } = await supabase
    .from("chapter_metrics")
    .update({ [field]: parsed.value })
    .eq("fiscal_year", fiscalYear);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/board/historical-metrics");
  revalidatePath("/board/chapter-dashboard");
  return { ok: true };
}

export async function addYear(rawLabel: string): Promise<ActionResult> {
  await requireBoardOrAbove();
  const label = rawLabel.trim();
  const match = label.match(/^(\d{2})\/(\d{2})$/);
  if (!match) {
    return { ok: false, error: "Year must be in YY/YY format (e.g. 26/27)" };
  }
  const startTwo = Number(match[1]);
  const endTwo = Number(match[2]);
  const expectedEnd = (startTwo + 1) % 100;
  if (endTwo !== expectedEnd) {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return {
      ok: false,
      error: `Years must be consecutive (e.g. ${pad(startTwo)}/${pad(expectedEnd)})`,
    };
  }
  // Two-digit years 50–99 wrap to 1900s; everything else is 2000s.
  const startFull = startTwo >= 50 ? 1900 + startTwo : 2000 + startTwo;

  const { error } = await supabase.from("chapter_metrics").insert({
    fiscal_year: label,
    fiscal_year_start: startFull,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `Year ${label} already exists` };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath("/board/historical-metrics");
  return { ok: true };
}

export async function deleteYear(fiscalYear: string): Promise<ActionResult> {
  await requireBoardOrAbove();
  const { error } = await supabase
    .from("chapter_metrics")
    .delete()
    .eq("fiscal_year", fiscalYear);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/board/historical-metrics");
  return { ok: true };
}

/**
 * Opens one fiscal year for dues (or none, with an empty string). The dues
 * pages charge the open year's amounts, so exactly one year stays open.
 */
export async function setOpenDuesYear(fiscalYear: string): Promise<ActionResult> {
  const user = await requireBoardOrAbove();
  const target = fiscalYear.trim();
  if (target) {
    const { data: row } = await supabase
      .from("chapter_metrics")
      .select("fiscal_year, dues_per_member_usd")
      .eq("fiscal_year", target)
      .maybeSingle();
    if (!row) return { ok: false, error: `No ${target} row` };
    if (!row.dues_per_member_usd) {
      return { ok: false, error: `Set the dues per member for ${target} before opening it` };
    }
  }
  const { error: closeErr } = await supabase
    .from("chapter_metrics")
    .update({ dues_open: false })
    .eq("dues_open", true);
  if (closeErr) return { ok: false, error: closeErr.message };
  if (target) {
    const { error } = await supabase.from("chapter_metrics").update({ dues_open: true }).eq("fiscal_year", target);
    if (error) return { ok: false, error: error.message };
  }
  await recordAudit({
    table: "chapter_metrics",
    recordId: target || "none",
    operation: "update",
    actor: user.email,
    newData: { dues_open_year: target || null },
  });
  revalidatePath("/board/historical-metrics");
  revalidatePath("/chapter-dues");
  revalidatePath("/secondary-chapter-dues");
  return { ok: true };
}
