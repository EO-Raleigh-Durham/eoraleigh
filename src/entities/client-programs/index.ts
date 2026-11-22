// The chapter app's stand-in for edge8-web's client-programs entity (EO-owned).
// Edge8's Workboards read client AI programs, backlogs and roadmaps; the chapter app
// has no clients, so these answer no rows and the client features stay empty.
import { emptySelect } from "@/kernel/data/empty-query";

type SelectOptions = { head?: boolean; count?: "exact" | "planned" | "estimated" };

export const selectAiPrograms = (_columns: string, _options?: SelectOptions) => emptySelect();
export const selectClientBacklogItems = (_columns: string, _options?: SelectOptions) => emptySelect();
export const selectClientRoadmapGroups = (_columns: string, _options?: SelectOptions) => emptySelect();

export type ProgramListAnswer =
  | { ok: true; programs: { id: string; companyId: string; name: string }[] }
  | { ok: false; error: string };

export async function liveProgramsForCompany(_companyId: string): Promise<ProgramListAnswer> {
  return { ok: true, programs: [] };
}
