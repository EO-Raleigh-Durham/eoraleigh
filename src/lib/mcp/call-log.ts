// Server-only. The one writer of mcp_tool_calls (MCP.0, from Edge8's
// entities/mcp/lib/call-log.ts): one row per tool call the connector answers,
// reads and refusals included, so "what did this app read or do, for whom,
// and when" has an answer after the fact.
//
// What a row holds is decided here, not by the tool: who (the token's user
// profile), which app (the OAuth client), the portfolio filter, the tool's
// name, the record ids its input named, how many records came back, how it
// ended and how long it took. Never the output, and never text the person
// typed: only input values shaped like a record id are kept, and a tool name
// nobody was handed is kept as "unknown".
//
// A failed write never fails the call it describes: an insert error is logged
// as mcp-call-not-recorded (the grep handle for a gap) and swallowed.
import { supabase } from "../supabase";

export type CallOutcome = "ok" | "refused" | "invalid" | "error";

export type ToolCallRecord = {
  userProfileId: string;
  clientId: string;
  portfolio: string | null;
  /** The tool's name, or null when the app asked for one that does not exist. */
  tool: string | null;
  input: unknown;
  output: unknown;
  outcome: CallOutcome;
  latencyMs: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SUBJECTS = 50;

/** The record ids an input names, in order, deduplicated: uuid-shaped strings only. */
export function subjectIdsOf(input: unknown): string[] {
  const found: string[] = [];
  const walk = (v: unknown, depth: number) => {
    if (found.length >= MAX_SUBJECTS || depth > 3) return;
    if (typeof v === "string") {
      if (UUID.test(v) && !found.includes(v.toLowerCase())) found.push(v.toLowerCase());
    } else if (Array.isArray(v)) {
      for (const x of v) walk(x, depth + 1);
    } else if (v && typeof v === "object") {
      for (const x of Object.values(v)) walk(x, depth + 1);
    }
  };
  walk(input, 0);
  return found;
}

/**
 * How many records an answer returned: the length of an array answer, or of
 * the first array among its top-level fields. Null for an answer that holds no
 * list (a write's receipt, a single record, an error).
 */
export function resultCountOf(output: unknown): number | null {
  if (Array.isArray(output)) return output.length;
  if (!output || typeof output !== "object" || "error" in output) return null;
  for (const v of Object.values(output)) if (Array.isArray(v)) return v.length;
  return null;
}

export async function recordToolCall(call: ToolCallRecord): Promise<void> {
  if (!process.env.SUPABASE_URL) return;
  const tool = call.tool ?? "unknown";
  try {
    const { error } = await supabase.from("mcp_tool_calls").insert({
      user_profile_id: call.userProfileId,
      client_id: call.clientId,
      portfolio: call.portfolio,
      tool,
      subject_ids: subjectIdsOf(call.input),
      result_count: call.outcome === "ok" ? resultCountOf(call.output) : null,
      outcome: call.outcome,
      latency_ms: Math.max(0, Math.round(call.latencyMs)),
    });
    if (error) console.warn("[mcp] mcp-call-not-recorded", { tool, error: error.message });
  } catch (e) {
    console.warn("[mcp] mcp-call-not-recorded", { tool, error: e instanceof Error ? e.message : String(e) });
  }
}

