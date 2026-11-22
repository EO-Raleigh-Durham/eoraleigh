// Server-only. Who an MCP client is acting for (MCP.0, following Edge8's
// kernel/identity/bearer.ts).
//
// An MCP client (Claude, ChatGPT, Grok) signs a person in through Supabase
// Auth's OAuth 2.1 server, then calls /api/mcp with the access token in an
// Authorization header; it carries no cookie. This resolves that token to the
// same profile and role a sign-in of theirs builds (sessionUserForAuthUser),
// then to their connector reach: level, portfolio and contractor grants. GoTrue
// verifies the token on every call, so a signed-out user, a role change or an
// ended grant takes effect on the next request.
//
// Only a token issued to an OAuth client (one carrying client_id) is accepted:
// the website's own sign-in is refused here, as a client's token is refused by
// the cookie readers (src/lib/oauth-client-token.ts).
import { supabase } from "../supabase";
import { currentBoardTerm, type BoardAccessClient } from "../board-access";
import { sessionUserForAuthUser, type SessionUser } from "../auth";
import { oauthClientOf } from "../oauth-client-token";
import { getLiveGrant } from "../access-grants-server";
import { grantState } from "../access-grants";
import { reachOf, type ContractorGrant, type Reach } from "./access";

export type McpCaller = {
  user: SessionUser;
  reach: Reach;
  /** Names of this term's board roles the person chairs or co-chairs. */
  portfolio: string[];
  clientId: string;
};

const BEARER = /^Bearer\s+(\S+)$/i;
const BOARD_POSITIONS = ["Chair", "Co-Chair"];

/** The board roles a person chairs or co-chairs in the board term in force today. */
export async function currentPortfolio(personId: string | null): Promise<string[]> {
  if (!personId) return [];
  const fy = await currentBoardTerm(supabase as unknown as BoardAccessClient);
  if (fy == null) return [];
  const { data, error } = await supabase
    .from("board_appointments")
    .select("position, role:board_roles(name)")
    .eq("person_id", personId)
    .eq("fiscal_year_start", fy)
    .in("position", BOARD_POSITIONS);
  if (error) throw new Error(`portfolio lookup failed: ${error.message}`);
  const rows = (data ?? []) as unknown as { role: { name: string } | null }[];
  return [...new Set(rows.map((r) => r.role?.name).filter((n): n is string => Boolean(n)))];
}

/** A contractor's grants, each with whether it is active right now. */
async function contractorGrants(profileId: string): Promise<ContractorGrant[]> {
  const grant = await getLiveGrant(profileId, "sap_pipeline");
  if (!grant) return [];
  return [{ area: grant.area, canEdit: grant.can_edit, active: grantState(grant) === "active" }];
}

/** The reach of a signed-in person, as the connector and its consent page judge it. */
export async function reachForUser(user: SessionUser): Promise<{ reach: Reach; portfolio: string[] } | null> {
  const portfolio = user.role === "board" ? await currentPortfolio(user.personId) : [];
  const grants = user.role === "contractor" ? await contractorGrants(user.id) : [];
  const reach = reachOf(user.role, portfolio, grants);
  return reach ? { reach, portfolio } : null;
}

/**
 * The person an `Authorization: Bearer` header names, with their reach and
 * the OAuth client acting for them; null when there is no token, GoTrue
 * rejects it, it was not issued to an OAuth client, or the person has no
 * active profile. A failure on GoTrue's side (5xx, the network) is thrown, so
 * the app is not sent back through sign-in for an outage.
 */
export async function callerFromBearer(header: string | null): Promise<{ user: SessionUser; clientId: string } | null> {
  const token = BEARER.exec(header ?? "")?.[1];
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    if (typeof error.status === "number" && error.status < 500) return null;
    throw error;
  }
  if (!data.user) return null;
  const clientId = oauthClientOf(token);
  if (!clientId) return null;
  const user = await sessionUserForAuthUser(data.user.id);
  if (!user || !user.active) return null;
  return { user, clientId };
}
