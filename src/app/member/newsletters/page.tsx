import Link from "next/link";
import type { Metadata } from "next";
import { getNewsletters, formatNewsletterDate } from "@/lib/newsletters";
import { requireMemberOrAbove } from "@/lib/auth";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata: Metadata = { title: "Newsletters" };
export const dynamic = "force-dynamic";

export default async function PortalNewslettersPage() {
  await requireMemberOrAbove();
  const newsletters = await getNewsletters();

  return (
    <section className="section">
      <div className="container container--text">
        <span className="eyebrow eyebrow--accent">Newsletters</span>
        <h1 className="display-3" style={{ marginTop: 12, marginBottom: 8 }}>
          Member newsletter archive
        </h1>
        <p className="lead text-muted" style={{ marginBottom: 40 }}>
          Every issue sent to {CHAPTER_NAME} members. Open any one to read the full
          web version.
        </p>

        {newsletters.length === 0 ? (
          <p className="text-muted">
            No newsletters have been published yet. The first issue will appear
            here once it is sent.
          </p>
        ) : (
          <ul className="ptl-news-list">
            {newsletters.map((n) => {
              // Hosted on-site (has blocks) -> internal page. Otherwise link to
              // the external Brevo/HubSpot-hosted version.
              const hosted = !!n.blocks && n.blocks.length > 0;
              const inner = (
                <>
                  <span className="ptl-news-date">
                    {formatNewsletterDate(n.sentAt)}
                  </span>
                  <span className="ptl-news-title">{n.title}</span>
                  {n.summary && (
                    <span className="ptl-news-summary">{n.summary}</span>
                  )}
                  <span className="ptl-news-go" aria-hidden="true">
                    Read issue →
                  </span>
                </>
              );
              return (
                <li key={n.id}>
                  {hosted ? (
                    <Link
                      href={`/member/newsletters/${n.slug}`}
                      className="ptl-news-item"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <a
                      href={n.brevoUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ptl-news-item"
                    >
                      {inner}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
