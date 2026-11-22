import type { Metadata } from "next";
import { requireBoardOrAbove } from "@/lib/auth";
import {
  loadRegistrationPlatforms,
  parsePlatformRange,
  platformRangeSince,
  type PlatformRange,
} from "@/lib/board-registration-platforms";
import { UNTAGGED, summarisePlatforms } from "@/lib/registration-platforms";
import { PageHead } from "@/kernel/ui/PageHead";
import { MetricCard } from "@/kernel/ui/MetricCard";
import { BarChart } from "@/kernel/ui/charts/BarChart";

export const metadata: Metadata = {
  title: "Registrations by platform",
  description: "Which platform each event registration came from.",
};
export const dynamic = "force-dynamic";

const RANGES: { key: PlatformRange; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "all", label: "All time" },
];

type SearchParams = Promise<{ range?: string | string[] }>;

export default async function RegistrationsByPlatformPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireBoardOrAbove();
  const raw = (await searchParams).range;
  const range = parsePlatformRange(Array.isArray(raw) ? raw[0] : raw);
  const rangeLabel = RANGES.find((r) => r.key === range)?.label.toLowerCase() ?? "";

  const load = await loadRegistrationPlatforms(platformRangeSince(range));
  const summary = summarisePlatforms(load.rows);
  const untagged = summary.total - summary.tagged;

  return (
    <div>
      <PageHead
        eyebrow="Marketing"
        title="Registrations by platform"
        sub="Where event registrations came from, read from the tag on the link (utm_source) or, when a link has no tag, from the page the person came from. Cancelled registrations are left out."
      />

      <p className="admin-page-sub">
        {RANGES.map((r, i) => (
          <span key={r.key}>
            {i > 0 && " · "}
            {r.key === range ? (
              <strong>{r.label}</strong>
            ) : (
              <a href={`/board/marketing/registrations?range=${r.key}`}>{r.label}</a>
            )}
          </span>
        ))}
      </p>

      {!load.available ? (
        <p className="admin-page-sub">
          Source tracking is not switched on in this database yet: migration 109 has not been
          applied, so there is nothing to count.
        </p>
      ) : (
        <>
          <div className="admin-kpi-grid">
            <MetricCard
              label="Registrations"
              value={summary.total}
              sub={`in ${rangeLabel}`}
            />
            <MetricCard
              label="With a platform"
              value={summary.tagged}
              sub={
                summary.total === 0
                  ? undefined
                  : `${Math.round((summary.tagged / summary.total) * 100)}% of registrations`
              }
            />
            <MetricCard
              label={UNTAGGED}
              value={untagged}
              sub="link had no tag and no known referrer"
            />
          </div>

          <section className="admin-card admin-section-card">
            <div className="admin-card-title">By platform</div>
            <BarChart
              data={summary.byPlatform.map((p) => ({ label: p.label, value: p.count }))}
              ariaLabel="Registrations by platform"
              emptyText="No registrations in this range."
              stacked
            />
          </section>

          <section className="admin-card admin-section-card">
            <div className="admin-card-title">By post</div>
          {summary.byPost.length === 0 ? (
            <p className="admin-page-sub">
              No registration in this range came from a link with a campaign or post tag
              (utm_campaign, utm_content).
            </p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Campaign</th>
                    <th>Post</th>
                    <th>Registrations</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byPost.map((p) => (
                    <tr key={`${p.platform}|${p.campaign}|${p.post}`}>
                      <td>{p.platform}</td>
                      <td>{p.campaign ?? "—"}</td>
                      <td>{p.post ?? "—"}</td>
                      <td>{p.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </section>
        </>
      )}
    </div>
  );
}
