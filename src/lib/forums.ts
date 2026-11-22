import { supabase } from "./supabase";

// Server-only data layer for the Forum rosters admin view.
//
// EO Forums are confidential peer groups: each placed member sits in exactly
// one forum (people.forum_id -> forums). Members not in a chapter forum carry a
// people.forum_status that says why:
//   waiting_ftp   - awaiting the Forum Training Program before placement
//   no_forum      - not in a forum by choice
//   other_chapter - in a forum that belongs to another EO chapter
//   (null)        - unclassified; needs review
//
// Membership truth is the relational chapter_memberships table (active /
// on_leave), exactly as the member roster reads it, so the two views agree.
// Schema: supabase/031_forums.sql and supabase/032_forum_other_chapter.sql.

export type ForumPlacement =
  | "forum_trained"
  | "waiting_ftp"
  | "no_forum"
  | "other_chapter"
  | "unclassified";

export type ForumPerson = {
  id: string;
  name: string | null;
  email: string;
  membershipType: string;
  company: string | null;
};

export type UnplacedPerson = ForumPerson & { placement: ForumPlacement };

export type ForumRoster = {
  id: string;
  name: string;
  members: ForumPerson[];
};

export type ForumOverview = {
  forums: ForumRoster[];
  unplaced: UnplacedPerson[];
  totals: { forums: number; members: number; placed: number; unplaced: number };
};

export const PLACEMENT_LABEL: Record<ForumPlacement, string> = {
  forum_trained: "Forum trained, needs placement",
  unclassified: "Unclassified",
  waiting_ftp: "Waiting for FTP",
  other_chapter: "Other chapter forum",
  no_forum: "No forum",
};

// Action-needed groups first (forum-trained and ready, then unclassified, then
// awaiting training), resolved states last. Drives both the unplaced sort and
// the page's group order.
const PLACEMENT_ORDER: Record<ForumPlacement, number> = {
  forum_trained: 0,
  unclassified: 1,
  waiting_ftp: 2,
  other_chapter: 3,
  no_forum: 4,
};

function normalizePlacement(status: string | null): ForumPlacement {
  if (
    status === "forum_trained" ||
    status === "waiting_ftp" ||
    status === "no_forum" ||
    status === "other_chapter"
  ) {
    return status;
  }
  return "unclassified";
}

type MembershipForumRow = {
  status: "active" | "on_leave";
  membership_type: string;
  person: {
    id: string;
    email: string;
    name: string | null;
    forum_id: string | null;
    forum_status: string | null;
    company_id: string | null;
  } | null;
};

// Forums lookup (id + name), sorted by name. Used by the member shelf's forum
// picker and internally by getForumOverview.
export async function listForums(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("forums")
    .select("id, name")
    .order("name");
  if (error) {
    console.warn("listForums:", error.message);
    return [];
  }
  return (data ?? []) as { id: string; name: string }[];
}

// Every forum with its roster, plus the active members who still need placing,
// grouped by why they are unplaced. Members on leave are excluded: the forum
// view is about who is actively in (or needs) a peer group. One DB round per
// resource (forums, memberships+people, companies), joined in memory.
export async function getForumOverview(): Promise<ForumOverview> {
  const forums = await listForums();

  const { data: memRows, error: memErr } = await supabase
    .from("chapter_memberships")
    .select(
      "status, membership_type, " +
        "person:people!chapter_memberships_person_id_fkey(" +
        "id, email, name, forum_id, forum_status, company_id)",
    )
    .eq("status", "active");
  if (memErr) console.warn("getForumOverview: memberships", memErr.message);
  const rows = ((memRows ?? []) as unknown as MembershipForumRow[]).filter(
    (r) => r.person,
  );

  // Company names for the per-member meta line.
  const companyIds = Array.from(
    new Set(
      rows
        .map((r) => r.person!.company_id)
        .filter((id): id is string => !!id),
    ),
  );
  const companyName = new Map<string, string>();
  if (companyIds.length > 0) {
    const { data: companies, error: compErr } = await supabase
      .from("companies")
      .select("id, name")
      .in("id", companyIds);
    if (compErr) console.warn("getForumOverview: companies", compErr.message);
    for (const c of companies ?? []) companyName.set(c.id, c.name as string);
  }

  const toPerson = (r: MembershipForumRow): ForumPerson => ({
    id: r.person!.id,
    name: r.person!.name,
    email: r.person!.email,
    membershipType: r.membership_type,
    company: r.person!.company_id
      ? companyName.get(r.person!.company_id) ?? null
      : null,
  });

  const byForum = new Map<string, ForumPerson[]>();
  const unplaced: UnplacedPerson[] = [];
  for (const r of rows) {
    const person = toPerson(r);
    const forumId = r.person!.forum_id;
    if (forumId) {
      const list = byForum.get(forumId) ?? [];
      list.push(person);
      byForum.set(forumId, list);
    } else {
      unplaced.push({ ...person, placement: normalizePlacement(r.person!.forum_status) });
    }
  }

  const byName = (a: ForumPerson, b: ForumPerson) =>
    (a.name ?? a.email).localeCompare(b.name ?? b.email);

  const forumRosters: ForumRoster[] = forums.map((f) => ({
    id: f.id,
    name: f.name,
    members: (byForum.get(f.id) ?? []).sort(byName),
  }));

  unplaced.sort((a, b) => {
    const order = PLACEMENT_ORDER[a.placement] - PLACEMENT_ORDER[b.placement];
    return order !== 0 ? order : byName(a, b);
  });

  const placed = forumRosters.reduce((n, f) => n + f.members.length, 0);

  return {
    forums: forumRosters,
    unplaced,
    totals: {
      forums: forums.length,
      members: placed + unplaced.length,
      placed,
      unplaced: unplaced.length,
    },
  };
}
