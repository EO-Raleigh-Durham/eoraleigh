import { CHAPTER_CITY, CHAPTER_COUNTRY, CHAPTER_NAME } from "@/kernel/config/chapter";
import { getLatestEpisode } from "@/lib/podcast-episodes";
import { EPISODES } from "@/lib/podcast-episodes";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";

export function PodcastFeature() {
  if (EPISODES.length === 0) return null;
  const latest = getLatestEpisode();
  return (
    <section className="section podcast-section">
      <div className="container">
        <div className="podcast-grid">
          <div className="podcast-text">
            <Reveal>
              <span className="eyebrow eyebrow--accent">Seven-figure Founders</span>
              <h2 className="display-3" style={{ marginTop: 12, marginBottom: 20 }}>
                Share your seven-figure playbook
              </h2>
              <p className="lead" style={{ marginBottom: 28 }}>
                Proven growth playbooks and unfiltered stories from {CHAPTER_COUNTRY}&apos;s leading entrepreneurs. Hosted by {CHAPTER_NAME}, recorded in {CHAPTER_CITY}.
              </p>
              <div className="row" style={{ gap: 12 }}>
                <a
                  href={latest.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--dark"
                >
                  ▶ Latest episode
                </a>
                <Link href="/podcast" className="btn btn--ghost">
                  Apply to be a guest
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={120} className="podcast-card">
            <a
              href={latest.url}
              target="_blank"
              rel="noreferrer"
              className="podcast-card-thumb"
            >
              <img src={latest.thumb ?? "/images/podcast.png"} alt="" />
              <div className="podcast-card-play">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
                  <path d="M5 3l13 8-13 8V3z" />
                </svg>
              </div>
              <div className="podcast-card-time mono">{latest.duration}</div>
            </a>
            <div className="podcast-card-body">
              <div className="podcast-card-meta mono">LATEST · {latest.date.toUpperCase()}</div>
              <h3 className="heading-3" style={{ marginTop: 8 }}>
                {latest.title}
              </h3>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
