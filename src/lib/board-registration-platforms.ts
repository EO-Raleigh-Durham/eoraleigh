import "server-only";

import type { PlatformRow } from "./registration-platforms";
import { supabase } from "./supabase";
import { fetchAllRows } from "./supabase-page";

export type PlatformRange = "7d" | "30d" | "90d" | "all";

const RANGE_DAYS: Record<Exclude<PlatformRange, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function parsePlatformRange(value: string | undefined): PlatformRange {
  return value === "7d" || value === "90d" || value === "all" ? value : "30d";
}

export function platformRangeSince(range: PlatformRange, now = new Date()): string | null {
  if (range === "all") return null;
  return new Date(now.getTime() - RANGE_DAYS[range] * 86_400_000).toISOString();
}

export type PlatformLoad =
  | { available: true; rows: PlatformRow[] }
  // Migration 109 has not been applied to this database yet.
  | { available: false; rows: [] };

const COLUMNS =
  "status, channel_source, utm_source, utm_campaign, utm_content, referrer";

// Reads only the attribution columns, never names or emails. The caller must
// already have passed requireBoardOrAbove(): this client bypasses RLS.
export async function loadRegistrationPlatforms(
  sinceIso: string | null,
): Promise<PlatformLoad> {
  try {
    const rows = await fetchAllRows<PlatformRow>((from, to) => {
      let query = supabase
        .from("event_registrations")
        .select(COLUMNS)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (sinceIso) query = query.gte("created_at", sinceIso);
      return query;
    });
    return { available: true, rows };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Postgres 42703 (column missing) or PostgREST's schema-cache message.
    if (/does not exist|schema cache|could not find/i.test(message)) {
      return { available: false, rows: [] };
    }
    throw err;
  }
}
