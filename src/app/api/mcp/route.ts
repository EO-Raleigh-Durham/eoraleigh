// The chapter connector's MCP endpoint (MCP.0): Streamable HTTP, stateless,
// one JSON answer per POST. Every request carries the person's OAuth access
// token; the caller is resolved from it before any tool exists, and the
// request is answered with only the tools that person may use.
// Plan: docs/plans/13-board-mcp.html.
import { callerFromBearer, reachForUser } from "@/lib/mcp/caller";
import { unauthorized } from "@/lib/mcp/oauth-metadata";
import { handleMcp } from "@/lib/mcp/protocol";
import { portfolioFilterOf } from "@/lib/mcp/access";
import { toolNames, toolsFor } from "@/lib/mcp/tools";
import { recordToolCall } from "@/lib/mcp/call-log";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const origin = url.origin;
  // ?portfolio=sap (and the rest) narrows the tools to one group.
  const filter = portfolioFilterOf(url.searchParams.get("portfolio"));
  let resolved;
  try {
    const signedIn = await callerFromBearer(request.headers.get("authorization"));
    resolved = signedIn ? { ...signedIn, access: await reachForUser(signedIn.user) } : null;
  } catch (err) {
    console.error("[mcp] could not check the token:", err instanceof Error ? err.message : err);
    return Response.json({ error: `${CHAPTER_NAME} could not check your sign-in. Try again in a moment.` }, { status: 503 });
  }
  if (!resolved) return unauthorized(origin);
  // Signed in, but not someone the connector is for (a member or guest).
  if (!resolved.access) {
    return Response.json(
      { error: `The ${CHAPTER_NAME} connector is for board members, super admins and approved contractors.` },
      { status: 403 },
    );
  }
  const caller = {
    user: resolved.user,
    clientId: resolved.clientId,
    reach: resolved.access.reach,
    portfolio: resolved.access.portfolio,
  };

  // Every tool call leaves a row, refusals included. A name that is no tool at
  // all is kept as "unknown", never as the text the app sent.
  const known = new Set(toolNames(caller, origin));
  return handleMcp(request, toolsFor(caller, origin, filter), (call) =>
    recordToolCall({
      userProfileId: caller.user.id,
      clientId: caller.clientId,
      portfolio: filter === "none" ? null : filter,
      tool: typeof call.name === "string" && known.has(call.name) ? call.name : null,
      input: call.input,
      output: call.output,
      outcome: call.outcome,
      latencyMs: call.latencyMs,
    }),
  );
}

// Stateless: no server-sent event stream to open and no session to end.
const notHere = () => new Response(null, { status: 405, headers: { Allow: "POST" } });
export const GET = notHere;
export const DELETE = notHere;
