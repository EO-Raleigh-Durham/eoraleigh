import { supabase } from "./supabase";

// Server-only data layer for the survey builder (surveys / survey_fields /
// survey_responses / survey_answers). Reads fail soft so pages still render an
// empty state when env vars are missing in dev. NEVER import from a client
// component (pulls in the secret-key client).

// ============================================================
// Types
// ============================================================

export type SurveyStatus = "draft" | "published" | "closed";

export type SurveyFieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "number"
  | "single_choice"
  | "multi_choice"
  | "dropdown"
  | "rating"
  | "yes_no"
  | "date";

// type-specific settings stored in survey_fields.config (jsonb)
export type SurveyFieldConfig = {
  options?: string[];
  min?: number;
  max?: number;
  min_label?: string;
  max_label?: string;
};

export type SurveyField = {
  id: string;
  survey_id: string;
  position: number;
  type: SurveyFieldType;
  label: string;
  help_text: string | null;
  required: boolean;
  config: SurveyFieldConfig;
  legacy_map: "rating" | "comment" | "topic" | null;
  created_at: string;
  updated_at: string;
};

export type SurveyRow = {
  id: string;
  kind: string;
  slug: string;
  name: string;
  description: string | null;
  status: SurveyStatus;
  intro_text: string | null;
  thank_you_text: string | null;
  created_at: string;
  updated_at: string;
};

export type SurveyWithFields = SurveyRow & { fields: SurveyField[] };

export type SurveyListItem = SurveyRow & {
  fieldCount: number;
  responseCount: number;
};

export type SurveyAnswer = {
  field_id: string;
  value: string | null;
  value_json: unknown;
};

export type SurveyResponseWithAnswers = {
  id: string;
  respondent_name: string | null;
  respondent_email: string | null;
  submitted_at: string;
  answers: SurveyAnswer[];
};

// ============================================================
// Field-type metadata (drives the builder's type picker + editors)
// ============================================================

export const FIELD_TYPE_META: Record<
  SurveyFieldType,
  { label: string; hasOptions: boolean; isRating: boolean; isNumber: boolean }
> = {
  short_text: { label: "Short text", hasOptions: false, isRating: false, isNumber: false },
  long_text: { label: "Long text", hasOptions: false, isRating: false, isNumber: false },
  email: { label: "Email", hasOptions: false, isRating: false, isNumber: false },
  number: { label: "Number", hasOptions: false, isRating: false, isNumber: true },
  single_choice: { label: "Single choice", hasOptions: true, isRating: false, isNumber: false },
  multi_choice: { label: "Multiple choice", hasOptions: true, isRating: false, isNumber: false },
  dropdown: { label: "Dropdown", hasOptions: true, isRating: false, isNumber: false },
  rating: { label: "Rating scale", hasOptions: false, isRating: true, isNumber: false },
  yes_no: { label: "Yes / No", hasOptions: false, isRating: false, isNumber: false },
  date: { label: "Date", hasOptions: false, isRating: false, isNumber: false },
};

export const SURVEY_FIELD_TYPES = Object.keys(FIELD_TYPE_META) as SurveyFieldType[];

export function isChoiceType(t: SurveyFieldType): boolean {
  return t === "single_choice" || t === "multi_choice" || t === "dropdown";
}

const STATUS_LABEL: Record<SurveyStatus, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
};

export function statusLabel(s: SurveyStatus): string {
  return STATUS_LABEL[s];
}

// ============================================================
// Loaders
// ============================================================

export async function getSurveys(): Promise<SurveyListItem[]> {
  const { data: surveys, error } = await supabase
    .from("surveys")
    .select(
      "id, kind, slug, name, description, status, intro_text, thank_you_text, created_at, updated_at",
    )
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("getSurveys:", error.message);
    return [];
  }

  const [fieldRows, responseRows] = await Promise.all([
    supabase.from("survey_fields").select("survey_id"),
    supabase.from("survey_responses").select("survey_id"),
  ]);

  const fieldCounts = tally((fieldRows.data ?? []) as Array<{ survey_id: string }>);
  const responseCounts = tally(
    (responseRows.data ?? []) as Array<{ survey_id: string }>,
  );

  return (surveys ?? []).map((s) => ({
    ...(s as SurveyRow),
    fieldCount: fieldCounts[s.id] ?? 0,
    responseCount: responseCounts[s.id] ?? 0,
  }));
}

function tally(rows: Array<{ survey_id: string }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.survey_id] = (out[r.survey_id] ?? 0) + 1;
  return out;
}

export async function getSurveyById(id: string): Promise<SurveyWithFields | null> {
  const { data: survey, error } = await supabase
    .from("surveys")
    .select(
      "id, kind, slug, name, description, status, intro_text, thank_you_text, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !survey) {
    if (error) console.warn("getSurveyById:", error.message);
    return null;
  }
  const fields = await getFieldsForSurvey(id);
  return { ...(survey as SurveyRow), fields };
}

export async function getPublishedSurveyBySlug(
  slug: string,
): Promise<SurveyWithFields | null> {
  const { data: survey, error } = await supabase
    .from("surveys")
    .select(
      "id, kind, slug, name, description, status, intro_text, thank_you_text, created_at, updated_at",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !survey) {
    if (error) console.warn("getPublishedSurveyBySlug:", error.message);
    return null;
  }
  const fields = await getFieldsForSurvey((survey as SurveyRow).id);
  return { ...(survey as SurveyRow), fields };
}

async function getFieldsForSurvey(surveyId: string): Promise<SurveyField[]> {
  const { data, error } = await supabase
    .from("survey_fields")
    .select(
      "id, survey_id, position, type, label, help_text, required, config, legacy_map, created_at, updated_at",
    )
    .eq("survey_id", surveyId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("getFieldsForSurvey:", error.message);
    return [];
  }
  return (data ?? []) as SurveyField[];
}

export async function getSurveyResponses(
  surveyId: string,
): Promise<SurveyResponseWithAnswers[]> {
  const { data, error } = await supabase
    .from("survey_responses")
    .select(
      "id, respondent_name, respondent_email, submitted_at, survey_answers(field_id, value, value_json)",
    )
    .eq("survey_id", surveyId)
    .order("submitted_at", { ascending: false });
  if (error) {
    console.warn("getSurveyResponses:", error.message);
    return [];
  }
  type Raw = {
    id: string;
    respondent_name: string | null;
    respondent_email: string | null;
    submitted_at: string;
    survey_answers: SurveyAnswer[] | null;
  };
  return ((data ?? []) as unknown as Raw[]).map((r) => ({
    id: r.id,
    respondent_name: r.respondent_name,
    respondent_email: r.respondent_email,
    submitted_at: r.submitted_at,
    answers: r.survey_answers ?? [],
  }));
}

// ============================================================
// Results aggregation
// ============================================================

export type FieldSummary = {
  field: SurveyField;
  answered: number;
} & (
  | { kind: "choice"; options: Array<{ option: string; count: number; pct: number }> }
  | { kind: "rating"; average: number; distribution: Array<{ value: number; count: number }> }
  | { kind: "number"; average: number; min: number; max: number }
  | { kind: "text"; values: Array<{ value: string; name: string | null }> }
);

// Build a per-field summary from the flat answer rows. Multi-select stores one
// answer row per option, so option counts come straight from a tally.
export function summarizeField(
  field: SurveyField,
  responses: SurveyResponseWithAnswers[],
): FieldSummary {
  const nameByResponse = new Map<string, string | null>();
  for (const r of responses) nameByResponse.set(r.id, r.respondent_name);

  const entries: Array<{ value: string; responseName: string | null }> = [];
  const respondersWithAny = new Set<string>();
  for (const r of responses) {
    for (const a of r.answers) {
      if (a.field_id !== field.id) continue;
      const v = (a.value ?? "").trim();
      if (v === "") continue;
      entries.push({ value: v, responseName: r.respondent_name });
      respondersWithAny.add(r.id);
    }
  }
  const answered = respondersWithAny.size;

  if (isChoiceType(field.type) || field.type === "yes_no") {
    const counts = new Map<string, number>();
    // seed declared options so zero-count choices still show
    for (const opt of field.config.options ?? []) counts.set(opt, 0);
    if (field.type === "yes_no") {
      counts.set("Yes", counts.get("Yes") ?? 0);
      counts.set("No", counts.get("No") ?? 0);
    }
    for (const e of entries) counts.set(e.value, (counts.get(e.value) ?? 0) + 1);
    const total = entries.length || 1;
    const options = Array.from(counts.entries())
      .map(([option, count]) => ({
        option,
        count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
    return { field, answered, kind: "choice", options };
  }

  if (field.type === "rating" || field.type === "number") {
    const nums = entries
      .map((e) => Number(e.value))
      .filter((n) => Number.isFinite(n));
    const sum = nums.reduce((a, b) => a + b, 0);
    const average = nums.length ? Math.round((sum / nums.length) * 100) / 100 : 0;
    if (field.type === "rating") {
      const distMap = new Map<number, number>();
      const min = field.config.min ?? 1;
      const max = field.config.max ?? 5;
      for (let v = min; v <= max; v++) distMap.set(v, 0);
      for (const n of nums) distMap.set(n, (distMap.get(n) ?? 0) + 1);
      const distribution = Array.from(distMap.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value - b.value);
      return { field, answered, kind: "rating", average, distribution };
    }
    return {
      field,
      answered,
      kind: "number",
      average,
      min: nums.length ? Math.min(...nums) : 0,
      max: nums.length ? Math.max(...nums) : 0,
    };
  }

  // text, long_text, email, date
  return {
    field,
    answered,
    kind: "text",
    values: entries.map((e) => ({ value: e.value, name: e.responseName })),
  };
}
