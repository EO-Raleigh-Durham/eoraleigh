import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { pageMeta } from "@/lib/page-metadata";
import {
  PRIVACY_LAST_UPDATED,
  PRIVACY_LEAD,
  PRIVACY_META_DESCRIPTION,
  PrivacyPolicyArticle,
} from "@/content/privacy-policy";

export const metadata = pageMeta({
  title: "Privacy policy",
  description: PRIVACY_META_DESCRIPTION,
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div>
      <section className="page-hero page-hero--light">
        <div className="container container--text">
          <Reveal>
            <span className="eyebrow eyebrow--accent">Privacy policy</span>
            <h1 className="display-2" style={{ marginTop: 16, marginBottom: 24 }}>
              How we handle your data
            </h1>
            <p className="lead">
              {PRIVACY_LEAD}
            </p>
            <p className="micro mono" style={{ color: "var(--text-muted)", marginTop: 24 }}>
              Last updated: {PRIVACY_LAST_UPDATED.toUpperCase()}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--text">
          <PrivacyPolicyArticle />

          <div style={{ marginTop: 56, paddingTop: 32, borderTop: "1px solid var(--border)", textAlign: "center" }}>
            <Link href="/" className="btn btn--ghost">
              ← Back to home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
