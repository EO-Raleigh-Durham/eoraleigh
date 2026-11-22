"use server";

// Confirm / cancel chatbot write proposals. Runs as a server action (not in
// the chat API route) so revalidatePath refreshes the page the user is on.
// Full auth re-check happens here, independent of the chat request that
// created the proposal.

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { roleAtLeast } from "@/lib/access";
import { claimProposal, getProposal, isExpired, markProposal } from "@/lib/chatbot/audit";
import { executeAction } from "@/lib/chatbot/writes";

export async function confirmProposal(
  proposalId: string,
): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const user = await getSessionUser();
  if (!user || !roleAtLeast(user.role, "board")) {
    return { ok: false, error: "Not authorized" };
  }

  const proposal = await getProposal(proposalId);
  if (!proposal) return { ok: false, error: "Proposal not found" };
  if (proposal.proposed_by !== user.id) {
    return { ok: false, error: "Only the person who proposed this change can confirm it" };
  }
  if (proposal.status !== "proposed") {
    return { ok: false, error: `Proposal is already ${proposal.status}` };
  }
  if (isExpired(proposal)) {
    await markProposal(proposalId, { status: "expired", decided_at: new Date().toISOString() });
    return { ok: false, error: "Proposal expired. Ask the assistant to propose it again" };
  }

  // The checks above give a clear message; this claim is what makes the
  // confirm safe. Two tabs (or a double click) both pass the checks, but only
  // one conditional UPDATE can move the row out of 'proposed'.
  const claimed = await claimProposal(proposalId, user.id, "confirmed");
  if (!claimed) return { ok: false, error: "Proposal was already confirmed or cancelled" };

  const result = await executeAction(claimed, user);
  if (!result.ok) {
    await markProposal(proposalId, { status: "failed", error: result.error });
    return { ok: false, error: result.error };
  }

  await markProposal(proposalId, {
    status: "executed",
    before_state: result.before,
    result: result.result,
    executed_at: new Date().toISOString(),
  });
  for (const path of result.revalidate) revalidatePath(path);
  return { ok: true, summary: claimed.summary };
}

export async function cancelProposal(
  proposalId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSessionUser();
  if (!user || !roleAtLeast(user.role, "board")) {
    return { ok: false, error: "Not authorized" };
  }
  const proposal = await getProposal(proposalId);
  if (!proposal) return { ok: false, error: "Proposal not found" };
  if (proposal.proposed_by !== user.id) {
    return { ok: false, error: "Only the person who proposed this change can cancel it" };
  }
  if (proposal.status !== "proposed") {
    return { ok: false, error: `Proposal is already ${proposal.status}` };
  }
  if (!(await claimProposal(proposalId, user.id, "cancelled")) && !isExpired(proposal)) {
    return { ok: false, error: "Proposal was already confirmed or cancelled" };
  }
  return { ok: true };
}
