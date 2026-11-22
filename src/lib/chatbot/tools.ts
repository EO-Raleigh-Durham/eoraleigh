// Server-only. Anthropic tool definitions for the board chatbot.
//
// query_database executes immediately (restricted role, read-only). Every
// write tool does NOT execute: it creates a chatbot_actions proposal row that
// the user must confirm in the panel (src/app/board/chat/actions.ts) before
// src/lib/chatbot/writes.ts applies it. Board appointments are deliberately
// not writable here: they decide board and revenue access, so the chatbot
// cannot propose them.

import { CHAPTER_NAME } from "../../kernel/config/chapter.ts";
import type Anthropic from "@anthropic-ai/sdk";
import {
  CHANNEL_SOURCES,
  CLOSED_LOST_DESCRIPTIONS,
  DISQUALIFICATION_REASONS,
  MEMBER_ACQUISITION_STAGES,
  MEMBERSHIP_TYPES,
} from "@/lib/deals";

export const FORUM_PLACEMENTS = [
  "placed",
  "forum_trained",
  "waiting_ftp",
  "no_forum",
  "other_chapter",
  "unclassified",
] as const;

export const MEMBER_SIGNALS = [
  "healthy",
  "value_risk",
  "drifting",
  "at_risk",
  "quiet",
] as const;

export const INQUIRY_STATUSES = ["new", "read"] as const;

export const WRITE_TOOL_NAMES = [
  "update_deal_stage",
  "update_deal_fields",
  "set_member_forum",
  "set_member_signal_override",
  "set_inquiry_status",
] as const;

export type WriteToolName = (typeof WRITE_TOOL_NAMES)[number];

export function isWriteTool(name: string): name is WriteToolName {
  return (WRITE_TOOL_NAMES as readonly string[]).includes(name);
}

const QUERY_TOOL: Anthropic.Tool = {
  name: "query_database",
  description:
    `Run a single read-only SQL SELECT against the ${CHAPTER_NAME} chapter database. ` +
    "Use this for every question about chapter data, and to look up ids before " +
    "proposing any change. On the restricted tables (companies, deals, member_companies, " +
    "member_requalifications, event_registration_attendees) you MUST name columns explicitly; " +
    "SELECT * is denied there. Results are capped at 200 rows; add ORDER BY and LIMIT.",
  input_schema: {
    type: "object",
    properties: {
      sql: { type: "string", description: "One SELECT (or WITH) statement. No semicolons." },
    },
    required: ["sql"],
  },
};

const WRITE_TOOLS: Anthropic.Tool[] = [
  {
    name: "update_deal_stage",
    description:
      "Propose moving a Member Acquisition deal to a new pipeline stage. Moving to " +
      "'Closed Won' also creates the Onboarding Track card and the membership record. " +
      "Look the deal up first and echo its name and current stage.",
    input_schema: {
      type: "object",
      properties: {
        deal_id: { type: "string", description: "deals.id (uuid)" },
        stage: { type: "string", enum: [...MEMBER_ACQUISITION_STAGES] },
      },
      required: ["deal_id", "stage"],
    },
  },
  {
    name: "update_deal_fields",
    description:
      "Propose editing fields on a deal (name, description, channel, qualification " +
      "checklist, close reasons, relationship manager). Include only the fields being " +
      "changed. Deal amounts and dues cannot be edited here.",
    input_schema: {
      type: "object",
      properties: {
        deal_id: { type: "string", description: "deals.id (uuid)" },
        name: { type: "string" },
        description: { type: "string" },
        channel_source: { type: "string", enum: [...CHANNEL_SOURCES] },
        primary_interest: { type: "string", enum: [...MEMBERSHIP_TYPES] },
        relationship_manager_id: {
          type: "string",
          description: "people.id of an EO staff member (people.is_eo_staff = true)",
        },
        ql_founder_controlling_owner: { type: "boolean" },
        ql_revenue_verified: { type: "boolean" },
        ql_financial_commitment: { type: "boolean" },
        ql_time_commitment: { type: "boolean" },
        closed_lost_description: { type: "string", enum: [...CLOSED_LOST_DESCRIPTIONS] },
        closed_lost_reason: { type: "string" },
        closed_won_reason: { type: "string" },
        disqualification_reason: { type: "string", enum: [...DISQUALIFICATION_REASONS] },
      },
      required: ["deal_id"],
    },
  },
  {
    name: "set_member_forum",
    description:
      "Propose changing a member's forum placement. placement 'placed' requires " +
      "forum_id (forums.id). Any other placement clears the member's forum.",
    input_schema: {
      type: "object",
      properties: {
        person_id: { type: "string", description: "people.id (uuid)" },
        placement: { type: "string", enum: [...FORUM_PLACEMENTS] },
        forum_id: { type: "string", description: "forums.id, required when placement is 'placed'" },
      },
      required: ["person_id", "placement"],
    },
  },
  {
    name: "set_member_signal_override",
    description:
      "Propose setting a member's engagement signal override (shows on the roster and " +
      "member 360; auto-expires after 90 days). A note explaining why is required.",
    input_schema: {
      type: "object",
      properties: {
        person_id: { type: "string", description: "people.id (uuid)" },
        signal: { type: "string", enum: [...MEMBER_SIGNALS] },
        note: { type: "string", description: "Why this signal is being set" },
      },
      required: ["person_id", "signal", "note"],
    },
  },
  {
    name: "set_inquiry_status",
    description: "Propose marking an inbox inquiry as read or new.",
    input_schema: {
      type: "object",
      properties: {
        inquiry_id: { type: "string", description: "inquiries.id (uuid)" },
        status: { type: "string", enum: [...INQUIRY_STATUSES] },
      },
      required: ["inquiry_id", "status"],
    },
  },
];

export function chatbotTools(opts: { canWrite: boolean }): Anthropic.Tool[] {
  return opts.canWrite ? [QUERY_TOOL, ...WRITE_TOOLS] : [QUERY_TOOL];
}
