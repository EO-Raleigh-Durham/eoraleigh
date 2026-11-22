"use server";

import { revalidatePath } from "next/cache";
import { requireBoardOrAbove } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  SURVEY_FIELD_TYPES,
  isChoiceType,
  type SurveyFieldType,
} from "@/lib/surveys";

// All survey-builder mutations. Server-side, secret-key client, bypasses RLS.
// Pulse legacy-mapped fields (legacy_map set) are protected: their type is
// locked and they can't be deleted, so the board dashboard mirror keeps working.

type ActionResult = { ok: true } | { ok: false; error: string };

function s(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}
function nullable(v: string): string | null {
  return v === "" ? null : v;
}

function slugify(input: string): string {
  const out = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return out || "survey";
}

async function uniqueSlug(base: string): Promise<string> {
  const { data } = await supabase.from("surveys").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug as string));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

function revalidateSurvey(id?: string) {
  revalidatePath("/board/surveys");
  if (id) {
    revalidatePath(`/board/surveys/${id}`);
    revalidatePath(`/board/surveys/${id}/results`);
  }
}

const VALID_STATUSES = ["draft", "published", "closed"] as const;

// ============================================================
// Surveys
// ============================================================

export async function createSurvey(formData: FormData): Promise<ActionResult> {
  await requireBoardOrAbove();
  const name = s(formData.get("name"));
  const description = s(formData.get("description"));
  if (!name) return { ok: false, error: "Name is required" };

  const slug = await uniqueSlug(slugify(name));
  const { data, error } = await supabase
    .from("surveys")
    .insert({
      name,
      description: nullable(description),
      slug,
      kind: "other",
      status: "draft",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidateSurvey(data.id);
  redirect(`/board/surveys/${data.id}?saved=1`);
}

export async function updateSurveyMeta(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!id) return { ok: false, error: "Missing survey id" };
  const name = s(formData.get("name"));
  if (!name) return { ok: false, error: "Name is required" };
  const status = s(formData.get("status"));
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { ok: false, error: "Invalid status" };
  }

  const { error } = await supabase
    .from("surveys")
    .update({
      name,
      description: nullable(s(formData.get("description"))),
      intro_text: nullable(s(formData.get("intro_text"))),
      thank_you_text: nullable(s(formData.get("thank_you_text"))),
      status,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateSurvey(id);
  redirect(`/board/surveys/${id}?saved=1`);
}

export async function setSurveyStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!id) return { ok: false, error: "Missing survey id" };
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { ok: false, error: "Invalid status" };
  }
  const { error } = await supabase.from("surveys").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateSurvey(id);
  return { ok: true };
}

export async function deleteSurvey(id: string): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!id) return { ok: false, error: "Missing survey id" };
  const { count } = await supabase
    .from("survey_responses")
    .select("*", { count: "exact", head: true })
    .eq("survey_id", id);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: "This survey has responses and can't be deleted. Close it instead.",
    };
  }
  const { error } = await supabase.from("surveys").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/board/surveys");
  redirect("/board/surveys?deleted=1");
}

// ============================================================
// Fields (questions)
// ============================================================

type FieldPatch = {
  type: SurveyFieldType;
  label: string;
  help_text: string | null;
  required: boolean;
  config: Record<string, unknown>;
};

function buildFieldPatch(
  formData: FormData,
): { ok: true; patch: FieldPatch } | { ok: false; error: string } {
  const type = s(formData.get("type")) as SurveyFieldType;
  const label = s(formData.get("label"));
  if (!SURVEY_FIELD_TYPES.includes(type)) {
    return { ok: false, error: "Invalid field type" };
  }
  if (!label) return { ok: false, error: "Question label is required" };

  const config: Record<string, unknown> = {};
  if (isChoiceType(type)) {
    const options = s(formData.get("options"))
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    if (options.length === 0) {
      return { ok: false, error: "Add at least one option (one per line)" };
    }
    config.options = options;
  } else if (type === "rating") {
    const min = Number(s(formData.get("min")) || "1");
    const max = Number(s(formData.get("max")) || "5");
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
      return { ok: false, error: "Rating min must be a number less than max" };
    }
    config.min = min;
    config.max = max;
    const minLabel = s(formData.get("min_label"));
    const maxLabel = s(formData.get("max_label"));
    if (minLabel) config.min_label = minLabel;
    if (maxLabel) config.max_label = maxLabel;
  } else if (type === "number") {
    const minRaw = s(formData.get("min"));
    const maxRaw = s(formData.get("max"));
    if (minRaw !== "" && Number.isFinite(Number(minRaw))) config.min = Number(minRaw);
    if (maxRaw !== "" && Number.isFinite(Number(maxRaw))) config.max = Number(maxRaw);
  }

  return {
    ok: true,
    patch: {
      type,
      label,
      help_text: nullable(s(formData.get("help_text"))),
      required: formData.get("required") === "on",
      config,
    },
  };
}

export async function createSurveyField(
  surveyId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!surveyId) return { ok: false, error: "Missing survey id" };
  const built = buildFieldPatch(formData);
  if (!built.ok) return built;

  const { data: last } = await supabase
    .from("survey_fields")
    .select("position")
    .eq("survey_id", surveyId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((last?.position as number | undefined) ?? -1) + 1;

  const { error } = await supabase
    .from("survey_fields")
    .insert({ survey_id: surveyId, position, ...built.patch });
  if (error) return { ok: false, error: error.message };

  revalidateSurvey(surveyId);
  return { ok: true };
}

export async function updateSurveyField(
  fieldId: string,
  surveyId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!fieldId || !surveyId) return { ok: false, error: "Missing field or survey id" };
  const built = buildFieldPatch(formData);
  if (!built.ok) return built;

  // Lock the type of Pulse legacy-mapped fields so the dashboard mirror holds.
  const { data: existing } = await supabase
    .from("survey_fields")
    .select("legacy_map, type")
    .eq("id", fieldId)
    .maybeSingle();
  const patch: FieldPatch = { ...built.patch };
  if (existing?.legacy_map) patch.type = existing.type as SurveyFieldType;

  const { error } = await supabase.from("survey_fields").update(patch).eq("id", fieldId);
  if (error) return { ok: false, error: error.message };

  revalidateSurvey(surveyId);
  return { ok: true };
}

export async function deleteSurveyField(
  fieldId: string,
  surveyId: string,
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!fieldId || !surveyId) return { ok: false, error: "Missing field or survey id" };

  const { data: existing } = await supabase
    .from("survey_fields")
    .select("legacy_map")
    .eq("id", fieldId)
    .maybeSingle();
  if (existing?.legacy_map) {
    return {
      ok: false,
      error: "This question feeds the Pulse dashboard and can't be deleted.",
    };
  }

  const { error } = await supabase.from("survey_fields").delete().eq("id", fieldId);
  if (error) return { ok: false, error: error.message };

  revalidateSurvey(surveyId);
  return { ok: true };
}

export async function moveSurveyField(
  fieldId: string,
  surveyId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  await requireBoardOrAbove();
  if (!fieldId || !surveyId) return { ok: false, error: "Missing field or survey id" };

  const { data: fields } = await supabase
    .from("survey_fields")
    .select("id, position")
    .eq("survey_id", surveyId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (!fields) return { ok: false, error: "Could not load questions" };

  const idx = fields.findIndex((f) => f.id === fieldId);
  if (idx === -1) return { ok: false, error: "Question not found" };
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= fields.length) return { ok: true };

  const a = fields[idx];
  const b = fields[swapIdx];
  await supabase.from("survey_fields").update({ position: b.position }).eq("id", a.id);
  await supabase.from("survey_fields").update({ position: a.position }).eq("id", b.id);

  revalidateSurvey(surveyId);
  return { ok: true };
}
