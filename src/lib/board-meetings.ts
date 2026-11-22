// Server-only. Board Meeting Room (plan 35): the monthly board meetings, their
// agenda, chair updates, comments, minutes and ratings. Every read and write
// goes through the service client behind the board-tier guards in
// src/app/board/meetings.
import { supabase } from "@/lib/supabase";
import { currentFyStart, fyStartForDate } from "@/lib/fiscal-year";
import type { SessionUser } from "@/lib/auth";

export type Meeting = {
  id: string;
  meeting_on: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  online_link: string | null;
  fiscal_year_start: number;
  status: "upcoming" | "held" | "cancelled";
  previous_minutes_approved: boolean | null;
  minutes_md: string | null;
  recording_url: string | null;
  source: string;
};

export type AgendaRow = {
  id: string;
  kind: "issue" | "announcement";
  issue_id: string | null;
  title: string;
  details_md: string | null;
  outcome_md: string | null;
  status: "planned" | "discussed" | "deferred";
  sort_order: number;
};

export type AgendaIssue = {
  issueId: string;
  title: string;
  ownerName: string | null;
  issueStatus: string;
  raisedOn: string;
  row: AgendaRow | null; // the outcome recorded at this meeting, if any
};

export type UpdateComment = { id: string; author: string; body: string; created_at: string };
export type ChairUpdate = {
  roleId: string;
  roleKey: string;
  roleName: string;
  sort: number;
  holderName: string | null;
  holderId: string | null;
  update: { id: string; body_md: string; updated_at: string; authorName: string | null } | null;
  comments: UpdateComment[];
};

export type Rating = { count: number; average: number | null; mine: { score: number; went_well: string | null; change_next_time: string | null } | null; notes: { went_well: string | null; change_next_time: string | null }[] };

const MEETING_COLUMNS =
  "id, meeting_on, starts_at, ends_at, location, online_link, fiscal_year_start, status, previous_minutes_approved, minutes_md, recording_url, source";

export async function listMeetings(): Promise<(Meeting & { updates: number; ratingAvg: number | null })[]> {
  const { data, error } = await supabase
    .from("board_meetings")
    .select(`${MEETING_COLUMNS}, meeting_updates(id), meeting_ratings(score)`)
    .order("meeting_on", { ascending: false });
  if (error) throw new Error(`board_meetings: ${error.message}`);
  type Row = Meeting & { meeting_updates: { id: string }[]; meeting_ratings: { score: number }[] };
  return ((data ?? []) as unknown as Row[]).map(({ meeting_updates, meeting_ratings, ...m }) => ({
    ...m,
    updates: meeting_updates.length,
    ratingAvg: meeting_ratings.length ? Math.round((meeting_ratings.reduce((a, r) => a + r.score, 0) / meeting_ratings.length) * 10) / 10 : null,
  }));
}

// The next meeting is always open: its row exists before anyone looks, so
// updates can be written on its agenda right away. Idempotent.
export async function ensureMeeting(meetingOn: string): Promise<void> {
  const { error } = await supabase
    .from("board_meetings")
    .upsert({ meeting_on: meetingOn, fiscal_year_start: fyStartForDate(meetingOn) }, { onConflict: "meeting_on", ignoreDuplicates: true });
  if (error) throw new Error(`board_meetings: ${error.message}`);
}

// The most recent meeting before today that was not cancelled.
export async function lastMeetingBefore(today: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("board_meetings")
    .select("meeting_on")
    .lt("meeting_on", today)
    .neq("status", "cancelled")
    .order("meeting_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`board_meetings: ${error.message}`);
  return (data as { meeting_on: string } | null)?.meeting_on ?? null;
}

export async function getMeeting(meetingOn: string): Promise<Meeting | null> {
  const { data, error } = await supabase.from("board_meetings").select(MEETING_COLUMNS).eq("meeting_on", meetingOn).maybeSingle();
  if (error) throw new Error(`board_meetings: ${error.message}`);
  return (data as Meeting | null) ?? null;
}

export async function getMeetingById(id: string): Promise<Meeting | null> {
  const { data } = await supabase.from("board_meetings").select(MEETING_COLUMNS).eq("id", id).maybeSingle();
  return (data as Meeting | null) ?? null;
}

// Who may run a meeting: the President, chapter staff and super admins set
// the meeting up, record outcomes and minutes, and add announcements.
export async function canRunMeetings(user: SessionUser): Promise<boolean> {
  if (user.role === "super_admin") return true;
  if (!user.personId) return false;
  const [{ data: seat }, { data: person }] = await Promise.all([
    supabase
      .from("board_appointments")
      .select("id, board_roles!inner(key)")
      .eq("person_id", user.personId)
      .eq("fiscal_year_start", currentFyStart())
      .in("board_roles.key", ["president"])
      .limit(1),
    supabase.from("people").select("is_eo_staff").eq("id", user.personId).maybeSingle(),
  ]);
  return Boolean((seat ?? []).length) || Boolean((person as { is_eo_staff: boolean | null } | null)?.is_eo_staff);
}

// The board_roles a person holds in a fiscal year; a chair writes the update
// for these roles.
export async function rolesHeld(personId: string | null, fyStart: number): Promise<string[]> {
  if (!personId) return [];
  const { data } = await supabase
    .from("board_appointments")
    .select("board_role_id")
    .eq("person_id", personId)
    .eq("fiscal_year_start", fyStart);
  return ((data ?? []) as { board_role_id: string }[]).map((r) => r.board_role_id);
}

const nameOf = (p: { name: string | null; preferred_name: string | null } | null) => p?.preferred_name || p?.name || null;

export async function loadMeetingPage(meeting: Meeting, viewerPersonId: string | null) {
  const [agendaRes, issuesRes, rolesRes, seatsRes, updatesRes, ratingsRes, prevRes] = await Promise.all([
    supabase.from("meeting_agenda_items").select("id, kind, issue_id, title, details_md, outcome_md, status, sort_order").eq("meeting_id", meeting.id).order("sort_order"),
    supabase
      .from("issues")
      .select("id, title, status, created_at, assignee:people!issues_assignee_person_id_fkey(name, preferred_name)")
      .in("status", ["open", "solving"])
      .order("created_at"),
    supabase.from("board_roles").select("id, key, name, sort_order").eq("is_active", true).order("sort_order"),
    supabase
      .from("board_appointments")
      .select("person_id, board_role_id, people(name, preferred_name)")
      .eq("fiscal_year_start", meeting.fiscal_year_start),
    supabase
      .from("meeting_updates")
      .select("id, board_role_id, body_md, updated_at, author:people!meeting_updates_person_id_fkey(name, preferred_name), meeting_update_comments(id, body, author_label, created_at, author:people!meeting_update_comments_author_person_id_fkey(name, preferred_name))")
      .eq("meeting_id", meeting.id),
    supabase.from("meeting_ratings").select("person_id, score, went_well, change_next_time").eq("meeting_id", meeting.id),
    supabase.from("board_meetings").select("id, meeting_on, meeting_ratings(score)").lt("meeting_on", meeting.meeting_on).order("meeting_on", { ascending: false }).limit(1),
  ]);
  for (const r of [agendaRes, issuesRes, rolesRes, seatsRes, updatesRes, ratingsRes]) if (r.error) throw new Error(r.error.message);

  const agenda = (agendaRes.data ?? []) as AgendaRow[];
  const announcements = agenda.filter((a) => a.kind === "announcement");
  const issueRows = agenda.filter((a) => a.kind === "issue");

  type IssueQ = { id: string; title: string; status: string; created_at: string; assignee: { name: string | null; preferred_name: string | null } | null };
  const live = (issuesRes.data ?? []) as unknown as IssueQ[];
  // An upcoming meeting shows every active issue; a held meeting shows what
  // was recorded at it, plus nothing new.
  const issues: AgendaIssue[] =
    meeting.status === "upcoming"
      ? live.map((i) => ({
          issueId: i.id,
          title: i.title,
          ownerName: nameOf(i.assignee),
          issueStatus: i.status,
          raisedOn: i.created_at.slice(0, 10),
          row: issueRows.find((r) => r.issue_id === i.id) ?? null,
        }))
      : issueRows.map((r) => ({ issueId: r.issue_id ?? r.id, title: r.title, ownerName: null, issueStatus: "", raisedOn: "", row: r }));

  type RoleQ = { id: string; key: string; name: string; sort_order: number };
  type SeatQ = { person_id: string; board_role_id: string; people: { name: string | null; preferred_name: string | null } | null };
  type Person = { name: string | null; preferred_name: string | null } | null;
  type UpdQ = {
    id: string;
    board_role_id: string;
    body_md: string;
    updated_at: string;
    author: Person;
    meeting_update_comments: { id: string; body: string; author_label: string | null; created_at: string; author: Person }[];
  };
  const roles = (rolesRes.data ?? []) as RoleQ[];
  const seats = (seatsRes.data ?? []) as unknown as SeatQ[];
  const updates = (updatesRes.data ?? []) as unknown as UpdQ[];
  const chairUpdates: ChairUpdate[] = roles
    .map((r) => {
      const seat = seats.find((s) => s.board_role_id === r.id);
      const u = updates.find((x) => x.board_role_id === r.id);
      return {
        roleId: r.id,
        roleKey: r.key,
        roleName: r.name,
        sort: r.sort_order,
        holderName: nameOf(seat?.people ?? null),
        holderId: seat?.person_id ?? null,
        update: u ? { id: u.id, body_md: u.body_md, updated_at: u.updated_at, authorName: nameOf(u.author) } : null,
        comments: (u?.meeting_update_comments ?? [])
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map((c) => ({ id: c.id, author: nameOf(c.author) ?? c.author_label ?? "Board member", body: c.body, created_at: c.created_at })),
      };
    })
    // Seats nobody holds and nobody wrote for stay off the page.
    .filter((c) => c.holderId || c.update);

  type RateQ = { person_id: string; score: number; went_well: string | null; change_next_time: string | null };
  const ratings = (ratingsRes.data ?? []) as RateQ[];
  const rating: Rating = {
    count: ratings.length,
    average: ratings.length ? Math.round((ratings.reduce((a, r) => a + r.score, 0) / ratings.length) * 10) / 10 : null,
    mine: ratings.find((r) => r.person_id === viewerPersonId) ?? null,
    notes: ratings.filter((r) => r.went_well || r.change_next_time).map((r) => ({ went_well: r.went_well, change_next_time: r.change_next_time })),
  };
  const prev = ((prevRes.data ?? []) as { meeting_on: string; meeting_ratings: { score: number }[] }[])[0];
  const previous = prev
    ? {
        meetingOn: prev.meeting_on,
        ratingAvg: prev.meeting_ratings.length ? Math.round((prev.meeting_ratings.reduce((a, r) => a + r.score, 0) / prev.meeting_ratings.length) * 10) / 10 : null,
        ratingCount: prev.meeting_ratings.length,
      }
    : null;

  return { announcements, issues, chairUpdates, rating, previous };
}
