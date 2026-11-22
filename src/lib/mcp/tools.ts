// Server-only. The chapter connector's tools and which of them one caller
// is handed (MCP.0; ./protocol.ts serves them). Plan: docs/plans/13-board-mcp.html.
//
// Every tool belongs to an area (./access.ts). A read tool is handed to anyone
// who may read its area; a write tool only to someone who may write it, so a
// board member outside a portfolio never even sees its write tools. Every
// tool reads the caller from the route (the bearer token), never from tool
// input: no tool takes a person, so nobody can act as someone else.
//
// Every write tool is built with writeTool(): it previews first, leading with
// plain-language warnings when the change is risky, and runs only with its
// preview's receipt (./receipt.ts). Writes call the same function the page
// calls, so the connector can never do more than the page.
import { CHAPTER_NAME } from "../../kernel/config/chapter.ts";
import { handed, type PortfolioFilter } from "./access.ts";
import type { McpCaller } from "./caller";
import { NO_INPUT, type Tool } from "./tools-core.ts";
import { sapTools } from "./sap-tools.ts";
import { membershipTools } from "./membership-tools.ts";
import { ownTools } from "./own-tools.ts";
import { dataTools } from "./data-tools.ts";

export { NO_INPUT, untrusted, writeTool, type Preview, type Refusal, type Tool } from "./tools-core.ts";

// ---- Who am I ----------------------------------------------------------------

const LEVEL_LABEL = { super_admin: "Super admin", board: "Board", contractor: "Contractor" } as const;

export function whoami(caller: McpCaller, origin: string) {
  const { user, reach, portfolio } = caller;
  return {
    name: user.fullName,
    email: user.email,
    level: LEVEL_LABEL[reach.level],
    portfolio,
    canRead: [...reach.read].filter((a) => a !== "me"),
    canChange: [...reach.write].filter((a) => a !== "me"),
    site: origin,
  };
}

// ---- The registry ------------------------------------------------------------

/** Every tool the connector serves, held or not. Areas' tools join here as they ship. */
function allTools(caller: McpCaller, origin: string): Tool[] {
  return [
    {
      name: "whoami",
      area: "me",
      title: "Who am I",
      description:
        `The signed-in ${CHAPTER_NAME} person: name, email, level (Super admin, Board or Contractor), their board portfolio, ` +
        "and the areas they can read and change through this connector. Call it first.",
      readOnly: true,
      ...NO_INPUT,
      run: async () => whoami(caller, origin),
    },
    ...ownTools(caller),
    ...sapTools(caller, origin),
    ...membershipTools(caller, origin),
    ...dataTools(),
  ];
}

/** The name of every tool the connector serves: the call log keeps only these. */
export function toolNames(caller: McpCaller, origin: string): string[] {
  return allTools(caller, origin).map((t) => t.name);
}

/**
 * The tools this caller may use, and only those: a read tool needs its area's
 * read, a write tool its area's write. With a portfolio filter, only that
 * group among them; a value that names no group hands nothing.
 */
export function toolsFor(caller: McpCaller, origin: string, filter: PortfolioFilter | null | "none" = null): Tool[] {
  return allTools(caller, origin).filter((t) => handed(caller.reach, t, filter));
}
