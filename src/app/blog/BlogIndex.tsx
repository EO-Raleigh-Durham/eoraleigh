"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Reveal } from "@/components/Reveal";
import type { BlogPost } from "@/lib/blog";
import { formatBlogDate } from "@/lib/blog";

export type EventRecapCard = {
  id: string;
  title: string;
  blurb: string | null;
  image: string | null;
  href: string;
  date: string | null;
};

// Posts categorized as a recap belong to the "Event Recap" type, not to the
// Topics axis. Matched case-insensitively so "Event Recap" and "Event recap"
// both fold in.
const isRecapCategory = (category: string | null) =>
  !!category && category.trim().toLowerCase() === "event recap";

type BlogType = "Blog" | "Event Recap";

type Props = {
  posts: BlogPost[];
  eventRecaps?: EventRecapCard[];
};

export function BlogIndex({ posts, eventRecaps = [] }: Props) {
  // Split the two types up front: member writing vs. event recaps.
  const blogPosts = useMemo(
    () => posts.filter((p) => !isRecapCategory(p.category)),
    [posts],
  );
  const recapPosts = useMemo(
    () => posts.filter((p) => isRecapCategory(p.category)),
    [posts],
  );

  const featured = useMemo(
    () => blogPosts.find((p) => p.featured) ?? blogPosts[0] ?? null,
    [blogPosts],
  );
  const rest = useMemo(
    () => blogPosts.filter((p) => p.id !== featured?.id),
    [blogPosts, featured],
  );

  // Topics are subject tags only — the recap category never appears here.
  const topics = useMemo(() => {
    const set = new Set<string>();
    for (const p of rest) if (p.category) set.add(p.category);
    return ["All", ...Array.from(set).sort()];
  }, [rest]);

  const hasRecaps = recapPosts.length > 0 || eventRecaps.length > 0;

  // One list for the Event Recap tab, newest first, whether the recap is a
  // DB post or a static recap card. Before this the DB posts always came
  // first, so a new static recap (RISE 4, Rhonda Ross) landed below posts
  // from months earlier.
  const recapItems = useMemo(() => {
    const items: Array<
      { kind: "post"; key: string; date: number; post: BlogPost }
      | { kind: "card"; key: string; date: number; card: EventRecapCard }
    > = [
      ...recapPosts.map((p) => ({
        kind: "post" as const,
        key: `post-${p.id}`,
        date: new Date(p.published_at ?? 0).getTime(),
        post: p,
      })),
      ...eventRecaps.map((r) => ({
        kind: "card" as const,
        key: `card-${r.id}`,
        date: new Date(r.date ?? 0).getTime(),
        card: r,
      })),
    ];
    return items.sort((a, b) => b.date - a.date);
  }, [recapPosts, eventRecaps]);

  const [type, setType] = useState<BlogType>("Blog");
  const [topic, setTopic] = useState("All");
  const showRecaps = type === "Event Recap";
  const filtered = topic === "All" ? rest : rest.filter((p) => p.category === topic);

  if (posts.length === 0) {
    return (
      <section className="section">
        <div className="container container--text" style={{ textAlign: "center" }}>
          <p className="lead text-muted">No posts published yet. Check back soon.</p>
        </div>
      </section>
    );
  }

  return (
    <>
      {!showRecaps && featured && <FeaturedPost post={featured} />}

      <section className="section section--alt">
        <div className="container">
          <div className="events-list-head">
            <Reveal>
              <span className="eyebrow eyebrow--accent">
                {showRecaps ? "From the archive" : "All stories"}
              </span>
              <h2 className="display-3" style={{ marginTop: 12 }}>
                {showRecaps ? "Event recaps" : "Member writing"}
              </h2>
            </Reveal>
            <div className="blog-filters">
              {hasRecaps && (
                <div className="blog-type-toggle" role="tablist" aria-label="Blog type">
                  {(["Blog", "Event Recap"] as BlogType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      aria-selected={type === t}
                      className={`blog-type-pill ${type === t ? "is-active" : ""}`.trim()}
                      onClick={() => setType(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
              {!showRecaps && topics.length > 1 && (
                <div className="events-filter">
                  {topics.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`events-filter-pill ${topic === c ? "is-active" : ""}`.trim()}
                      onClick={() => setTopic(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="blog-grid">
            {showRecaps ? (
              recapItems.map((item, i) => (
                <Reveal key={item.key} delay={i * 60}>
                  {item.kind === "post" ? (
                    <PostCard post={item.post} />
                  ) : (
                    <RecapCard recap={item.card} />
                  )}
                </Reveal>
              ))
            ) : (
              filtered.map((p, i) => (
                <Reveal key={p.id} delay={i * 60}>
                  <PostCard post={p} />
                </Reveal>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function FeaturedPost({ post }: { post: BlogPost }) {
  const href = `/post/${post.slug}`;
  const readTime = post.read_time_minutes ? `${post.read_time_minutes} min read` : null;

  return (
    <section className="section">
      <div className="container">
        <Reveal className="blog-featured">
          <Link href={href} className="blog-featured-link">
            <div
              className="blog-featured-img"
              style={{ backgroundImage: post.hero_image_url ? `url(${post.hero_image_url})` : undefined }}
            >
              {post.category && <span className="blog-featured-tag mono">{post.category}</span>}
            </div>
            <div className="blog-featured-body">
              <div className="caption mono" style={{ color: "var(--accent)", marginBottom: 16 }}>
                {formatBlogDate(post.published_at)}
                {readTime ? ` · ${readTime}` : ""}
              </div>
              <h2 className="display-3" style={{ marginBottom: 20 }}>
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="lead" style={{ marginBottom: 28, color: "var(--text-muted)" }}>
                  {post.excerpt}
                </p>
              )}
              {post.author_name && (
                <div className="blog-featured-author">
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
              <div style={{ marginTop: 28 }}>
                <span className="bento-link">
                  Read the full story <span className="arrow">→</span>
                </span>
              </div>
            </div>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function PostCard({ post }: { post: BlogPost }) {
  const href = `/post/${post.slug}`;
  const readTime = post.read_time_minutes ? `${post.read_time_minutes} min read` : null;

  return (
    <Link href={href} className="blog-card blog-card--link">
      <div className="blog-card-meta">
        {post.category && <span className="blog-card-cat mono">{post.category}</span>}
        {readTime && <span className="blog-card-time mono">{readTime}</span>}
      </div>
      <h3 className="blog-card-title">{post.title}</h3>
      {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
      <div className="blog-card-foot">
        {post.author_name && <span className="blog-card-author">{post.author_name}</span>}
        <span className="blog-card-date mono">{formatBlogDate(post.published_at)}</span>
      </div>
    </Link>
  );
}

function RecapCard({ recap }: { recap: EventRecapCard }) {
  return (
    <Link href={recap.href} className="blog-card blog-card--recap blog-card--link">
      <div
        className="blog-card-img"
        style={{ backgroundImage: recap.image ? `url(${recap.image})` : undefined }}
      />
      <div className="blog-card-meta">
        <span className="blog-card-cat mono">Event recap</span>
        {recap.date && (
          <span className="blog-card-time mono">{formatBlogDate(recap.date)}</span>
        )}
      </div>
      <h3 className="blog-card-title">{recap.title}</h3>
      {recap.blurb && <p className="blog-card-excerpt">{recap.blurb}</p>}
      <div className="blog-card-foot">
        <span className="blog-card-author">Read the recap</span>
        <span className="blog-card-date mono">→</span>
      </div>
    </Link>
  );
}
