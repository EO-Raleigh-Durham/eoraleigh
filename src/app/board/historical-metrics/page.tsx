import Image from "next/image";
import { getAllChapterMetrics } from "@/lib/chapter-metrics";
import { MetricsTable } from "./MetricsTable";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Historical Metrics",
  description: `${CHAPTER_NAME} chapter metrics by fiscal year across past terms.`,
};
export const dynamic = "force-dynamic";

export default async function ChapterMetricsPage() {
  const metrics = await getAllChapterMetrics();

  return (
    <div className="ats">
      <div className="ats-hero eo-strat-hero">
        <p className="ats-k">Chapter · Historical</p>
        <h1 className="ats-h eo-strat-headline">How the chapter has grown</h1>
        <p className="ats-sub">Every board since 2018 and the chapter&apos;s numbers year by year.</p>
      </div>

      <div className="ats-sec-head">
        <div>
          <p className="ats-sec-k">Presidents</p>
          <h2 className="ats-sec-h">Every board and its theme</h2>
        </div>
      </div>
      <figure className="cm-presidents">
        <Image
          src="/images/admin/presidents.webp"
          alt={`${CHAPTER_NAME} presidents timeline, 2018/19 through 2027/28`}
          width={1698}
          height={482}
          priority
          sizes="(max-width: 880px) 100vw, calc(100vw - 240px - 64px)"
        />
        <figcaption>Presidents timeline, with each board&apos;s annual theme</figcaption>
      </figure>

      <div className="ats-sec-head">
        <div>
          <p className="ats-sec-k">Metrics</p>
          <h2 className="ats-sec-h">Year over year</h2>
          <p className="ats-sub">Click any number to edit it; Enter saves. Add year extends the table.</p>
        </div>
      </div>
      <MetricsTable initialMetrics={metrics} />
    </div>
  );
}
