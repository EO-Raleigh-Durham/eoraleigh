"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { ChapterPillar } from "@/lib/priorities";

const ACCENTS = ["var(--eo-blue)", "var(--eo-orange)", "var(--eo-green)"];

export function PrioritiesAccordion({ pillars }: { pillars: ChapterPillar[] }) {
  return (
    <div className="ptl-pillars">
      {pillars.map((p, i) => (
        <PillarCard
          key={p.id}
          pillar={p}
          index={i}
          accent={ACCENTS[i % ACCENTS.length]}
        />
      ))}
    </div>
  );
}

function PillarCard({
  pillar,
  index,
  accent,
}: {
  pillar: ChapterPillar;
  index: number;
  accent: string;
}) {
  const [open, setOpen] = useState(false);
  const n = pillar.boardGoals.length;

  return (
    <article
      className="ptl-pillar"
      style={{ ["--pillar-accent" as string]: accent } as CSSProperties}
    >
      <div className="ptl-pillar-head">
        <span className="ptl-pillar-num">{index + 1}</span>
        <div className="ptl-pillar-heading">
          <h2 className="ptl-pillar-title">{pillar.title}</h2>
          {pillar.detail && <p className="ptl-pillar-detail">{pillar.detail}</p>}
        </div>
      </div>

      {n > 0 && (
        <>
          <button
            type="button"
            className="ptl-pillar-toggle"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span
              className={`ptl-chevron ${open ? "is-open" : ""}`.trim()}
              aria-hidden="true"
            >
              ▸
            </span>
            {open ? "Hide board alignment" : `Board alignment · ${n} goal${n === 1 ? "" : "s"}`}
          </button>

          {open && (
            <ul className="ptl-ladder">
              {pillar.boardGoals.map((g) => (
                <li key={g.id} className="ptl-ladder-item">
                  <span className="ptl-ladder-goal">{g.title}</span>
                  <span className="ptl-ladder-owner">
                    {g.roleName} · {g.personName}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  );
}
