import Image from "next/image";
import Link from "next/link";
import "@/components/blog/blog-blocks.css";
import { RISE_RECAPS } from "@/content/rise-recaps";

// "More RISE recaps": every RISE recap points readers to the other RISE recaps.
// Shown on all three recap posts (RISE 2 and RISE 4 are not on the same page
// template as RISE 3, so the block is shared here). The list is chapter
// content in src/content/rise-recaps.ts: add one row there and it appears on
// every other recap and drops off its own page.

// True for the slugs that carry the block, so the DB-backed post route can
// decide without importing the list.
export function isRiseRecapSlug(slug: string): boolean {
  return RISE_RECAPS.some((r) => r.slug === slug);
}

// Slim row of links for the top of a recap (inside the hero), so a reader
// does not have to reach the bottom of the page to find the other recaps.
// tone "dark" is for a dark recap hero, "light" for the standard post hero.
export function RiseRecapLinksTop({
  currentSlug,
  tone = "light",
}: {
  currentSlug: string;
  tone?: "light" | "dark";
}) {
  if (!isRiseRecapSlug(currentSlug)) return null;
  const others = RISE_RECAPS.filter((r) => r.slug !== currentSlug);

  return (
    <nav
      className={`rise-recaps-top rise-recaps-top--${tone}`}
      aria-label="More RISE recaps"
    >
      <span className="rise-recaps-top__label">More RISE recaps</span>
      {others.map((r) => (
        <Link key={r.slug} href={`/post/${r.slug}`} className="rise-recaps-top__link">
          {r.label} recap →
        </Link>
      ))}
    </nav>
  );
}

// One line for the middle of a recap: "Also in the RISE series: the RISE 2
// recap and the RISE 4 recap."
export function RiseRecapLinksInline({ currentSlug }: { currentSlug: string }) {
  if (!isRiseRecapSlug(currentSlug)) return null;
  const others = RISE_RECAPS.filter((r) => r.slug !== currentSlug);

  return (
    <aside className="rise-recaps-inline" aria-label="More RISE recaps">
      Also in the RISE series:{" "}
      {others.map((r, i) => (
        <span key={r.slug}>
          {i > 0 ? " and " : ""}the{" "}
          <Link href={`/post/${r.slug}`}>{r.label} recap</Link>
        </span>
      ))}
      .
    </aside>
  );
}

export function RiseRecapLinks({ currentSlug }: { currentSlug: string }) {
  if (!isRiseRecapSlug(currentSlug)) return null;
  const others = RISE_RECAPS.filter((r) => r.slug !== currentSlug);

  return (
    <section className="section section--tight" aria-label="More RISE recaps">
      <div className="container container--narrow">
        <span className="eyebrow eyebrow--accent">More RISE recaps</span>
        {others.map((r) => (
          <Link key={r.slug} href={`/post/${r.slug}`} className="post-event-card">
            <Image
              src={r.image}
              alt=""
              width={336}
              height={224}
              sizes="(max-width: 640px) 100vw, 168px"
              className="post-event-card__img"
            />
            <span className="post-event-card__body">
              <span className="post-event-card__title">{r.title}</span>
              <span className="post-event-card__meta">
                {r.label} · {r.meta}
              </span>
              <span className="post-event-card__cta">Read the {r.label} recap →</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
