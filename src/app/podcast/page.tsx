import { EPISODES } from "@/lib/podcast-episodes";
import { Reveal } from "@/components/Reveal";
import { PodcastGuestForm } from "@/components/PodcastGuestForm";
import { pageMeta } from "@/lib/page-metadata";
import { CHAPTER_PLACE, CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = pageMeta({
  title: "Podcast, Seven-Figure Founders",
  description:
    `${CHAPTER_PLACE}'s leading entrepreneurs, in their own words. Proven growth playbooks and unfiltered stories from the founders building ${CHAPTER_PLACE}.`,
  path: "/podcast",
});

export default function PodcastPage() {
  const featured = EPISODES[0];
  const rest = EPISODES.slice(1);

  return (
    <div className="podcast-page">
      {/* FEATURED EPISODE HERO */}
      {featured && (
        <section className="section section--hero podcast-hero">
          <div className="container">
            <div className="podcast-hero-grid">
              <Reveal className="podcast-hero-text">
                <span className="eyebrow eyebrow--accent">Seven-Figure Founders</span>
                <h1 className="display-2 podcast-hero-title">
                  {CHAPTER_PLACE}&apos;s leading entrepreneurs,
                  <br />
                  in their own words
                </h1>
                <p className="lead podcast-hero-sub">
                  Proven growth playbooks and unfiltered stories from the founders who have built and scaled {CHAPTER_PLACE}&apos;s most interesting companies. Hosted by {CHAPTER_NAME}.
                </p>
                <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
                  <a href={featured.url} target="_blank" rel="noreferrer" className="btn btn--dark">
                    ▶ Latest episode
                  </a>
                  <a href="#apply" className="btn btn--ghost">
                    Apply to be a guest
                  </a>
                </div>
              </Reveal>

              <Reveal delay={120} className="podcast-hero-card">
                <a href={featured.url} target="_blank" rel="noreferrer" className="podcast-hero-thumb">
                  {featured.thumb && <img src={featured.thumb} alt="" />}
                  <div className="podcast-hero-play">
                    <svg width="28" height="28" viewBox="0 0 22 22" fill="currentColor">
                      <path d="M5 3l13 8-13 8V3z" />
                    </svg>
                  </div>
                  <div className="podcast-hero-time mono">{featured.duration}</div>
                </a>
                <div className="podcast-hero-card-body">
                  <div className="podcast-hero-card-meta mono">
                    EP {featured.ep} · {featured.date.toUpperCase()}
                  </div>
                  <h3 className="heading-2" style={{ marginTop: 8, marginBottom: 8 }}>
                    {featured.title}
                  </h3>
                  <div className="caption text-muted">{featured.guest}</div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* EPISODE GRID */}
      {rest.length > 0 && (
        <section className="section section--alt">
          <div className="container">
            <Reveal>
              <span className="eyebrow eyebrow--accent">All episodes</span>
              <h2 className="display-3" style={{ marginTop: 12, marginBottom: 40 }}>
                The archive
              </h2>
            </Reveal>

            <div className="episode-grid">
              {rest.map((e, i) => (
                <Reveal key={e.ep} delay={i * 40} className="episode-card">
                  <div className="episode-thumb">
                    {e.thumb ? (
                      <img src={e.thumb} alt="" />
                    ) : (
                      <div className="episode-thumb-placeholder mono">EP {e.ep}</div>
                    )}
                    <div className="episode-thumb-play">
                      <svg width="20" height="20" viewBox="0 0 22 22" fill="currentColor">
                        <path d="M5 3l13 8-13 8V3z" />
                      </svg>
                    </div>
                    <div className="episode-thumb-time mono">{e.duration}</div>
                  </div>
                  <div className="episode-body">
                    <div className="episode-meta mono">
                      EP {e.ep} · {e.date.toUpperCase()}
                    </div>
                    <h3 className="episode-title">{e.title}</h3>
                    <div className="episode-guest">{e.guest}</div>
                    <div className="episode-tags">
                      {e.tags.map((t) => (
                        <span key={t} className="episode-tag mono">{t}</span>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* APPLY TO BE A GUEST */}
      <section id="apply" className="section section--dark podcast-apply">
        <div className="container">
          <div className="podcast-apply-grid">
            <Reveal>
              <span className="eyebrow eyebrow--on-dark">Be on the show</span>
              <h2 className="display-2" style={{ marginTop: 16, marginBottom: 24, color: "#fff" }}>
                Share your seven-figure playbook
              </h2>
              <p className="lead" style={{ color: "var(--text-on-dark-muted)", marginBottom: 24 }}>
                We interview founders running 7-figure businesses in {CHAPTER_PLACE}. The bar is high: real numbers, real lessons, no PR speak. If you have a story other founders need to hear, we want it on the record.
              </p>
              <ul className="podcast-criteria">
                <li>Be the founder, co-founder, or majority owner of a business</li>
                <li>Have a business generating over US$1 million in annual revenue</li>
                <li>Be based in {CHAPTER_PLACE} and actively leading your company</li>
              </ul>
            </Reveal>

            <PodcastGuestForm />
          </div>
        </div>
      </section>
    </div>
  );
}
