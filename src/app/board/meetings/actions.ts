"use server";

// Board Meeting Room actions (plan 35). Every action authorizes itself:
// board tier for everyone, plus the President, chapter staff or a super admin
// to run the meeting, and the chair's own seat to write an update.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBoardOrAbove } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { fyStartForDate } from "@/lib/fiscal-year";
import { nextBoardMeeting } from "@/lib/board-home-shared";
import { chapterToday } from "@/kernel/config/dates";
import { canRunMeetings, getMeetingById, rolesHeld } from "@/lib/board-meetings";

const s = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const nullable = (v: string) => (v ? v : null);

function done(meetingOn: string) {
  revalidatePath("/board/meetings");
  revalidatePath(`/board/meetings/${meetingOn}`);
  revalidatePath("/board");
}

async function requireRunner() {
  const user = await requireBoardOrAbove();
  if (!(await canRunMeetings(user))) throw new Error("Only the President or chapter staff can do that.");
  return user;
}

async function meetingFrom(fd: FormData) {
  const m = await getMeetingById(s(fd.get("meeting_id")));
  if (!m) throw new Error("That meeting no longer exists.");
  return m;
}

export async function createNextMeeting(fd: FormData): Promise<void> {
  await requireRunner();
  const day = s(fd.get("meeting_on")) || nextBoardMeeting(chapterToday());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Pick a date.");
  const { error } = await supabase
    .from("board_meetings")
    .upsert({ meeting_on: day, fiscal_year_start: fyStartForDate(day) }, { onConflict: "meeting_on", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  done(day);
  redirect(`/board/meetings/${day}`);
}

export async function saveMeetingDetails(fd: FormData): Promise<void> {
  await requireRunner();
  const m = await meetingFrom(fd);
  const status = s(fd.get("status"));
  const { error } = await supabase
    .from("board_meetings")
    .update({
      starts_at: s(fd.get("starts_at")) || m.starts_at,
      ends_at: nullable(s(fd.get("ends_at"))),
      location: nullable(s(fd.get("location"))),
      online_link: nullable(s(fd.get("online_link"))),
      recording_url: nullable(s(fd.get("recording_url"))),
      status: ["upcoming", "held", "cancelled"].includes(status) ? status : m.status,
      previous_minutes_approved: fd.get("previous_minutes_approved") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", m.id);
  if (error) throw new Error(error.message);
  done(m.meeting_on);
}

export async function saveMinutes(fd: FormData): Promise<void> {
  await requireRunner();
  const m = await meetingFrom(fd);
  const { error } = await supabase
    .from("board_meetings")
    .update({ minutes_md: nullable(s(fd.get("minutes_md"))), updated_at: new Date().toISOString() })
    .eq("id", m.id);
  if (error) throw new Error(error.message);
  done(m.meeting_on);
}

export async function addAnnouncement(fd: FormData): Promise<void> {
  const user = await requireRunner();
  const m = await meetingFrom(fd);
  const title = s(fd.get("title"));
  if (!title) throw new Error("Write the announcement.");
  const { error } = await supabase.from("meeting_agenda_items").insert({
    meeting_id: m.id,
    kind: "announcement",
    title,
    details_md: nullable(s(fd.get("details_md"))),
    added_by_person_id: user.personId,
    sort_order: Date.now() % 1000000,
  });
  if (error) throw new Error(error.message);
  done(m.meeting_on);
}

export async function removeAnnouncement(fd: FormData): Promise<void> {
  await requireRunner();
  const m = await meetingFrom(fd);
  const { error } = await supabase
    .from("meeting_agenda_items")
    .delete()
    .eq("id", s(fd.get("item_id")))
    .eq("meeting_id", m.id)
    .eq("kind", "announcement");
  if (error) throw new Error(error.message);
  done(m.meeting_on);
}

// Records what the board decided on a Radar issue at this meeting.
export async function saveIssueOutcome(fd: FormData): Promise<void> {
  await requireRunner();
  const m = await meetingFrom(fd);
  const issueId = s(fd.get("issue_id"));
  const { data: issue } = await supabase.from("issues").select("id, title").eq("id", issueId).maybeSingle();
  if (!issue) throw new Error("That issue no longer exists.");
  const status = s(fd.get("status"));
  const { error } = await supabase.from("meeting_agenda_items").upsert(
    {
      meeting_id: m.id,
      kind: "issue",
      issue_id: issueId,
      title: (issue as { title: string }).title,
      outcome_md: nullable(s(fd.get("outcome_md"))),
      status: ["planned", "discussed", "deferred"].includes(status) ? status : "discussed",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "meeting_id,issue_id" },
  );
  if (error) throw new Error(error.message);
  done(m.meeting_on);
}

// A chair writes or edits the update for a seat they hold this fiscal year.
export async function saveUpdate(fd: FormData): Promise<void> {
  const user = await requireBoardOrAbove();
  const m = await meetingFrom(fd);
  const roleId = s(fd.get("board_role_id"));
  const held = await rolesHeld(user.personId, m.fiscal_year_start);
  if (!held.includes(roleId) && user.role !== "super_admin") throw new Error("You can only write the update for your own chair.");
  const body = s(fd.get("body_md"));
  if (!body) {
    const { error } = await supabase.from("meeting_updates").delete().eq("meeting_id", m.id).eq("board_role_id", roleId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("meeting_updates").upsert(
      { meeting_id: m.id, board_role_id: roleId, person_id: user.personId, body_md: body, updated_at: new Date().toISOString() },
      { onConflict: "meeting_id,board_role_id" },
    );
    if (error) throw new Error(error.message);
  }
  done(m.meeting_on);
}

export async function addComment(fd: FormData): Promise<void> {
  const user = await requireBoardOrAbove();
  const m = await meetingFrom(fd);
  const updateId = s(fd.get("update_id"));
  const body = s(fd.get("body"));
  if (!body) return;
  const { data: upd } = await supabase.from("meeting_updates").select("id").eq("id", updateId).eq("meeting_id", m.id).maybeSingle();
  if (!upd) throw new Error("That update no longer exists.");
  const { error } = await supabase
    .from("meeting_update_comments")
    .insert({ update_id: updateId, author_person_id: user.personId, author_label: user.fullName, body });
  if (error) throw new Error(error.message);
  done(m.meeting_on);
}

export async function rateMeeting(fd: FormData): Promise<void> {
  const user = await requireBoardOrAbove();
  if (!user.personId) throw new Error("Your login is not linked to a person record.");
  const m = await meetingFrom(fd);
  const score = Number(s(fd.get("score")));
  if (!Number.isInteger(score) || score < 1 || score > 10) throw new Error("Pick a score from 1 to 10.");
  const { error } = await supabase.from("meeting_ratings").upsert(
    {
      meeting_id: m.id,
      person_id: user.personId,
      score,
      went_well: nullable(s(fd.get("went_well"))),
      change_next_time: nullable(s(fd.get("change_next_time"))),
    },
    { onConflict: "meeting_id,person_id" },
  );
  if (error) throw new Error(error.message);
  done(m.meeting_on);
}
