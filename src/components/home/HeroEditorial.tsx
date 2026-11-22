import { CHAPTER_COUNTRY, CHAPTER_NAME } from "@/kernel/config/chapter";
import Link from "next/link";

export function HeroEditorial() {
  return (
    <section className="hero hero--editorial">
      <div className="hero-bg">
        <img src="/images/hero.jpg" alt="" />
        <div className="hero-bg-grad"></div>
      </div>

      <div className="container hero-inner">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="live-dot"></span>
            <span className="eyebrow eyebrow--on-dark">
              Entrepreneurs&apos; Organization · {CHAPTER_COUNTRY} Chapter
            </span>
          </div>

          <h1 className="hero-headline">
            Scale Your Business
            <br />
            with people who have
            <br />
            <span className="hero-accent">done it before</span>
          </h1>

          <p className="hero-sub">
            {CHAPTER_NAME} is a private community of 7-figure founders learning from each other,
            through Forum, signature events, and access to 20,000 entrepreneurs across 61 countries.
          </p>

          <div className="hero-actions">
            <Link href="/join" className="btn btn--primary btn--lg">
              Apply for membership
              <span className="arrow">→</span>
            </Link>
            <Link href="/about" className="btn btn--ghost-on-dark btn--lg">
              What is EO?
            </Link>
          </div>

          <div className="hero-meta">
            <div className="hero-meta-item">
              <span className="mono hero-meta-num">$1M+</span>
              <span className="hero-meta-label">
                Min. revenue
                <br />
                to qualify
              </span>
            </div>
            <div className="hero-meta-divider"></div>
            <div className="hero-meta-item">
              <span className="mono hero-meta-num">8</span>
              <span className="hero-meta-label">
                Forum mates
                <br />
                per group
              </span>
            </div>
            <div className="hero-meta-divider"></div>
            <div className="hero-meta-item">
              <span className="mono hero-meta-num">100%</span>
              <span className="hero-meta-label">
                Confidential
                <br />
                by oath
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-scroll">
        <span className="micro mono">SCROLL</span>
        <div className="hero-scroll-line"></div>
      </div>
    </section>
  );
}
