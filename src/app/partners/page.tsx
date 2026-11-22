import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { pageMeta } from "@/lib/page-metadata";
import { CHAPTER_NAME, CHAPTER_PARTNERS_EMAIL } from "@/kernel/config/chapter";
import { SAPS } from "@/content/partners";

export const metadata = pageMeta({
  title: "Strategic Alliance Partners",
  description:
    `${CHAPTER_NAME}'s Strategic Alliance Partners (SAPs): local businesses run by entrepreneurs offering exclusive member benefits across hospitality, food, healthcare, legal, and lifestyle.`,
  path: "/partners",
});

function mark(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3);
}

export default function PartnersPage() {
  return (
    <div className="partners-page">
      {/* HERO */}
      <section className="section section--hero partners-hero">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--accent">Strategic Alliance Partners</span>
            <h1 className="display-1 partners-hero-headline">
              Strategic Partnerships
              <br />
              <span style={{ color: "var(--accent)" }}>Bring Member Benefits</span>
            </h1>
            <p className="lead partners-hero-sub">
              {CHAPTER_NAME} Strategic Alliance Partners are local businesses, mostly run by founders themselves, offering exclusive benefits to chapter members across hospitality, food, healthcare, legal services, and lifestyle.
            </p>
          </Reveal>
        </div>
      </section>

      {/* SAP GRID */}
      <section className="section section--alt">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--accent">Member benefits</span>
            <h2 className="display-3" style={{ marginTop: 12, marginBottom: 16, maxWidth: 800 }}>
              {SAPS.length} partners. Real discounts. Member-only.
            </h2>
            <p className="lead text-muted" style={{ marginBottom: 56, maxWidth: 720 }}>
              Each Strategic Alliance Partner offers a tangible benefit you can use. Most are themselves run by EO members and member-affiliated companies.
            </p>
          </Reveal>

          <div className="partners-grid partners-grid--local">
            {SAPS.map((p, i) => (
              <Reveal key={p.name} delay={i * 40} className="partner-card">
                <div className="partner-card-mark">
                  <span className="mono">{mark(p.name)}</span>
                </div>
                <div className="partner-card-body">
                  <h3 className="partner-card-name">{p.name}</h3>
                  <p className="body-sm text-muted" style={{ marginTop: 12 }}>{p.benefit}</p>
                  <div className="partner-card-meta mono" style={{ marginTop: 16 }}>
                    <span>{p.contact}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section section--dark">
        <div className="container container--text" style={{ textAlign: "center" }}>
          <Reveal>
            <span className="eyebrow eyebrow--on-dark">Become a Strategic Alliance Partner</span>
            <h2 className="display-2" style={{ marginTop: 16, marginBottom: 24, color: "#fff" }}>
              Let us hear what you have in mind
            </h2>
            <p
              className="lead"
              style={{
                color: "var(--text-on-dark-muted)",
                marginBottom: 32,
                maxWidth: 580,
                margin: "0 auto 32px",
              }}
            >
              SAP inquiries go to the chapter Strategic Alliance Partner chair. We respond within five business days and only partner where there is genuine member value.
            </p>
            <a href={`mailto:${CHAPTER_PARTNERS_EMAIL}`} className="btn btn--primary btn--lg">
              {CHAPTER_PARTNERS_EMAIL}
            </a>
            <p
              className="body-sm"
              style={{
                color: "var(--text-on-dark-muted)",
                margin: "32px auto 16px",
              }}
            >
              Are you a member? Suggest a business you think would make a great partner.
            </p>
            <Link
              href="/partners/suggest"
              className="btn btn--ghost-on-dark btn--lg"
            >
              Suggest a partner
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
