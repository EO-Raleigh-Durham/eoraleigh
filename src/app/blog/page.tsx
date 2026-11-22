import { Reveal } from "@/components/Reveal";
import { pageMeta } from "@/lib/page-metadata";
import { BlogIndex } from "./BlogIndex";
import { BlogUpcomingEvents } from "@/components/blog/BlogUpcomingEvents";
import { getBlogIndexData } from "./blog-index-data";
import { CHAPTER_PLACE, CHAPTER_DOMAIN, CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = pageMeta({
  title: "Blog · Stories & playbooks",
  description:
    `Stories, playbooks, and lessons from ${CHAPTER_NAME} members. No thought leadership, no SEO bait, just real founders writing about what they did.`,
  path: "/blog",
});

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const { posts, eventRecaps } = await getBlogIndexData();

  return (
    <div className="blog-page">
      <section className="section section--hero blog-hero">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--accent">{CHAPTER_NAME} blog</span>
            <h1 className="display-1 blog-hero-headline">
              Stories &amp; playbooks
              <br />
              from the people
              <br />
              <span style={{ color: "var(--accent)" }}>building {CHAPTER_PLACE}</span>
            </h1>
            <p className="lead blog-hero-sub">
              No thought leadership. No SEO bait. Just members, writing about what they actually did, what worked, and what they wish they had known earlier.
            </p>
          </Reveal>
        </div>
      </section>

      <BlogIndex posts={posts} eventRecaps={eventRecaps} />

      <BlogUpcomingEvents />

      <section className="section section--dark">
        <div className="container container--text" style={{ textAlign: "center" }}>
          <Reveal>
            <span className="eyebrow eyebrow--on-dark">Members only</span>
            <h2 className="display-2" style={{ marginTop: 16, marginBottom: 24, color: "#fff" }}>
              Got a story to tell?
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
              The blog is members-only contribution. If you are an {CHAPTER_NAME} member with something to say, the editorial team will help you say it well.
            </p>
            <a href={`mailto:editor@${CHAPTER_DOMAIN}`} className="btn btn--primary btn--lg">
              Pitch a story
            </a>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
