import { requirePermission } from "@/kernel/identity/access-request";
import { companyOs } from "@/kernel/data/supabase";
import { StrategyEditor } from "@/entities/org/routes/admin/(dashboard)/company/strategy/StrategyEditor";
import type { StrategyRow } from "@/entities/org/lib/company/edges-shared";
import { ChapterStrategyView } from "./ChapterStrategyView";
import { parseChapterStrategy } from "@/entities/org/lib/company/chapter-strategy";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Strategy",
  description: `The chapter strategy: who ${CHAPTER_NAME} is, what it is not, and the pillars the board runs on this year.`,
};

export const dynamic = "force-dynamic";

// The chapter strategy at /board/strategy, drawn in edge8-web's
// Company section design (the headline band and reading scale of
// talent-ats.css). Same row and same editor as edge8's strategy screen; the
// view is EO's own, built for the chapter's identity statements and pillars.
export default async function BoardStrategyPage() {
  await requirePermission("org.company");

  const res = await companyOs
    .from("strategies")
    .select("id, year, title, body_md")
    .order("year", { ascending: false })
    .limit(1);
  const strategy = (res.data?.[0] as StrategyRow | undefined) ?? null;

  if (!strategy) {
    return (
      <div className="ats">
        <div className="ats-hero">
          <p className="ats-k">Chapter · Strategy</p>
          <h1 className="ats-h">No strategy yet</h1>
        </div>
        <div className="admin-empty">No strategy row exists yet. Seed one, then edit it here.</div>
      </div>
    );
  }

  const parsed = await parseChapterStrategy(strategy.body_md ?? "");
  const theme = parsed.themes.find((t) => t.year === strategy.year) ?? parsed.themes[0] ?? null;
  const headline = (parsed.overview ?? strategy.title).replace(/\.\s*$/, "");

  return (
    <div className="ats">
      <div className="ats-hero eo-strat-hero">
        <p className="ats-k">Chapter · Strategy {strategy.year}</p>
        <h1 className="ats-h eo-strat-headline">{headline}</h1>
        {theme && (
          <p className="ats-sub">
            This year&apos;s theme: <b>{theme.title}</b>
          </p>
        )}
        {parsed.pillars.length > 0 && (
          <ul className="ats-chips">
            {parsed.pillars.map((p) => (
              <li key={p.title} className="ats-chip">
                {p.title}
              </li>
            ))}
          </ul>
        )}
      </div>

      <StrategyEditor id={strategy.id} initialTitle={strategy.title} initialBody={strategy.body_md ?? ""}>
        <ChapterStrategyView s={parsed} />
      </StrategyEditor>
    </div>
  );
}
