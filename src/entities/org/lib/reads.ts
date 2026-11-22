// The chapter app's slice of edge8-web's entities/org/lib/reads.ts (EO-owned): the
// reads the chapter strategy and goals screens make of org's tables. Each
// helper names the table and returns the PostgREST builder, so the caller keeps
// its own columns, filters and error handling.
import { companyOs } from "@/kernel/data/supabase";

// PostgREST infers a row shape from a *literal* column list. These helpers take
// a plain `string` so the caller keeps its own columns, which erases that
// inference; naming the result as an open record keeps every caller's existing
// `as SomeRow[]` cast working.
type Row = Record<string, unknown>;
type Options = { head?: boolean; count?: "exact" | "planned" | "estimated" };

export const selectKeyResults = (columns: string, options?: Options) =>
  companyOs.from("key_results").select<string, Row>(columns, options);
// A key result's check-in trail (K.78): whether a chapter number has ever been
// measured before it is printed.
export const selectKrLogs = (columns: string, options?: Options) =>
  companyOs.from("kr_logs").select<string, Row>(columns, options);
export const selectObjectives = (columns: string, options?: Options) =>
  companyOs.from("objectives").select<string, Row>(columns, options);
export const selectStrategies = (columns: string, options?: Options) =>
  companyOs.from("strategies").select<string, Row>(columns, options);
