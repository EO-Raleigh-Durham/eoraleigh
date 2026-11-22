// The chapter app's stand-in for edge8-web's crm entity (EO-owned).
//
// Deals: edge8's sales pipeline is the chapter's Member Acquisition pipeline,
// read through the edge8_deals view (migration 103), so a person with an open
// acquisition deal is a "prospect" to marketing audiences. New leads are the
// acquisition deals opened since a date.
//
// Meetings: edge8's Workboards turn client meeting actions into cards and draft
// a sprint brief from a meeting transcript, and its marketing overview counts
// sales meetings booked. The chapter app records no meetings or transcripts, so
// there is nothing to file, no brief to draft and no meeting goal.
import { companyOs, supabaseUntyped } from "@/kernel/data/supabase";
import { emptySelect } from "@/kernel/data/empty-query";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

type SelectOptions = { head?: boolean; count?: "exact" | "planned" | "estimated" };

export const selectMeetings = (_columns: string, _options?: SelectOptions) => emptySelect();

type Row = Record<string, unknown>;

export const selectDeals = (columns: string, options?: SelectOptions) =>
  companyOs.from("edge8_deals").select<string, Row>(columns, options);

/** Sales meetings a week; the chapter has no meeting goal. */
export const WEEKLY_MEETINGS_GOAL = 0;

export async function getMeetingsBookedThisWeek(): Promise<number> {
  return 0;
}

/** Member Acquisition deals opened since `sinceIso` (all of them when null). */
export async function getNewLeadsCount(sinceIso: string | null): Promise<number> {
  let query = supabaseUntyped
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("pipeline", "Member Acquisition");
  if (sinceIso) query = query.gte("created_at", sinceIso);
  const { count, error } = await query;
  if (error) console.error("[crm] new leads", error.message);
  return count ?? 0;
}

export type ItemToFile = {
  id: string;
  meetingId: string;
  position: number;
  title: string;
  detail: string | null;
  evidence: string | null;
  ownerName: string | null;
  dueDate: string | null;
  fileState: "to_file" | "needs_board";
  companyId: string;
  companyName: string | null;
  aiProgramId: string | null;
  meetingDate: string | null;
  meetingOwnerId: string | null;
};

export async function meetingActionsToFile(_opts: {
  limit: number;
  meetingId?: string;
  states?: ("to_file" | "needs_board")[];
}): Promise<ItemToFile[]> {
  return [];
}

type WriteResult = { data: null; error: { message: string } | null };

export const markMeetingActionFiled = (_itemId: string, _taskId: string, _note: string | null): Promise<WriteResult> =>
  Promise.resolve({ data: null, error: null });

export const markMeetingActionsNeedBoard = (_itemIds: string[], _note: string): Promise<WriteResult> =>
  Promise.resolve({ data: null, error: null });

export type SprintBriefDraft = {
  goal: string | null;
  focus_improvement: string | null;
  going_well: string | null;
  meeting_summary: string | null;
};

export async function extractSprintBrief(
  _meetingId: string,
  _clientName: string,
): Promise<{ ok: true; draft: SprintBriefDraft } | { ok: false; error: string }> {
  return { ok: false, error: `${CHAPTER_NAME} records no meeting transcripts to draft a sprint brief from.` };
}

// The roster of people who can be given work (board tier and up, from
// team_members), and names for anyone a record still points at.
export { listAssignablePeople, listPeopleNames, type PersonOption } from "./lib/people-options";
