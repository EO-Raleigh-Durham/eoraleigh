import Link from "next/link";
import { getAllSeoEntries, summarizeHealth } from "@/lib/seo-overview";
import { SeoTable } from "./SeoTable";
import { CHAPTER_DOMAIN } from "@/kernel/config/chapter";

export const metadata = {
  title: "SEO overview",
  description: `Search health of every page on ${CHAPTER_DOMAIN}: titles, descriptions, and issues.`,
};
export const dynamic = "force-dynamic";

export default async function SeoOverviewPage() {
  const entries = await getAllSeoEntries();
  const health = summarizeHealth(entries);

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">SEO</div>
        <h1 className="admin-page-title">SEO overview</h1>
        <p className="admin-page-sub">
          Every public page on the site, with its primary keyword, title, description, and OG share image. Use this to spot gaps before they cost ranking. Pages without their own OG image fall back to the site default, so they still share a card, just a generic one. A purpose-built image per page lifts click-through on shared links.
        </p>
        <div style={{ marginTop: 16 }}>
          <Link href="/board/seo/suggested-fixes" className="admin-link-action">
            View suggested fixes →
          </Link>
        </div>
      </div>

      <div className="seo-health-grid">
        <HealthStat label="Total entries" value={health.total} tone="ok" />
        <HealthStat
          label="Missing title"
          value={health.missingTitle}
          tone={health.missingTitle === 0 ? "ok" : "warn"}
        />
        <HealthStat
          label="Missing description"
          value={health.missingDescription}
          tone={health.missingDescription === 0 ? "ok" : "warn"}
        />
        <HealthStat
          label="No custom OG image"
          value={health.missingOgImage}
          tone={health.missingOgImage === 0 ? "ok" : "warn"}
          subtitle="(falls back to site default)"
        />
        <HealthStat
          label="Missing primary keyword"
          value={health.missingPrimaryKeyword}
          tone={health.missingPrimaryKeyword === 0 ? "ok" : "warn"}
          subtitle="(blogs + events)"
        />
      </div>

      <SeoTable entries={entries} />
    </div>
  );
}

function HealthStat({
  label,
  value,
  tone,
  subtitle,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn";
  subtitle?: string;
}) {
  return (
    <div className={`seo-health seo-health--${tone}`}>
      <div className="seo-health-val">{value}</div>
      <div className="seo-health-label">{label}</div>
      {subtitle && <div className="seo-health-sub">{subtitle}</div>}
    </div>
  );
}
