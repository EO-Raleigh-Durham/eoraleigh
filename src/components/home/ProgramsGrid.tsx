import { CHAPTER_COUNTRY } from "@/kernel/config/chapter";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { HOME_OUTDOOR_COPY } from "@/content/home";

export function ProgramsGrid() {
  return (
    <section className="section section--alt">
      <div className="container">
        <Reveal className="programs-head">
          <span className="eyebrow eyebrow--accent">Global learning, local growth</span>
          <h2 className="display-3" style={{ marginTop: 12, maxWidth: 720 }}>
            Eight ways the membership pays you back, every month
          </h2>
        </Reveal>

        <div className="programs-bento">
          <Reveal className="bento bento--lg">
            <div className="bento-mark"><span className="mono">01</span></div>
            <h3 className="heading-2">Forum</h3>
            <p className="body" style={{ color: "var(--text-muted)", marginTop: 8 }}>
              Eight peers. Strict confidentiality. The unfiltered conversation about your business, marriage, and mind that you can&apos;t have anywhere else.
            </p>
            <div className="bento-art bento-art--forum">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <span
                  key={i}
                  className="forum-dot"
                  style={{ animationDelay: i * 120 + "ms" }}
                ></span>
              ))}
            </div>
            <Link href="/forum" className="bento-link">
              How Forum works <span className="arrow">→</span>
            </Link>
          </Reveal>

          <Reveal delay={80} className="bento">
            <div className="bento-mark"><span className="mono">02</span></div>
            <h3 className="heading-2">Executive programs</h3>
            <p className="body" style={{ color: "var(--text-muted)", marginTop: 8 }}>
              Multi-day immersive programs at Harvard, Wharton, INSEAD, and Oxford, designed for second-stage growth.
            </p>
            <Link href="/training" className="bento-link">
              Programs <span className="arrow">→</span>
            </Link>
          </Reveal>

          <Reveal delay={160} className="bento bento--dark">
            <div className="bento-mark mono" style={{ color: "var(--text-on-dark-muted)" }}>03</div>
            <h3 className="heading-2" style={{ color: "#fff" }}>Signature events</h3>
            <p className="body" style={{ color: "var(--text-on-dark-muted)", marginTop: 8 }}>
              Monthly learning events with operators who&apos;ve done it. No theory. No keynote-stage pablum.
            </p>
            <Link href="/events" className="bento-link bento-link--on-dark">
              All events <span className="arrow">→</span>
            </Link>
          </Reveal>

          <Reveal delay={240} className="bento">
            <div className="bento-mark"><span className="mono">04</span></div>
            <h3 className="heading-2">Global passport</h3>
            <p className="body" style={{ color: "var(--text-muted)", marginTop: 8 }}>
              Show up at any of 226 chapters worldwide. Same handshake, same rules of engagement.
            </p>
            <Link href="/about" className="bento-link">
              226 chapters <span className="arrow">→</span>
            </Link>
          </Reveal>

          <Reveal delay={320} className="bento bento--accent">
            <div className="bento-mark mono" style={{ color: "rgba(255,255,255,0.7)" }}>05</div>
            <h3 className="heading-2" style={{ color: "#fff" }}>Path of Leadership</h3>
            <p className="body" style={{ color: "rgba(255,255,255,0.85)", marginTop: 8 }}>
              An eight-step ladder from new member to global leader. We&apos;ll show you the way up.
            </p>
            <Link href="/path-of-leadership" className="bento-link bento-link--on-dark">
              See the path <span className="arrow">→</span>
            </Link>
          </Reveal>

          <Reveal delay={400} className="bento">
            <div className="bento-mark"><span className="mono">06</span></div>
            <h3 className="heading-2">Podcast</h3>
            <p className="body" style={{ color: "var(--text-muted)", marginTop: 8 }}>
              Seven-figure playbooks from {CHAPTER_COUNTRY}&apos;s leading entrepreneurs, recorded weekly.
            </p>
            <Link href="/podcast" className="bento-link">
              Listen <span className="arrow">→</span>
            </Link>
          </Reveal>

          <Reveal delay={480} className="bento">
            <div className="bento-mark"><span className="mono">07</span></div>
            <h3 className="heading-2">Outdoor activities</h3>
            <p className="body" style={{ color: "var(--text-muted)", marginTop: 8 }}>
              {HOME_OUTDOOR_COPY}
            </p>
            <Link href="/events" className="bento-link">
              Adventures <span className="arrow">→</span>
            </Link>
          </Reveal>

          <Reveal delay={560} className="bento">
            <div className="bento-mark"><span className="mono">08</span></div>
            <h3 className="heading-2">Vibrant socials</h3>
            <p className="body" style={{ color: "var(--text-muted)", marginTop: 8 }}>
              Long dinners, family weekends, partner trips. The kind of community that shows up when business gets quiet.
            </p>
            <Link href="/events" className="bento-link">
              See what&apos;s on <span className="arrow">→</span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
