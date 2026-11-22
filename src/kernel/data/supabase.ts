// The chapter app's version of edge8-web's kernel/data/supabase.ts (EO-owned; see
// scripts/edge8-sync/eo-owned.json). Edge8 keeps its tables in a `company_os`
// schema and its code queries through `companyOs`. The chapter app keeps the same
// tables in `public`, so `companyOs` here is a public-schema client typed as
// the company_os schema (database.types.ts aliases one to the other), and the
// ported code runs unchanged.
//
// Server-only: the secret key bypasses RLS. NEVER import from a client component.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "./supabase/database.types";

export type { Json };

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  }
  console.warn("Supabase env vars not configured (SUPABASE_URL / SUPABASE_SECRET_KEY). Database features will not work.");
}

const url = supabaseUrl || "https://placeholder.supabase.co";
const key = supabaseSecretKey || "placeholder-key";

export const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });

// Typed as edge8's company_os schema, served from public. The db.schema option
// is what PostgREST is asked for; the type parameter is what the code checks.
export const companyOs = createClient<Database, "company_os">(url, key, {
  auth: { persistSession: false },
  db: { schema: "public" as "company_os" },
});

export const supabaseUntyped = supabase as unknown as SupabaseClient;
export const companyOsUntyped = supabaseUntyped;

// See edge8: restores the nullability the type generator drops from DEFAULT NULL arguments.
export function rpcArgs<T extends Record<string, unknown>>(args: T): { [K in keyof T]: Exclude<T[K], null> } {
  return args as { [K in keyof T]: Exclude<T[K], null> };
}

export type CompanyOsUpdate<T extends keyof Database["company_os"]["Tables"]> =
  Database["company_os"]["Tables"][T]["Update"];
export type CompanyOsInsert<T extends keyof Database["company_os"]["Tables"]> =
  Database["company_os"]["Tables"][T]["Insert"];
