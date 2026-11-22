// Server-only. Proposal + audit rows for chatbot writes (chatbot_actions,
// supabase/071_chatbot.sql). Every write the model proposes becomes a row
// here with status 'proposed'; confirmProposal (src/app/board/chat/actions.ts)
// executes it and stamps the outcome, so the table doubles as the audit log.

import { supabase } from "@/lib/supabase";
import type { SessionUser } from "@/lib/auth";
import type { WriteToolName } from "./tools";

export const PROPOSAL_TTL_MS = 15 * 60 * 1000;

export type ProposalStatus =
  | "proposed"
  | "confirmed"
  | "executed"
  | "failed"
  | "cancelled"
  | "expired";

export type ChatbotActionRow = {
  id: string;
  proposed_by: string;
  proposed_email: string;
  tool: WriteToolName;
  input: Record<string, unknown>;
  summary: string;
  status: ProposalStatus;
  before_state: unknown;
  result: unknown;
  error: string | null;
  created_at: string;
  decided_at: string | null;
  executed_at: string | null;
};

export async function createProposal(
  user: SessionUser,
  tool: WriteToolName,
  input: Record<string, unknown>,
  summary: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("chatbot_actions")
    .insert({
      proposed_by: user.id,
      proposed_email: user.email,
      tool,
      input,
      summary,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: (data as { id: string }).id };
}

export async function getProposal(id: string): Promise<ChatbotActionRow | null> {
  const { data, error } = await supabase
    .from("chatbot_actions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.warn("chatbot getProposal:", error.message);
    return null;
  }
  return (data as ChatbotActionRow | null) ?? null;
}

export async function markProposal(
  id: string,
  patch: Partial<
    Pick<
      ChatbotActionRow,
      "status" | "before_state" | "result" | "error" | "decided_at" | "executed_at"
    >
  >,
): Promise<void> {
  const { error } = await supabase.from("chatbot_actions").update(patch).eq("id", id);
  if (error) console.warn("chatbot markProposal:", error.message);
}

/**
 * Atomically takes a proposal out of 'proposed': one conditional UPDATE that
 * only matches while the row is still proposed, owned by this user and not
 * expired. Returns the row if this call won, null if anything else (another
 * tab, a cancel, expiry) got there first. Only the winner may execute.
 */
export async function claimProposal(
  id: string,
  userId: string,
  status: "confirmed" | "cancelled",
): Promise<ChatbotActionRow | null> {
  const { data, error } = await supabase
    .from("chatbot_actions")
    .update({ status, decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("proposed_by", userId)
    .eq("status", "proposed")
    .gt("created_at", new Date(Date.now() - PROPOSAL_TTL_MS).toISOString())
    .select("*")
    .maybeSingle();
  if (error) {
    console.warn("chatbot claimProposal:", error.message);
    return null;
  }
  return (data as ChatbotActionRow | null) ?? null;
}

export function isExpired(proposal: ChatbotActionRow): boolean {
  return Date.now() - new Date(proposal.created_at).getTime() > PROPOSAL_TTL_MS;
}
