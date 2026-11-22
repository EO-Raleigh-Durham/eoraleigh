import { pageMeta } from "@/lib/page-metadata";
import { Reveal } from "@/components/Reveal";
import { SuggestPartnerForm } from "@/components/SuggestPartnerForm";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = pageMeta({
  title: "Suggest a Strategic Alliance Partner",
  description:
    `Know a business that would make a great ${CHAPTER_NAME} Strategic Alliance Partner? Suggest them and our SAP chair will follow up.`,
  path: "/partners/suggest",
});

export default function SuggestPartnerPage() {
  return (
    <div className="sap-suggest-page">
      <section className="section section--hero sap-suggest-hero">
        <div className="container container--text">
          <Reveal>
            <span className="eyebrow eyebrow--accent">
              Strategic Alliance Partners
            </span>
            <h1 className="display-2 sap-suggest-headline">
              Suggest a Strategic Alliance Partner
            </h1>
            <p className="lead text-muted sap-suggest-sub">
              Know a business that would bring real value to {CHAPTER_NAME} members?
              Tell us about them. Our Strategic Alliance Partner chair reviews
              every suggestion and follows up where there is a genuine fit.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container container--text">
          <Reveal>
            <SuggestPartnerForm />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
