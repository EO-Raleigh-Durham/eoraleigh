import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Reveal } from "@/components/Reveal";
import { BlockRenderer } from "@/components/blog/BlockRenderer";
import "@/components/blog/blog-blocks.css";
import {
  getNewsletterBySlug,
  formatNewsletterDate,
  type Newsletter,
} from "@/lib/newsletters";
import { requireMemberOrAbove } from "@/lib/auth";

type Params = Promise<{ slug: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  await requireMemberOrAbove();
  const { slug } = await params;
  const n = await getNewsletterBySlug(slug);
  if (!n) return { title: "Newsletter not found" };
  return {
    title: n.title,
    description: n.summary ?? undefined,
    // Member newsletters are private: never index, never follow.
    robots: { index: false, follow: false },
  };
}

export default async function PortalNewsletterPage({
  params,
}: {
  params: Params;
}) {
  await requireMemberOrAbove();
  const { slug } = await params;
  const n = await getNewsletterBySlug(slug);
  if (!n || n.status !== "published") notFound();

  return <NewsletterBody n={n} />;
}

function NewsletterBody({ n }: { n: Newsletter }) {
  return (
    <article className="post-page">
      {/* HERO */}
      <section className="section section--tight">
        <div className="container container--text">
          <Reveal>
            <Link
              href="/portal/newsletters"
              className="eyebrow eyebrow--accent"
              style={{ textDecoration: "none" }}
            >
              ← All newsletters
            </Link>
            <div
              className="caption mono"
              style={{
                color: "var(--text-muted)",
                marginTop: 28,
                marginBottom: 16,
              }}
            >
              {formatNewsletterDate(n.sentAt)}
            </div>
            <h1
              className="display-1 post-hero-title"
              style={{ fontSize: "clamp(32px, 4.5vw, 56px)", marginBottom: 20 }}
            >
              {n.title}
            </h1>
            {n.subtitle && (
              <p
                className="lead"
                style={{ color: "var(--text-muted)", maxWidth: 720 }}
              >
                {n.subtitle}
              </p>
            )}
          </Reveal>
        </div>
      </section>

      {/* HERO IMAGE (optional banner) */}
      {n.heroImageUrl && (
        <section className="section section--tight" style={{ paddingTop: 0 }}>
          <div className="container container--text">
            <Reveal>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={n.heroImageUrl}
                alt=""
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              />
            </Reveal>
          </div>
        </section>
      )}

      {/* BODY */}
      <section className="section">
        <div className="container">
          {n.blocks && n.blocks.length > 0 ? (
            <BlockRenderer blocks={n.blocks} />
          ) : (
            <div className="container container--text">
              <p className="lead text-muted">
                This newsletter has no web version yet.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER NAV */}
      <section className="section section--alt">
        <div
          className="container container--text"
          style={{ textAlign: "center" }}
        >
          <Link href="/portal/newsletters" className="btn btn--dark">
            ← Back to all newsletters
          </Link>
        </div>
      </section>
    </article>
  );
}
