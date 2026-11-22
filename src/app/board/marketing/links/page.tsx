import type { Metadata } from "next";
import { requireBoardOrAbove } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/page-metadata";
import { PageHead } from "@/kernel/ui/PageHead";
import { loadLinkableBlogContent, loadLinkablePages } from "@/lib/linkable-events";
import { humanizePath, type LinkablePage } from "@/lib/short-links";
import { EventLinksPicker, type PickerEvent } from "./EventLinksPicker";
import { ShortLinkRow, type ShortLinkListItem } from "./ShortLinkRow";
import { CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

export const metadata: Metadata = {
  title: "Short links",
  description: "Short tracked links for announcements.",
};
export const dynamic = "force-dynamic";

function dateLabel(startsAt: string | null | undefined): string | null {
  if (!startsAt) return null;
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: CHAPTER_TIME_ZONE,
  });
}

// Upcoming events first (soonest on top), then events that already started
// (most recent first), then pages with no date such as the join page.
function orderPages(pages: LinkablePage[]): LinkablePage[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOf = (p: LinkablePage) => (p.startsAt ? Date.parse(p.startsAt) : NaN);
  const upcoming = pages
    .filter((p) => startOf(p) >= today.getTime())
    .sort((a, b) => startOf(a) - startOf(b));
  const past = pages
    .filter((p) => startOf(p) < today.getTime())
    .sort((a, b) => startOf(b) - startOf(a));
  const undated = pages.filter((p) => Number.isNaN(startOf(p)));
  return [...upcoming, ...past, ...undated];
}

export default async function ShortLinksPage() {
  await requireBoardOrAbove();

  const { data, error } = await supabase
    .from("short_links")
    .select(
      "code, target_path, utm_source, utm_medium, utm_campaign, utm_content, utm_term, active, clicks, created_at",
    )
    .order("created_at", { ascending: true });
  const links = (data ?? []) as ShortLinkListItem[];

  const byPath = new Map<string, ShortLinkListItem[]>();
  for (const link of links) {
    byPath.set(link.target_path, [...(byPath.get(link.target_path) ?? []), link]);
  }

  const pages = orderPages(await loadLinkablePages());
  const blogContent = await loadLinkableBlogContent();
  const blogPosts = blogContent.posts;
  // A recap whose page is already in one of the other lists is not shown twice.
  const listed = new Set([...pages, ...blogPosts].map((p) => p.path));
  const recaps = blogContent.recaps.filter((r) => !listed.has(r.path));
  const known = new Set([...listed, ...recaps.map((r) => r.path)]);
  // Pages that have links but are no longer in the lists above (events that
  // are over), so their links stay reachable.
  const earlier: LinkablePage[] = [...byPath.keys()]
    .filter((path) => !known.has(path))
    .map((path) => ({ path, title: humanizePath(path) }));

  const events: PickerEvent[] = [
    ...pages.map((page) => ({
      path: page.path,
      title: page.title,
      dateLabel: dateLabel(page.startsAt),
      group: "current" as const,
    })),
    ...blogPosts.map((post) => {
      const published = dateLabel(post.startsAt);
      return {
        path: post.path,
        title: post.title,
        dateLabel: published ? `Published ${published}` : null,
        group: "blog" as const,
      };
    }),
    ...recaps.map((recap) => ({
      path: recap.path,
      title: recap.title,
      dateLabel: dateLabel(recap.startsAt),
      group: "recap" as const,
    })),
    ...earlier.map((page) => ({
      path: page.path,
      title: page.title,
      dateLabel: null,
      group: "earlier" as const,
    })),
  ];

  return (
    <div className="admin-page">
      <PageHead eyebrow="Marketing" title="Short links" />

      <section className="admin-card admin-section-card">
        <div className="admin-card-title">How to use these links</div>
        <p className="admin-page-sub">
          Paste these links in your posts instead of the long event or blog address.
          Each link opens the event or blog post and records where the visitor came
          from, so we can see which post brought registrations or readers. Each
          place you post has its own link, and the note beside it says where to
          paste it.
        </p>
      </section>

      {error ? (
        <section className="admin-card admin-section-card">
          <p className="admin-page-sub">
            The links table is not available yet (migration 112 pending): {error.message}
          </p>
        </section>
      ) : (
        <>
          <section className="admin-card admin-section-card">
            <EventLinksPicker
              events={events}
              linksByPath={Object.fromEntries(byPath)}
              siteUrl={SITE_URL}
            />
          </section>

          {links.length > 0 && (
            <details
              className="admin-card"
              style={{
                border: "2px solid var(--eo-blue, #3D46F2)",
                background: "rgba(61, 70, 242, 0.06)",
                borderRadius: 12,
                padding: "14px 18px",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 17,
                  fontWeight: 700,
                  color: "var(--eo-blue, #3D46F2)",
                }}
              >
                <span>All links in one list</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  Switch a link on or off · {links.length}{" "}
                  {links.length === 1 ? "link" : "links"} · Click to open
                </span>
              </summary>
              <div className="admin-table-wrap" style={{ marginTop: 12 }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Link</th>
                      <th>Opens</th>
                      <th>Where it is posted</th>
                      <th>Clicks</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...links].reverse().map((link) => (
                      <ShortLinkRow key={link.code} link={link} siteUrl={SITE_URL} />
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
