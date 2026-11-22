// The chapter app's stand-in for edge8-web's contacts entity (EO-owned).
// The reads the ported Workboards and Marketing System make of edge8's contact
// tables. Brands, brand profiles, brand contacts and tags are real tables here
// (migration 103); person_companies is a view over EO's member_companies.
// Edge8's staff assignments (staff to client) do not exist in the chapter app.
import { companyOs } from "@/kernel/data/supabase";
import type { TablesInsert } from "@/kernel/data/supabase/database.types";
import { emptySelect } from "@/kernel/data/empty-query";

type Row = Record<string, unknown>;
type SelectOptions = { head?: boolean; count?: "exact" | "planned" | "estimated" };

export const selectBrands = (columns: string, options?: SelectOptions) =>
  companyOs.from("brands").select<string, Row>(columns, options);

export const selectBrandContacts = (columns: string, options?: SelectOptions) =>
  companyOs.from("brand_contacts").select<string, Row>(columns, options);

export const upsertBrandProfiles = (
  row: TablesInsert<{ schema: "company_os" }, "brand_profiles"> | TablesInsert<{ schema: "company_os" }, "brand_profiles">[],
  options?: { onConflict?: string; ignoreDuplicates?: boolean },
) => companyOs.from("brand_profiles").upsert(row, options);

export const selectPersonCompanies = (columns: string, options?: SelectOptions) =>
  companyOs.from("person_companies").select<string, Row>(columns, options);

export const selectTags = (columns: string, options?: SelectOptions) =>
  companyOs.from("tags").select<string, Row>(columns, options);

export const selectTaggables = (columns: string, options?: SelectOptions) =>
  companyOs.from("taggables").select<string, Row>(columns, options);

export const selectStaffAssignments = (_columns: string, _options?: SelectOptions) => emptySelect();
