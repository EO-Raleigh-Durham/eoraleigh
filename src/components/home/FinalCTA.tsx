import { CHAPTER_NAME } from "@/kernel/config/chapter";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";

export function FinalCTA() {
  return (
    <section className="section section--darker final-cta-section">
      <div className="container">
        <Reveal className="final-cta">
          <span className="eyebrow eyebrow--on-dark">Ready when you are</span>
          <h2 className="display-2" style={{ color: "#fff", marginTop: 20, marginBottom: 24, maxWidth: 880 }}>
            Don&apos;t build alone
            <br />
            <span style={{ color: "var(--accent)" }}>Apply to {CHAPTER_NAME}</span>
          </h2>
          <p className="lead" style={{ color: "var(--text-on-dark-muted)", marginBottom: 36, maxWidth: 540 }}>
            Membership is by application. We review every one personally. Most decisions take less than two weeks.
          </p>
          <div className="row" style={{ gap: 14 }}>
            <Link href="/join" className="btn btn--primary btn--lg">
              Start your application <span className="arrow">→</span>
            </Link>
            <Link href="/about" className="btn btn--ghost-on-dark btn--lg">
              First, tell me more
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
