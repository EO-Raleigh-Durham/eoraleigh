import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { Reveal } from "@/components/Reveal";
import { BlockRenderer } from "@/components/blog/BlockRenderer";
import { BlogUpcomingEvents } from "@/components/blog/BlogUpcomingEvents";
import { RiseRecapLinks, RiseRecapLinksInline, RiseRecapLinksTop, isRiseRecapSlug } from "@/components/blog/RiseRecapLinks";
import "@/components/blog/blog-blocks.css";
import {
  getBlogPostBySlug,
  getBlogPostAudienceBySlug,
  formatBlogDate,
  incrementBlogView,
  isMemberOnly,
  type BlogPost,
} from "@/lib/blog";
import { getSessionUser } from "@/lib/auth";
import { roleAtLeast } from "@/lib/access";
import { getEventForPost, type LinkedEvent } from "@/lib/event-recap-link";
import { CHAPTER_SITE_URL } from "@/kernel/config/chapter";

const SITE_URL = CHAPTER_SITE_URL;

type Params = Promise<{ slug: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const access = await getBlogPostAudienceBySlug(slug);
  if (!access) return { title: "Post not found" };
  if (isMemberOnly(access)) {
    const user = await getSessionUser();
    if (!roleAtLeast(user?.role, "member")) {
      return {
        title: "Members-only post",
        robots: { index: false, follow: false },
      };
    }
  }
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: "Post not found" };

  const title = post.meta_title ?? post.title;
  const description = post.meta_description ?? post.excerpt ?? undefined;
  const canonical = post.canonical_url ?? `${SITE_URL}/post/${post.slug}`;
  const ogImage = post.og_image_url ?? post.hero_image_url ?? undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      images: ogImage ? [{ url: ogImage }] : undefined,
      publishedTime: post.published_at ?? undefined,
      authors: post.author_name ? [post.author_name] : undefined,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const access = await getBlogPostAudienceBySlug(slug);
  if (!access) notFound();

  // Authorize from a minimal descriptor before loading the post body through
  // the service client. Guests are authenticated, but are not members.
  if (isMemberOnly(access)) {
    const user = await getSessionUser();
    if (!user) redirect(`/login?next=/post/${slug}`);
    if (!roleAtLeast(user.role, "member")) {
      redirect("/");
    }
  }

  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  // Drafts and archived: 404 on public side
  if (post.status === "draft" || post.status === "archived") notFound();

  // External (e.g. Wix) post: 301 to source
  if (post.external_url) {
    redirect(post.external_url);
  }

  // Fire and forget the view counter. Not awaited so render is not blocked.
  void incrementBlogView(post.slug);

  // The event this post recaps, if it was tagged to one. Closes the internal
  // link loop: the event page links here, this card links back.
  const linkedEvent = await getEventForPost(post.id);

  return <PostBody post={post} linkedEvent={linkedEvent} />;
}

function PostBody({ post, linkedEvent }: { post: BlogPost; linkedEvent: LinkedEvent | null }) {
  const readTime = post.read_time_minutes ? `${post.read_time_minutes} min read` : null;

  // RISE recaps carry a one-line pointer to the other RISE recaps in the middle
  // of the post: in front of the heading nearest the halfway block, and only
  // where the block before it is a paragraph (never between a pull quote or
  // figure and the heading it leads into).
  let midIndex = -1;
  if (isRiseRecapSlug(post.slug) && post.blocks && post.blocks.length > 3) {
    const half = Math.floor(post.blocks.length / 2);
    for (let d = 0; d < post.blocks.length && midIndex < 0; d++) {
      for (const i of [half + d, half - d]) {
        const tag = post.blocks[i]?.tag;
        if (i > 0 && (tag === "h2" || tag === "h3") && post.blocks[i - 1]?.tag === "p") {
          midIndex = i;
          break;
        }
      }
    }
  }

  return (
    <article className="post-page">
      {/* HERO */}
      <section className="section section--hero post-hero">
        <div className="container container--text">
          <Reveal>
            <Link
              href="/blog"
              className="eyebrow eyebrow--accent"
              style={{ textDecoration: "none" }}
            >
              ← All posts
            </Link>
            <div
              className="caption mono"
              style={{ color: "var(--text-muted)", marginTop: 28, marginBottom: 16 }}
            >
              {post.category ? `${post.category} · ` : ""}
              {formatBlogDate(post.published_at)}
              {readTime ? ` · ${readTime}` : ""}
            </div>
            <h1
              className="display-1 post-hero-title"
              style={{ fontSize: "clamp(36px, 5vw, 64px)", marginBottom: 20 }}
            >
              {post.title}
            </h1>
            {post.subtitle && (
              <p className="lead" style={{ color: "var(--text-muted)", maxWidth: 720 }}>
                {post.subtitle}
              </p>
            )}
            {post.author_name && (
              <div className="post-author" style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 12 }}>
                <div className="blog-author-avatar">
                  {post.author_name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <div className="blog-author-name">{post.author_name}</div>
                  {post.author_role && (
                    <div className="caption text-faint">{post.author_role}</div>
                  )}
                </div>
              </div>
            )}
            <RiseRecapLinksTop currentSlug={post.slug} />
          </Reveal>
        </div>
      </section>

      {/* HERO IMAGE (optional) */}
      {post.hero_image_url && (
        <section className="section section--tight" style={{ paddingTop: 0 }}>
          <div className="container container--text">
            <Reveal>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.hero_image_url}
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
          {post.blocks && post.blocks.length > 0 ? (
            midIndex > 0 ? (
              <>
                <BlockRenderer blocks={post.blocks.slice(0, midIndex)} />
                <div className="blog-prose">
                  <RiseRecapLinksInline currentSlug={post.slug} />
                </div>
                <BlockRenderer blocks={post.blocks.slice(midIndex)} />
              </>
            ) : (
              <BlockRenderer blocks={post.blocks} />
            )
          ) : (
            <div className="container container--text">
              <p className="lead text-muted">This post has no content yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* The other RISE recaps (renders only on the RISE recap posts) */}
      <RiseRecapLinks currentSlug={post.slug} />

      {/* FROM THIS EVENT — the other half of the recap cross-link */}
      {linkedEvent && (
        <section className="section section--tight">
          <div className="container container--narrow">
            <Reveal>
              <span className="eyebrow eyebrow--accent">From this event</span>
              <Link href={linkedEvent.href} className="post-event-card">
                {linkedEvent.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={linkedEvent.coverImageUrl}
                    alt=""
                    className="post-event-card__img"
                    loading="lazy"
                  />
                )}
                <span className="post-event-card__body">
                  <span className="post-event-card__title">{linkedEvent.title}</span>
                  <span className="post-event-card__meta">
                    {formatBlogDate(linkedEvent.startsAt)}
                    {linkedEvent.location ? ` · ${linkedEvent.location}` : ""}
                  </span>
                  <span className="post-event-card__cta">See the event recap →</span>
                </span>
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* UPCOMING EVENTS — the post-read conversion moment */}
      <BlogUpcomingEvents />
    </article>
  );
}
