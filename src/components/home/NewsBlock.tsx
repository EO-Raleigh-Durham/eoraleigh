import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { HOME_NEWS_STORY } from "@/content/home";

export function NewsBlock() {
  const story = HOME_NEWS_STORY;
  if (!story) return null;
  return (
    <section className="section section--warm">
      <div className="container">
        <div className="news-grid">
          <div className="news-image">
            <Reveal>
              <img src={story.image} alt={story.imageAlt} />
            </Reveal>
          </div>
          <div className="news-text">
            <Reveal delay={120}>
              <span className="eyebrow eyebrow--accent">Members in the news</span>
              <h2 className="display-3" style={{ marginTop: 12, marginBottom: 20 }}>
                {story.title}
              </h2>
              <p className="lead" style={{ marginBottom: 24 }}>
                {story.leadBefore}<strong>{story.leadName}</strong>{story.leadAfter}
              </p>
              <p className="body" style={{ color: "var(--text-muted)", marginBottom: 24 }}>
                {story.body}
              </p>
              <Link href={story.href} className="btn btn--dark">
                Read the story <span className="arrow">→</span>
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
