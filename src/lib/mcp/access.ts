// Who the chapter connector hands which tools (MCP.0). Pure: no runtime
// imports, unit tested in access.test.ts. Plan: docs/plans/13-board-mcp.html.
//
// Three levels. A super admin gets every tool. A board member reads every
// area, including "data" (read-only SQL over everything but member company
// revenue, Dave 2026-11-21), and writes only the areas of their current
// portfolio (this term's Chair or Co-Chair appointments). A contractor reads,
// and with an edit grant writes, only their granted area while the grant is
// active and the current NDA is accepted. Everyone the connector serves gets
// the "me" area: their own goal, cards, meeting updates and Radar issues.
// Members, guests and the signed-out get no tools at all.

import type { UserRole } from "../access.ts";

export type Level = "super_admin" | "board" | "contractor";

/** The areas tools belong to; each write tool names one. */
export const AREAS = [
  "me",
  "sap",
  "membership",
  "events",
  "surveys",
  "comms",
  "forum",
  "goals",
  "chapter",
  "workboards",
  "data",
] as const;
export type Area = (typeof AREAS)[number];

// The board roles (board_roles.name) and what each may write. "Everyone on the
// board" areas are added for every board member below.
const PORTFOLIO_WRITES: Record<string, Area[]> = {
  "Strategic Alliance Partner": ["sap"],
  Membership: ["membership"],
  Learning: ["events"],
  "My EO": ["events"],
  "Member Engagement": ["surveys", "events"],
  "Marketing & Communications": ["comms", "surveys"],
  Forum: ["forum"],
  President: ["sap", "membership", "events", "surveys", "comms", "forum", "goals"],
  "President-Elect": ["sap", "membership", "events", "surveys", "comms", "forum", "goals"],
};

const BOARD_WIDE_WRITES: Area[] = ["me", "workboards"];

// A contractor grant's area (access_grants.area) and the connector area it opens.
const GRANT_AREAS: Record<string, Area> = { sap_pipeline: "sap" };

export type ContractorGrant = { area: string; canEdit: boolean; active: boolean };

export type Reach = {
  level: Level;
  read: Set<Area>;
  write: Set<Area>;
};

/** The connector level for a website role, or null for anyone the connector is not for. */
export function levelOf(role: UserRole | null | undefined): Level | null {
  if (role === "super_admin") return "super_admin";
  if (role === "board") return "board";
  if (role === "contractor") return "contractor";
  return null;
}

/**
 * What a person may read and write through the connector. `portfolio` is the
 * names of their current board roles; `grants` their contractor grants with
 * whether each is active (unrevoked, unexpired, current NDA accepted).
 */
export function reachOf(
  role: UserRole | null | undefined,
  portfolio: string[],
  grants: ContractorGrant[],
): Reach | null {
  const level = levelOf(role);
  if (!level) return null;
  if (level === "super_admin") {
    return { level, read: new Set(AREAS), write: new Set(AREAS) };
  }
  if (level === "board") {
    const write = new Set<Area>(BOARD_WIDE_WRITES);
    for (const name of portfolio) for (const a of PORTFOLIO_WRITES[name] ?? []) write.add(a);
    return { level, read: new Set(AREAS), write };
  }
  const read = new Set<Area>(["me"]);
  const write = new Set<Area>(["me"]);
  for (const g of grants) {
    const area = GRANT_AREAS[g.area];
    if (!area || !g.active) continue;
    read.add(area);
    if (g.canEdit) write.add(area);
  }
  return { level, read, write };
}

/** The ?portfolio= groups a connection can ask for; each narrows, never widens. */
export const PORTFOLIO_FILTERS = ["me", "sap", "membership", "events", "surveys", "comms", "chapter"] as const;
export type PortfolioFilter = (typeof PORTFOLIO_FILTERS)[number];

/** The filter a query value names, null for none, and "none" for a value that names no group. */
export function portfolioFilterOf(value: string | null): PortfolioFilter | null | "none" {
  if (value === null || value === "") return null;
  return (PORTFOLIO_FILTERS as readonly string[]).includes(value) ? (value as PortfolioFilter) : "none";
}

// Which filter group each area falls under.
const FILTER_OF_AREA: Record<Area, PortfolioFilter> = {
  me: "me",
  sap: "sap",
  membership: "membership",
  events: "events",
  surveys: "surveys",
  comms: "comms",
  forum: "chapter",
  goals: "chapter",
  chapter: "chapter",
  workboards: "chapter",
  data: "chapter",
};

/** Whether a tool in `area` (reading or writing) is handed to this reach under this filter. */
export function handed(
  reach: Reach,
  tool: { area: Area; readOnly: boolean },
  filter: PortfolioFilter | null | "none" = null,
): boolean {
  if (filter === "none") return false;
  if (filter !== null && FILTER_OF_AREA[tool.area] !== filter && tool.area !== "me") return false;
  return tool.readOnly ? reach.read.has(tool.area) : reach.write.has(tool.area);
}
