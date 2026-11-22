// The chapter app's version of edge8-web's kernel/identity/writes.ts (EO-owned).
// The identity writes the ported code makes. The chapter app has none of edge8's
// admins, portal or access-role tables, and team_members is maintained by
// refresh_team_members() (migration 101).
//
// People: EO creates a person only through its alias-aware identity adapter
// (scripts/guardrails/person-identity.test.mjs), so there is no insert or
// upsert here, and the one update is scoped by the canonical id. The ported
// code only ever updates a person's consent (the unsubscribe link). The auth
// guard stays with the caller.
import { companyOs } from "@/kernel/data/supabase";
import type { TablesInsert, TablesUpdate } from "@/kernel/data/supabase/database.types";

export const updatePeopleById = (id: string, patch: TablesUpdate<{ schema: "company_os" }, "people">) =>
  companyOs.from("people").update(patch).eq("id", id);

export const insertCompanies = (row: TablesInsert<{ schema: "company_os" }, "companies">) => companyOs.from("companies").insert(row);
export const updateCompanies = (patch: TablesUpdate<{ schema: "company_os" }, "companies">) => companyOs.from("companies").update(patch);
