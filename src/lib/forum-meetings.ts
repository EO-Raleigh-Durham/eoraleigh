import { supabase } from "./supabase";
import type { ForumMeeting } from "./forum-dates";

// Server-only reads and writes for forum moderators and forum dates
// (migration 133). This client bypasses RLS, so every caller must first decide
// access: requireBoardOrAbove() for the moderator log, and forumAccess() from
// forum-dates.ts for anything that touches forum_meetings.

export type ForumModeratorLogEntry = {
  year: number;
  personName: string | null; // null: the moderator was removed
  setByName: string | null;
  setAt: string;
};

/** The forum a member is placed in, and why not when they are in none. */
export async function getPersonForum(
  personId: string,
): Promise<{ forumId: string | null; forumStatus: string | null } | null> {
  const { data, error } = await supabase
    .from("people")
    .select("forum_id, forum_status")
    .eq("id", personId)
    .maybeSingle();
  if (error || !data) return null;
  return { forumId: data.forum_id as string | null, forumStatus: data.forum_status as string | null };
}

/** The forum's moderator for the fiscal year starting in `year`. */
export async function getForumModeratorId(forumId: string, year: number): Promise<string | null> {
  const { data, error } = await supabase
    .from("forum_moderators")
    .select("person_id")
    .eq("forum_id", forumId)
    .eq("fiscal_year_start", year)
    .maybeSingle();
  if (error) {
    console.warn("getForumModeratorId:", error.message);
    return null;
  }
  return (data?.person_id as string | null) ?? null;
}

export async function listForumModeratorLog(forumId: string): Promise<ForumModeratorLogEntry[]> {
  const { data, error } = await supabase
    .from("forum_moderator_log")
    .select("fiscal_year_start, person_name, set_by_name, set_at")
    .eq("forum_id", forumId)
    .order("set_at", { ascending: false })
    .limit(20);
  if (error) {
    console.warn("listForumModeratorLog:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    year: r.fiscal_year_start as number,
    personName: r.person_name as string | null,
    setByName: r.set_by_name as string | null,
    setAt: r.set_at as string,
  }));
}

type MeetingRow = {
  month: string;
  meets_on: string;
  start_time: string;
  place: string | null;
  updated_at: string;
};

const MEETING_COLUMNS = "month, meets_on, start_time, place, updated_at";

function toMeeting(r: MeetingRow): ForumMeeting {
  return {
    month: r.month,
    meetsOn: r.meets_on,
    startTime: r.start_time.slice(0, 5),
    place: r.place,
    updatedAt: r.updated_at,
  };
}

/** A forum's meetings from `fromMonth` (YYYY-MM-01) onward, oldest first. */
export async function listForumMeetings(forumId: string, fromMonth: string): Promise<ForumMeeting[]> {
  const { data, error } = await supabase
    .from("forum_meetings")
    .select(MEETING_COLUMNS)
    .eq("forum_id", forumId)
    .gte("month", fromMonth)
    .order("month");
  if (error) {
    console.warn("listForumMeetings:", error.message);
    return [];
  }
  return (data as MeetingRow[]).map(toMeeting);
}

export async function saveForumMeeting(
  forumId: string,
  personId: string,
  value: { month: string; meetsOn: string; startTime: string; place: string | null },
): Promise<ForumMeeting | null> {
  const { data, error } = await supabase
    .from("forum_meetings")
    .upsert(
      {
        forum_id: forumId,
        month: value.month,
        meets_on: value.meetsOn,
        start_time: value.startTime,
        place: value.place,
        set_by_person_id: personId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "forum_id,month" },
    )
    .select(MEETING_COLUMNS)
    .single();
  if (error) {
    console.warn("saveForumMeeting:", error.message);
    return null;
  }
  return toMeeting(data as MeetingRow);
}
