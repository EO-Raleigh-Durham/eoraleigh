import "server-only";

import { cache } from "react";
import { supabase } from "./supabase";
import { pickOpenDuesYear, type OpenDuesYear } from "./dues";

const COLUMNS = "fiscal_year_start, dues_open, dues_per_member_usd, secondary_dues_usd";

/** The dues year members pay for now (chapter_metrics.dues_open), or null. */
export const getOpenDuesYear = cache(async (): Promise<OpenDuesYear | null> => {
  const { data, error } = await supabase.from("chapter_metrics").select(COLUMNS).eq("dues_open", true);
  if (error) {
    console.error("getOpenDuesYear:", error.message);
    return null;
  }
  return pickOpenDuesYear(data ?? []);
});

/** The amounts recorded for one fiscal year, for invoices of past payments. */
export async function getDuesYear(fyStart: number): Promise<OpenDuesYear | null> {
  const { data } = await supabase.from("chapter_metrics").select(COLUMNS).eq("fiscal_year_start", fyStart);
  return pickOpenDuesYear((data ?? []).map((r) => ({ ...r, dues_open: true })));
}
