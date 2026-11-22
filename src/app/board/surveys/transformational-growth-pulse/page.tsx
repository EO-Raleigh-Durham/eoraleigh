import { PulseDashboard } from "./PulseDashboard";
import { loadPulseDashboard, type PulseRange } from "@/lib/pulse";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Transformational Growth Pulse",
  description: `Results of the Transformational Growth Pulse survey across ${CHAPTER_NAME} members.`,
};

export const dynamic = "force-dynamic";

export default async function PulsePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rawRange } = await searchParams;
  const range: PulseRange =
    rawRange === "fy" || rawRange === "last-fy" || rawRange === "12m"
      ? rawRange
      : "all";
  const data = await loadPulseDashboard(range);

  if (!data) {
    return (
      <div>
        <div className="admin-page-head">
          <div className="admin-eyebrow">Surveys</div>
          <h1 className="admin-page-title">Transformational Growth Pulse</h1>
        </div>
        <div className="admin-stub">
          <strong>No data available</strong>
          The Pulse survey row or responses are missing in Supabase. Apply migration 004_surveys.sql and run scripts/import-pulse-csv.mjs.
        </div>
      </div>
    );
  }

  return <PulseDashboard data={data} />;
}
