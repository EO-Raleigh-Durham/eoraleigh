import { supabase } from "@/lib/supabase";
import { eventPath, type EventRow } from "@/lib/events";
import { dedupeLinkablePages, blogPostPages, type LinkablePage } from "@/lib/short-links";
import { getBlogIndexData } from "@/app/blog/blog-index-data";

// The blog content the board's short-link form offers, read from the same
// place as the public /blog page so the two always match: the published
// public posts (database posts plus the pinned static ones), and the event
// recaps shown under the Blog page's "Event recaps" filter (recap posts and
// the event pages of past events that have a recap). Member-only posts are
// left out.
export async function loadLinkableBlogContent(): Promise<{
  posts: LinkablePage[];
  recaps: LinkablePage[];
}> {
  const { posts, eventRecaps } = await getBlogIndexData();
  return {
    posts: blogPostPages(posts),
    recaps: dedupeLinkablePages(
      eventRecaps.map((recap) => ({
        path: recap.href,
        title: recap.title,
        startsAt: recap.date,
      })),
    ),
  };
}

// The pages the board's short-link form offers in its "Which event?" list:
// local events from the database that are open or published and start within
// the last two weeks or later, plus the pinned page below.
//
// Pinned pages are static routes that are not guaranteed to be in the events
// table (see PINNED_EVENTS in src/app/events/page.tsx). DecisionLab is listed
// here so it is always offered; it drops off the list once its day has passed.
const PINNED_PAGES: Array<LinkablePage & { until: string }> = [
  {
    path: "/events/decisionlab-december-2026",
    title: "DecisionLab: Play the hand you're dealt",
    // Only the day is known here (17 Dec 2026, from PINNED_EVENTS), not the hour.
    startsAt: "2026-12-17T00:00:00+07:00",
    until: "2026-12-17T23:59:59+07:00",
  },
];

// A database row can still carry an old slug whose page moved. The old
// address redirects, but a short link should point straight at the new one
// (mirrors RETIRED_EVENT_SLUGS in src/app/events/page.tsx).
const MOVED_SLUGS: Record<string, string> = {
  "decisionlab-poker-december-2026": "/events/decisionlab-december-2026",
};

export async function loadLinkablePages(): Promise<LinkablePage[]> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("events")
    .select("id, slug, title, starts_at, status, scope")
    .in("status", ["open", "published"])
    .gte("starts_at", since)
    .order("starts_at", { ascending: true })
    .limit(60);

  const fromDb: LinkablePage[] = (
    (data ?? []) as Array<
      Pick<EventRow, "id" | "slug" | "title" | "starts_at"> & { scope?: string | null }
    >
  )
    .filter((row) => row.scope !== "global")
    .map((row) => ({
      path: (row.slug && MOVED_SLUGS[row.slug]) || eventPath(row),
      title: row.title,
      startsAt: row.starts_at,
    }));

  const now = Date.now();
  const pinned = PINNED_PAGES.filter((p) => Date.parse(p.until) >= now).map(
    ({ path, title, startsAt }) => ({ path, title, startsAt }),
  );

  // The membership application is not an event but gets posted like one.
  const join: LinkablePage = {
    path: "/join",
    title: "Join EO (membership application)",
    startsAt: null,
  };

  return dedupeLinkablePages([...pinned, ...fromDb, join]);
}
