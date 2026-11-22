import { SurfaceLink as Link } from "@/kernel/shell/SurfaceLink";
import type { Metadata } from "next";
import { PageHead } from "@/kernel/ui/PageHead";
import { CHAPTER_NAME } from "@/kernel/config/chapter";
import { requirePermission } from "@/kernel/identity/access-request";
import { listEntries, listBrands, listPillars, getPillarPerformance } from "@/entities/campaigns/lib/marketing-calendar";
import { listCampaignOptions } from "@/entities/campaigns/lib/marketing-campaigns";
import { listBrandProfiles } from "@/entities/campaigns/lib/brand-profiles";
import { CalendarClient } from "./CalendarClient";
import type { CalendarEntryRow } from "@/entities/campaigns/lib/marketing-calendar-shared";

// A post already live on the public site, shown as a read-only Published card.
export type SitePost = { title: string; href: string; date: string };
export const SITE_POST_PREFIX = "site:";

function sitePostEntries(posts: SitePost[], rows: CalendarEntryRow[]): CalendarEntryRow[] {
  const planned = new Set(rows.map((r) => r.postedUrl).filter(Boolean));
  return posts
    .filter((p) => !planned.has(p.href) && ![...planned].some((u) => u?.endsWith(p.href)))
    .map((p) => ({
      id: `${SITE_POST_PREFIX}${p.href}`,
      title: p.title,
      brandId: null,
      brandName: CHAPTER_NAME,
      pillarId: null,
      pillarName: null,
      channel: "blog",
      status: "published",
      publishDate: p.date.slice(0, 10),
      parentId: null,
      broadcastId: null,
      broadcastStatus: null,
      campaignId: null,
      campaignName: null,
      copyMd: null,
      assetUrl: null,
      postedUrl: p.href,
      notes: null,
      blogStyle: null,
      socialStyle: null,
      imageStyle: null,
      imageType: null,
      seoMd: null,
      imageBriefMd: null,
      imageUrl: null,
      bodyHtml: null,
      sortOrder: 0,
      createdAt: p.date,
    }));
}

export const metadata: Metadata = {
  title: "Marketing calendar",
  description: "Plan content across blog, email, LinkedIn, and Facebook.",
};

export default async function MarketingCalendarPage() {
  return <MarketingCalendar />;
}

export async function MarketingCalendar({ sitePosts = [] }: { sitePosts?: SitePost[] }) {
  await requirePermission("campaigns.marketing");
  const [{ rows, error }, brands, pillars, performance, profiles, campaigns] = await Promise.all([
    listEntries(),
    listBrands(),
    listPillars(),
    getPillarPerformance(),
    listBrandProfiles(),
    listCampaignOptions(),
  ]);
  const stylePrefs = profiles.map((p) => ({
    brandId: p.brandId,
    blog: p.preferredBlogTypes,
    image: p.preferredImageStyles,
    social: p.preferredSocialStyles,
  }));

  return (
    <div>
      <PageHead
        eyebrow={<Link href="/board/marketing">Marketing</Link>}
        title="Calendar"
        sub="One plan across blog, email, LinkedIn, and Facebook. Email entries can spawn a real campaign."
      />

      {error && (
        <div className="admin-alert admin-alert--err u-mb-4">
          {error}
        </div>
      )}

      {performance.length > 0 && (
        <section className="admin-card admin-section-card">
          <div className="admin-card-title">Performance by pillar</div>
          <div className="admin-table-wrap u-mt-3">
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Pillar</th>
                    <th>Campaigns</th>
                    <th>Sent</th>
                    <th>Delivered</th>
                    <th>Opened</th>
                    <th>Clicked</th>
                    <th>Click rate</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((p) => (
                    <tr key={p.pillar}>
                      <td className="admin-cell-strong">{p.pillar}</td>
                      <td className="admin-cell-mono">{p.campaigns}</td>
                      <td className="admin-cell-mono">{p.sent.toLocaleString()}</td>
                      <td className="admin-cell-mono">{p.delivered.toLocaleString()}</td>
                      <td className="admin-cell-mono">{p.opened.toLocaleString()}</td>
                      <td className="admin-cell-mono">{p.clicked.toLocaleString()}</td>
                      <td className="admin-cell-mono">
                        {p.delivered > 0 ? `${Math.round((p.clicked / p.delivered) * 100)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <CalendarClient
        initialEntries={[...rows, ...sitePostEntries(sitePosts, rows)]}
        brands={brands}
        initialPillars={pillars}
        stylePrefs={stylePrefs}
        campaigns={campaigns}
      />
    </div>
  );
}
