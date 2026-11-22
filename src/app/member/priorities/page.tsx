import type { Metadata } from "next";
import { getPrioritySet } from "@/lib/priorities";
import { PrioritiesAccordion } from "./PrioritiesAccordion";
import { requireMemberOrAbove } from "@/lib/auth";

export const metadata: Metadata = { title: "Chapter priorities" };
export const dynamic = "force-dynamic";

export default async function PortalPrioritiesPage() {
  await requireMemberOrAbove();
  const { fyLabel, pillars } = await getPrioritySet();

  return (
    <section className="section">
      <div className="container">
        <span className="eyebrow eyebrow--accent">
          {fyLabel ? `Chapter priorities · ${fyLabel}` : "Chapter priorities"}
        </span>
        <h1 className="display-3" style={{ marginTop: 12, marginBottom: 8 }}>
          What the board is focused on
        </h1>
        <p
          className="lead text-muted"
          style={{ marginBottom: 40, maxWidth: 640 }}
        >
          Three chapter priorities for the year. Expand any one to see the board
          goals that ladder up to it.
        </p>

        {pillars.length === 0 ? (
          <p className="text-muted">
            The board has not published priorities yet. Check back soon.
          </p>
        ) : (
          <PrioritiesAccordion pillars={pillars} />
        )}
      </div>
    </section>
  );
}
