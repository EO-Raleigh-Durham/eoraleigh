import type { CSSProperties } from "react";
import type { ChapterStrategy } from "@/entities/org/lib/company/chapter-strategy";

// The designed chapter strategy: who the chapter is, the one thing it
// is not, and the pillars it runs on. Read-only; StrategyEditor wraps it.

// The EO Brand Guidelines primaries, one per pillar in order.
const PILLAR_COLORS = ["var(--eo-blue)", "var(--eo-pink)", "var(--eo-green)", "var(--eo-orange)", "var(--eo-yellow)"];
const STATEMENT_MARKS = ["◆", "◎", "✦", "◈"];

export function ChapterStrategyView({ s }: { s: ChapterStrategy }) {
  const commitments = s.pillars.reduce((n, p) => n + p.items.length, 0);
  return (
    <>
      {s.statements.length > 0 && (
        <section className="u-mb-4" aria-labelledby="strat-who-h">
          <div className="ats-sec-head">
            <div>
              <p className="ats-sec-k">Identity</p>
              <h2 className="ats-sec-h" id="strat-who-h">
                Who we are
              </h2>
            </div>
          </div>
          <div className="eo-strat-ids">
            {s.statements.map((st, i) => (
              <div key={st.label} className="eo-strat-id" style={{ "--tint": PILLAR_COLORS[i % PILLAR_COLORS.length] } as CSSProperties}>
                <span className="eo-strat-id-mark" aria-hidden="true">
                  {STATEMENT_MARKS[i % STATEMENT_MARKS.length]}
                </span>
                <span className="eo-strat-id-label">{st.label}</span>
                <p className="eo-strat-id-body">{st.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {s.notList && (
        <section className="eo-strat-not u-mb-4" aria-label={s.notList.label}>
          <span className="eo-strat-not-label">{s.notList.label}</span>
          {s.notList.items.length > 0 ? (
            <ul className="eo-strat-not-list">
              {s.notList.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="eo-strat-not-body">{s.notList.body}</p>
          )}
        </section>
      )}

      {s.pillars.length > 0 && (
        <section className="u-mb-4" aria-labelledby="strat-pillars-h">
          <div className="ats-sec-head">
            <div>
              <p className="ats-sec-k">{s.pillarsHeading}</p>
              <h2 className="ats-sec-h" id="strat-pillars-h">
                {s.pillars.length} pillars, {commitments} commitments
              </h2>
            </div>
          </div>
          <div className="eo-pillars">
            {s.pillars.map((p, i) => (
              <article key={p.title} className="eo-pillar" style={{ "--tint": PILLAR_COLORS[i % PILLAR_COLORS.length] } as CSSProperties}>
                <header className="eo-pillar-head">
                  <span className="eo-pillar-num">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="eo-pillar-title">{p.title}</h3>
                  <span className="eo-pillar-count">{p.items.length}</span>
                </header>
                <ol className="eo-pillar-list">
                  {p.items.map((c, ci) => (
                    <li key={ci}>
                      {c.label && <b>{c.label}</b>}
                      <span>{c.text}</span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>
      )}

      {s.extras.map((x) => (
        <section key={x.heading} className="admin-card admin-section-card u-mb-4">
          <div className="ats-sec-head">
            <h2 className="ats-sec-h">{x.heading}</h2>
          </div>
          <div className="admin-idea-plan" dangerouslySetInnerHTML={{ __html: x.html }} />
        </section>
      ))}
    </>
  );
}
