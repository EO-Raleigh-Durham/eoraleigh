import { CHAPTER_CHAT_APP, CHAPTER_CHAT_URL, CHAPTER_CONTACT_EMAIL, CHAPTER_COUNTRY, CHAPTER_NAME } from "@/kernel/config/chapter";
import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <div style={{ marginBottom: 20 }}>
              <Logo inverted size="lg" />
            </div>
            <p className="footer-tag">
              A trusted community of entrepreneurs{CHAPTER_COUNTRY ? ` in ${CHAPTER_COUNTRY}` : ""}, part of a global network of 20,000+ founders across 61 countries.
            </p>
            <div className="footer-cta">
              <Link href="/join" className="btn btn--primary">
                Join {CHAPTER_NAME}
              </Link>
              <a href="https://eonetwork.org" target="_blank" rel="noreferrer" className="btn btn--ghost-on-dark">
                Global EO ↗
              </a>
            </div>
          </div>

          <div className="footer-cols">
            <div className="footer-col">
              <div className="footer-col-title">Leadership</div>
              <Link href="/path-of-leadership" className="footer-link">Path of Leadership</Link>
              <Link href="/board-of-directors" className="footer-link">{CHAPTER_NAME} Board</Link>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Membership</div>
              <Link href="/about" className="footer-link">About</Link>
              <Link href="/directory" className="footer-link">Member Directory</Link>
              <Link href="/join" className="footer-link">Join EO</Link>
              <Link href="/partners" className="footer-link">Partners</Link>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Learning</div>
              <Link href="/training" className="footer-link">Training</Link>
              <Link href="/events" className="footer-link">Events</Link>
              <Link href="/blog" className="footer-link">Blog</Link>
              <Link href="/forum" className="footer-link">Forum</Link>
              <Link href="/podcast" className="footer-link">Podcast</Link>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Connect</div>
              {CHAPTER_CHAT_URL && (
                <a href={CHAPTER_CHAT_URL} target="_blank" rel="noreferrer" className="footer-link">{CHAPTER_CHAT_APP || "Chat"}</a>
              )}
              <a href={`mailto:${CHAPTER_CONTACT_EMAIL}`} className="footer-link">Email</a>
              <a href="https://eoapac.com" target="_blank" rel="noreferrer" className="footer-link">EO APAC</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="micro" style={{ color: "var(--text-on-dark-faint)" }}>
            © 2026 {CHAPTER_NAME} · A chapter of Entrepreneurs&apos; Organization
          </span>
          <span className="micro" style={{ color: "var(--text-on-dark-faint)" }}>
            <Link href="/privacy" style={{ color: "inherit", marginRight: 16 }}>
              Privacy
            </Link>
            Designed & built by{" "}
            <a href="https://edge8.ai" target="_blank" rel="noreferrer" style={{ color: "var(--text-on-dark-muted)" }}>
              Edge8.ai
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
