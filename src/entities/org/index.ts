// The chapter app's stand-in for edge8-web's org entity door (EO-owned): the slice
// the chapter strategy and goals screens use. Edge8's org is the whole company
// (directory, org chart, equipment, surveys); the chapter app takes its strategy
// page and its objectives and key results, and ladders the chairs' goals to
// them instead of edge8's personal coaching goals.
//
// Server-only barrel: the modules below build the service-role Supabase client
// at load, so a "use client" file takes what it needs from ./client.ts.
export { CompanyGoalsObjectives } from "./ui/company/CompanyGoalsObjectives";
export { StrategyView } from "./ui/company/StrategyView";
export { parseStrategy } from "./lib/company/strategy";
export type { ObjectiveWithKrs, LadderedPerson } from "./lib/company/goal-shapes";
export type { ObjectiveGroup, PersonGroup } from "./ui/company/TeamGoalsPanel";
export * from "./lib/company/edges-shared";
export * from "./lib/company/kr-progress";
export { KEY_RESULT_AUDIT_TABLE, NOT_MEASURED_YET, getNeverMeasuredKeyResults } from "./lib/company/key-result-measured";
export { selectKeyResults, selectKrLogs, selectObjectives, selectStrategies } from "./lib/reads";
