import { supabase } from "@/lib/supabase";

export type ChapterMetric = {
  id: string;
  fiscal_year: string;
  fiscal_year_start: number;
  president: string | null;
  members: number | null;
  retention_pct: number | null;
  revenue_usd: number | null;
  revenue_per_member_usd: number | null;
  forum_count: number | null;
  forum_health: string | null;
  chapter_events: number | null;
  average_event_score: number | null;
  end_of_year_reserves_usd: number | null;
  eo_grants_usd: number | null;
  sap_usd: number | null;
  dues_per_member_usd: number | null; // board-set local dues rate (migration 114)
  initiation_fee_usd: number | null; // board-set one-time fee per new member (migration 115)
  secondary_dues_usd: number | null; // board-set secondary-chapter dues (migration 132)
  dues_open: boolean; // members pay dues for this year now (migration 132)
};

export const CHAPTER_METRIC_FIELDS = [
  "president",
  "members",
  "retention_pct",
  "revenue_usd",
  "revenue_per_member_usd",
  "forum_count",
  "forum_health",
  "chapter_events",
  "average_event_score",
  "end_of_year_reserves_usd",
  "eo_grants_usd",
  "sap_usd",
  "dues_per_member_usd",
  "initiation_fee_usd",
  "secondary_dues_usd",
] as const;

export type ChapterMetricField = (typeof CHAPTER_METRIC_FIELDS)[number];

// Postgres numeric columns come back as strings to preserve precision.
// The chapter metrics table only has small values, so cast to number for the UI.
function normaliseNumeric(row: Record<string, unknown>): ChapterMetric {
  const num = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };
  return {
    id: row.id as string,
    fiscal_year: row.fiscal_year as string,
    fiscal_year_start: row.fiscal_year_start as number,
    president: (row.president as string | null) ?? null,
    members: num(row.members),
    retention_pct: num(row.retention_pct),
    revenue_usd: num(row.revenue_usd),
    revenue_per_member_usd: num(row.revenue_per_member_usd),
    forum_count: num(row.forum_count),
    forum_health: (row.forum_health as string | null) ?? null,
    chapter_events: num(row.chapter_events),
    average_event_score: num(row.average_event_score),
    end_of_year_reserves_usd: num(row.end_of_year_reserves_usd),
    eo_grants_usd: num(row.eo_grants_usd),
    sap_usd: num(row.sap_usd),
    dues_per_member_usd: num(row.dues_per_member_usd),
    initiation_fee_usd: num(row.initiation_fee_usd),
    secondary_dues_usd: num(row.secondary_dues_usd),
    dues_open: row.dues_open === true,
  };
}

export async function getAllChapterMetrics(): Promise<ChapterMetric[]> {
  const { data, error } = await supabase
    .from("chapter_metrics")
    .select("*")
    .order("fiscal_year_start", { ascending: false });
  if (error) {
    console.error("getAllChapterMetrics failed", error);
    return [];
  }
  return (data ?? []).map((row) => normaliseNumeric(row as Record<string, unknown>));
}
