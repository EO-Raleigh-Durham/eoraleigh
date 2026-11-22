import { verifyUnsubscribeToken } from "@/entities/campaigns";
import { pageMeta } from "@/lib/page-metadata";
import { UnsubscribeForm } from "./UnsubscribeForm";
import { CHAPTER_DOMAIN, CHAPTER_NAME } from "@/kernel/config/chapter";

// This app's version of edge8-web's unsubscribe page (entities/site/routes/
// unsubscribe), on EO's public page layout. The link in every marketing email
// lands here with a signed token; the button posts it to /api/unsubscribe.

const CONTACT_EMAIL = `president@${CHAPTER_DOMAIN}`;

export const metadata = {
  ...pageMeta({
    title: "Unsubscribe",
    description: `Stop receiving marketing email from ${CHAPTER_NAME}.`,
    path: "/unsubscribe",
  }),
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage(props: { searchParams: Promise<{ token?: string | string[] }> }) {
  const searchParams = await props.searchParams;
  const raw = searchParams.token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  const personId = token ? verifyUnsubscribeToken(token) : null;

  return (
    <div>
      <section className="page-hero page-hero--light">
        <div className="container container--text">
          <span className="eyebrow eyebrow--accent">Email preferences</span>
          <h1 className="display-2" style={{ marginTop: 16, marginBottom: 24 }}>
            Unsubscribe
          </h1>
          <p className="lead">Manage the marketing email you receive from {CHAPTER_NAME}.</p>
        </div>
      </section>

      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--text">
          <article className="legal-prose">
            {personId && token ? (
              <UnsubscribeForm token={token} contactEmail={CONTACT_EMAIL} />
            ) : (
              <>
                <h2>This link did not work</h2>
                <p>
                  This unsubscribe link is missing or is no longer valid. Email{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will remove you from the list by hand.
                </p>
              </>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
