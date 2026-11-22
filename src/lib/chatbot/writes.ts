// Server-only. Executes a confirmed chatbot proposal. Runs on the service
// client with the same code paths the board admin UI uses, after the confirm
// server action has re-checked auth and ownership. Re-validates every param
// here: the input jsonb came from the model, so nothing is trusted.

import {
  CHANNEL_SOURCES,
  CLOSED_LOST_DESCRIPTIONS,
  DISQUALIFICATION_REASONS,
  MEMBER_ACQUISITION_STAGES,
  MEMBERSHIP_TYPES,
  closeWonAndHandoff,
  updateDeal as updateDealRow,
  type MemberAcquisitionStage,
} from "@/lib/deals";
import { supabase } from "@/lib/supabase";
import type { SessionUser } from "@/lib/auth";
import type { ChatbotActionRow } from "./audit";
import { fieldChanges, showValue, type ProposalCard } from "./card";
import {
  FORUM_PLACEMENTS,
  INQUIRY_STATUSES,
  MEMBER_SIGNALS,
  type WriteToolName,
} from "./tools";

export type ExecuteResult =
  | { ok: true; before: unknown; result: unknown; revalidate: string[] }
  | { ok: false; error: string };

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function inEnum<T extends string>(list: readonly T[], v: unknown): T | null {
  return typeof v === "string" && (list as readonly string[]).includes(v)
    ? (v as T)
    : null;
}

async function snapshot(table: string, id: string): Promise<unknown> {
  const { data } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

// Deal stage change: mirrors changeStage in src/app/board/prospects/actions.ts.
function deriveDealStatus(stage: MemberAcquisitionStage): {
  deal_status: "open" | "closed_won" | "closed_lost";
  close_date: string | null;
} {
  if (stage === "Closed Won")
    return { deal_status: "closed_won", close_date: new Date().toISOString() };
  if (stage === "Closed Lost")
    return { deal_status: "closed_lost", close_date: new Date().toISOString() };
  return { deal_status: "open", close_date: null };
}

// The deal fields a proposal would change, validated. Shared by the confirm
// card and the write so the card shows exactly what Confirm applies.
function dealFieldsPatch(input: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (typeof input.name === "string" && input.name.trim())
    patch.name = input.name.trim();
  if (typeof input.description === "string")
    patch.description = input.description.trim() || null;
  if (input.channel_source !== undefined)
    patch.channel_source = inEnum(CHANNEL_SOURCES, input.channel_source);
  if (input.primary_interest !== undefined)
    patch.primary_interest = inEnum(MEMBERSHIP_TYPES, input.primary_interest);
  if (input.relationship_manager_id !== undefined)
    patch.relationship_manager_id = str(input.relationship_manager_id) || null;
  for (const k of [
    "ql_founder_controlling_owner",
    "ql_revenue_verified",
    "ql_financial_commitment",
    "ql_time_commitment",
  ] as const) {
    if (typeof input[k] === "boolean") patch[k] = input[k];
  }
  if (input.closed_lost_description !== undefined)
    patch.closed_lost_description = inEnum(
      CLOSED_LOST_DESCRIPTIONS,
      input.closed_lost_description,
    );
  if (typeof input.closed_lost_reason === "string")
    patch.closed_lost_reason = input.closed_lost_reason.trim() || null;
  if (typeof input.closed_won_reason === "string")
    patch.closed_won_reason = input.closed_won_reason.trim() || null;
  if (input.disqualification_reason !== undefined)
    patch.disqualification_reason = inEnum(
      DISQUALIFICATION_REASONS,
      input.disqualification_reason,
    );
  return patch;
}

// Forum placement as stored: a placed member has forum_id + 'placed'; everyone
// else has null forum_id and a status (or null for unclassified).
function forumPlacement(
  input: Record<string, unknown>,
): { forum_id: string | null; forum_status: string | null } | { error: string } {
  const placement = inEnum(FORUM_PLACEMENTS, input.placement);
  if (!placement) return { error: "Invalid person or placement" };
  if (placement === "placed") {
    const forum_id = str(input.forum_id);
    if (!forum_id) return { error: "forum_id is required for placement 'placed'" };
    return { forum_id, forum_status: "placed" };
  }
  return { forum_id: null, forum_status: placement === "unclassified" ? null : placement };
}

export async function executeAction(
  action: ChatbotActionRow,
  user: SessionUser,
): Promise<ExecuteResult> {
  const input = action.input ?? {};
  try {
    switch (action.tool) {
      case "update_deal_stage": {
        const dealId = str(input.deal_id);
        const stage = inEnum(MEMBER_ACQUISITION_STAGES, input.stage);
        if (!dealId || !stage) return { ok: false, error: "Invalid deal or stage" };
        const before = await snapshot("deals", dealId);
        if (!before) return { ok: false, error: "Deal not found" };
        if (stage === "Closed Won") {
          const handoff = await closeWonAndHandoff(dealId);
          if (!handoff.ok) return handoff;
          return {
            ok: true,
            before,
            result: { stage, onboardingDealId: handoff.onboardingDealId },
            revalidate: ["/board/prospects", "/board/onboarding"],
          };
        }
        const { deal_status, close_date } = deriveDealStatus(stage);
        await updateDealRow(dealId, {
          stage,
          deal_status,
          close_date,
          last_activity_at: new Date().toISOString(),
        });
        return {
          ok: true,
          before,
          result: { stage, deal_status },
          revalidate: ["/board/prospects"],
        };
      }

      case "update_deal_fields": {
        const dealId = str(input.deal_id);
        if (!dealId) return { ok: false, error: "Invalid deal id" };
        const before = await snapshot("deals", dealId);
        if (!before) return { ok: false, error: "Deal not found" };

        const patch = dealFieldsPatch(input);
        if (!Object.keys(patch).length)
          return { ok: false, error: "No valid fields to update" };
        patch.last_activity_at = new Date().toISOString();
        await updateDealRow(dealId, patch);
        return {
          ok: true,
          before,
          result: patch,
          revalidate: ["/board/prospects", `/board/prospects/${dealId}`, "/board/onboarding"],
        };
      }

      case "set_member_forum": {
        // Mirrors setMemberForum in src/app/board/members/actions.ts.
        const personId = str(input.person_id);
        const placed = forumPlacement(input);
        if (!personId || "error" in placed)
          return { ok: false, error: "error" in placed ? placed.error : "Invalid person or placement" };
        const { forum_id, forum_status } = placed;
        const before = await snapshot("people", personId);
        if (!before) return { ok: false, error: "Person not found" };

        const { error } = await supabase
          .from("people")
          .update({ forum_id, forum_status })
          .eq("id", personId);
        if (error) return { ok: false, error: error.message };
        return {
          ok: true,
          before,
          result: { forum_id, forum_status },
          revalidate: ["/board/members", "/board/forum"],
        };
      }

      case "set_member_signal_override": {
        const personId = str(input.person_id);
        const signal = inEnum(MEMBER_SIGNALS, input.signal);
        const note = str(input.note);
        if (!personId || !signal || !note)
          return { ok: false, error: "person, signal and note are all required" };
        const before = await snapshot("people", personId);
        if (!before) return { ok: false, error: "Person not found" };
        const { error } = await supabase.from("member_signal_overrides").insert({
          person_id: personId,
          signal,
          note,
          set_by: user.fullName ?? user.email,
        });
        if (error) return { ok: false, error: error.message };
        return {
          ok: true,
          before,
          result: { signal, note },
          revalidate: ["/board/members", "/board/member-engagement-review"],
        };
      }

      case "set_inquiry_status": {
        const inquiryId = str(input.inquiry_id);
        const status = inEnum(INQUIRY_STATUSES, input.status);
        if (!inquiryId || !status) return { ok: false, error: "Invalid inquiry or status" };
        const before = await snapshot("inquiries", inquiryId);
        if (!before) return { ok: false, error: "Inquiry not found" };
        const { error } = await supabase
          .from("inquiries")
          .update({ status })
          .eq("id", inquiryId);
        if (error) return { ok: false, error: error.message };
        return {
          ok: true,
          before,
          result: { status },
          revalidate: ["/board/inquiries", "/board"],
        };
      }

      default:
        return { ok: false, error: `Unknown tool '${action.tool}'` };
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? "Write failed" };
  }
}

type Row = Record<string, unknown>;

async function personName(id: unknown): Promise<string> {
  if (typeof id !== "string" || !id) return showValue(null);
  const { data } = await supabase
    .from("people")
    .select("name, preferred_name")
    .eq("id", id)
    .maybeSingle();
  const p = data as { name: string | null; preferred_name: string | null } | null;
  return p?.preferred_name || p?.name || "Unknown person";
}

async function forumName(id: unknown): Promise<string | null> {
  if (typeof id !== "string" || !id) return null;
  const { data } = await supabase.from("forums").select("name").eq("id", id).maybeSingle();
  return (data as { name: string } | null)?.name ?? null;
}

// Signal overrides stop counting after 90 days (OVERRIDE_WINDOW_DAYS in
// src/lib/engagement.ts).
const OVERRIDE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * The confirm card for a proposal: the action, the record it targets by name,
 * and each field's current and new value. Uses the same validation as
 * executeAction and reads the records itself, so nothing on the card comes
 * from model-written text. Fails (and no proposal is created) when the
 * parameters are invalid or the target does not exist.
 */
export async function describeAction(
  tool: WriteToolName,
  input: Row,
): Promise<{ ok: true; card: ProposalCard } | { ok: false; error: string }> {
  try {
    switch (tool) {
      case "update_deal_stage": {
        const dealId = str(input.deal_id);
        const stage = inEnum(MEMBER_ACQUISITION_STAGES, input.stage);
        if (!dealId || !stage) return { ok: false, error: "Invalid deal or stage" };
        const before = (await snapshot("deals", dealId)) as Row | null;
        if (!before) return { ok: false, error: "Deal not found" };
        return {
          ok: true,
          card: {
            action:
              stage === "Closed Won"
                ? "Close deal as won (also creates the onboarding card and membership record)"
                : "Move deal to a new stage",
            record: `Deal: ${showValue(before.name)}`,
            changes: [{ field: "stage", from: showValue(before.stage), to: stage }],
          },
        };
      }

      case "update_deal_fields": {
        const dealId = str(input.deal_id);
        if (!dealId) return { ok: false, error: "Invalid deal id" };
        const before = (await snapshot("deals", dealId)) as Row | null;
        if (!before) return { ok: false, error: "Deal not found" };
        const patch = dealFieldsPatch(input);
        if (!Object.keys(patch).length)
          return { ok: false, error: "No valid fields to update" };
        const changes = fieldChanges(before, patch);
        const rm = changes.find((c) => c.field === "relationship manager id");
        if (rm) {
          rm.field = "relationship manager";
          rm.from = await personName(before.relationship_manager_id);
          rm.to = await personName(patch.relationship_manager_id);
        }
        return {
          ok: true,
          card: { action: "Edit deal", record: `Deal: ${showValue(before.name)}`, changes },
        };
      }

      case "set_member_forum": {
        const personId = str(input.person_id);
        const placed = forumPlacement(input);
        if (!personId || "error" in placed)
          return { ok: false, error: "error" in placed ? placed.error : "Invalid person or placement" };
        const before = (await snapshot("people", personId)) as Row | null;
        if (!before) return { ok: false, error: "Person not found" };
        const newForum = await forumName(placed.forum_id);
        if (placed.forum_id && !newForum) return { ok: false, error: "Forum not found" };
        return {
          ok: true,
          card: {
            action: "Change forum placement",
            record: `Member: ${showValue(before.preferred_name || before.name)}`,
            changes: [
              {
                field: "forum",
                from: showValue(await forumName(before.forum_id)),
                to: showValue(newForum),
              },
              {
                field: "forum status",
                from: showValue(before.forum_status),
                to: showValue(placed.forum_status),
              },
            ],
          },
        };
      }

      case "set_member_signal_override": {
        const personId = str(input.person_id);
        const signal = inEnum(MEMBER_SIGNALS, input.signal);
        const note = str(input.note);
        if (!personId || !signal || !note)
          return { ok: false, error: "person, signal and note are all required" };
        const before = (await snapshot("people", personId)) as Row | null;
        if (!before) return { ok: false, error: "Person not found" };
        const { data: current } = await supabase
          .from("member_signal_overrides")
          .select("signal")
          .eq("person_id", personId)
          .gte("created_at", new Date(Date.now() - OVERRIDE_WINDOW_MS).toISOString())
          .order("created_at", { ascending: false })
          .limit(1);
        return {
          ok: true,
          card: {
            action: "Set engagement signal override (lasts 90 days)",
            record: `Member: ${showValue(before.preferred_name || before.name)}`,
            changes: [
              {
                field: "signal override",
                from: (current as { signal: string }[] | null)?.[0]?.signal ?? "(none)",
                to: signal,
              },
              { field: "note", from: null, to: showValue(note) },
            ],
          },
        };
      }

      case "set_inquiry_status": {
        const inquiryId = str(input.inquiry_id);
        const status = inEnum(INQUIRY_STATUSES, input.status);
        if (!inquiryId || !status) return { ok: false, error: "Invalid inquiry or status" };
        const before = (await snapshot("inquiries", inquiryId)) as Row | null;
        if (!before) return { ok: false, error: "Inquiry not found" };
        const received = String(before.created_at ?? "").slice(0, 10);
        return {
          ok: true,
          card: {
            action: "Mark inbox inquiry",
            record: `Inquiry: ${showValue(before.kind)} from ${await personName(before.person_id)}, received ${received}`,
            changes: [{ field: "status", from: showValue(before.status), to: status }],
          },
        };
      }

      default:
        return { ok: false, error: `Unknown tool '${tool}'` };
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? "Could not describe the change" };
  }
}
