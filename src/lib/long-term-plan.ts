import { supabase } from "@/lib/supabase";

// The chapter's Long-Term Plan (migration 123): vision statements, success
// statements by pillar, and the key metrics by fiscal year. Server only; the
// tables have RLS on and no client policies.

export type PlanPillar = "leadership" | "operational_excellence" | "member_value" | "growth";

export const PILLAR_LABEL: Record<PlanPillar, string> = {
  leadership: "Leadership",
  operational_excellence: "Operational Excellence",
  member_value: "Member Value",
  growth: "Growth",
};

const PILLAR_ORDER: PlanPillar[] = ["leadership", "operational_excellence", "member_value", "growth"];

export type PlanStatement = {
  key: string;
  section: "vision" | "pillar" | "resource";
  pillar: PlanPillar | null;
  item_no: number;
  part_no: number;
  title: string | null;
  body: string;
  year_accomplished: string | null;
  sort_order: number;
};

export type PlanMetricValue = {
  metric_key: string;
  label: string;
  unit: "count" | "percent" | "usd" | "text";
  fiscal_year_start: number;
  period_label: string;
  value_numeric: number | null;
  value_text: string | null;
  entry: "calculated" | "input" | "staff";
  note: string | null;
  sort_order: number;
};

export type PlanPeriod = { fiscalYearStart: number; label: string };
export type PlanMetricRow = { key: string; label: string; unit: PlanMetricValue["unit"]; byYear: Map<number, PlanMetricValue> };
export type PlanItem = { itemNo: number; parts: PlanStatement[] };
export type PlanPillarGroup = { pillar: PlanPillar; label: string; items: PlanItem[] };

export type LongTermPlan = {
  vision: PlanStatement[];
  resources: PlanStatement[];
  periods: PlanPeriod[];
  metrics: PlanMetricRow[];
  pillars: PlanPillarGroup[];
};

export async function loadLongTermPlan(): Promise<LongTermPlan | null> {
  const [s, m] = await Promise.all([
    supabase
      .from("long_term_plan_statements")
      .select("key, section, pillar, item_no, part_no, title, body, year_accomplished, sort_order")
      .order("sort_order"),
    supabase
      .from("long_term_plan_metrics")
      .select("metric_key, label, unit, fiscal_year_start, period_label, value_numeric, value_text, entry, note, sort_order")
      .order("sort_order")
      .order("fiscal_year_start"),
  ]);
  if (s.error || m.error) {
    console.error("loadLongTermPlan", s.error ?? m.error);
    return null;
  }
  const statements = (s.data ?? []) as PlanStatement[];
  const values = (m.data ?? []) as PlanMetricValue[];
  if (statements.length === 0 && values.length === 0) return null;

  const periods = new Map<number, string>();
  const metrics = new Map<string, PlanMetricRow>();
  for (const v of values) {
    if (!periods.has(v.fiscal_year_start)) periods.set(v.fiscal_year_start, v.period_label);
    let row = metrics.get(v.metric_key);
    if (!row) {
      row = { key: v.metric_key, label: v.label, unit: v.unit, byYear: new Map() };
      metrics.set(v.metric_key, row);
    }
    row.byYear.set(v.fiscal_year_start, v);
  }

  const pillars: PlanPillarGroup[] = PILLAR_ORDER.map((pillar) => {
    const items = new Map<number, PlanItem>();
    for (const st of statements) {
      if (st.section !== "pillar" || st.pillar !== pillar) continue;
      const item = items.get(st.item_no) ?? { itemNo: st.item_no, parts: [] };
      item.parts.push(st);
      items.set(st.item_no, item);
    }
    for (const item of items.values()) item.parts.sort((a, b) => a.part_no - b.part_no);
    return { pillar, label: PILLAR_LABEL[pillar], items: [...items.values()].sort((a, b) => a.itemNo - b.itemNo) };
  }).filter((g) => g.items.length > 0);

  return {
    vision: statements.filter((st) => st.section === "vision"),
    resources: statements.filter((st) => st.section === "resource"),
    periods: [...periods.entries()].sort((a, b) => a[0] - b[0]).map(([fiscalYearStart, label]) => ({ fiscalYearStart, label })),
    metrics: [...metrics.values()],
    pillars,
  };
}

export function formatPlanValue(v: PlanMetricValue): string {
  if (v.value_numeric == null) return v.value_text ?? "";
  const n = Number(v.value_numeric);
  if (v.unit === "percent") return `${Math.round(n * 100)}%`;
  if (v.unit === "usd") return `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return n.toLocaleString("en-US");
}
