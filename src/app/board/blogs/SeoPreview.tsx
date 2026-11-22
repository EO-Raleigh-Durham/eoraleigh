import type { BlogPost } from "@/lib/blog";
import { CHAPTER_DOMAIN, CHAPTER_NAME } from "@/kernel/config/chapter";

const SITE_URL = `https://${CHAPTER_DOMAIN}`;

type Props = {
  post: BlogPost;
};

function effectiveTitle(post: BlogPost) {
  return post.meta_title || post.title;
}

function effectiveDescription(post: BlogPost) {
  return post.meta_description || post.excerpt || "";
}

function effectiveOgImage(post: BlogPost) {
  return post.og_image_url || post.hero_image_url || null;
}

function effectiveUrl(post: BlogPost) {
  if (post.external_url) return post.external_url;
  if (post.canonical_url) return post.canonical_url;
  return `${SITE_URL}/post/${post.slug}`;
}

function statusFor(value: string, ideal: number, max: number) {
  const len = value.length;
  if (len === 0) return { tone: "missing", label: "Missing" };
  if (len > max) return { tone: "warn", label: `${len} / ${max} chars (too long)` };
  if (len > ideal) return { tone: "warn", label: `${len} / ${ideal} chars (over ideal)` };
  if (len < ideal * 0.5) return { tone: "warn", label: `${len} / ${ideal} chars (short)` };
  return { tone: "ok", label: `${len} / ${ideal} chars` };
}

export function SeoPreview({ post }: Props) {
  const title = effectiveTitle(post);
  const description = effectiveDescription(post);
  const ogImage = effectiveOgImage(post);
  const url = effectiveUrl(post);
  const displayUrl = url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const titleStatus = statusFor(title, 60, 70);
  const descStatus = statusFor(description, 155, 170);
  const keywordPresent = !!post.primary_keyword;

  return (
    <section className="seo-preview">
      <div className="seo-preview-head">
        <div className="admin-eyebrow">SEO at a glance</div>
        <h2 className="admin-section-h2">How it appears in search and on social</h2>
      </div>

      <div className="seo-preview-grid">
        {/* Quick status */}
        <div className="seo-preview-stats">
          <SeoStat
            label="Primary keyword"
            value={post.primary_keyword ?? "Missing"}
            tone={keywordPresent ? "ok" : "warn"}
          />
          <SeoStat label="Title tag" value={titleStatus.label} tone={titleStatus.tone} />
          <SeoStat label="Meta description" value={descStatus.label} tone={descStatus.tone} />
          <SeoStat
            label="OG image"
            value={ogImage ? "Set" : "Missing"}
            tone={ogImage ? "ok" : "warn"}
          />
        </div>

        {/* Google SERP preview */}
        <div className="seo-preview-card">
          <div className="seo-preview-card-label mono">Google search result</div>
          <div className="seo-google">
            <div className="seo-google-meta">
              <div className="seo-google-favicon" aria-hidden>EO</div>
              <div>
                <div className="seo-google-site">{CHAPTER_NAME}</div>
                <div className="seo-google-url">{displayUrl}</div>
              </div>
            </div>
            <a className="seo-google-title" href={url} target="_blank" rel="noreferrer">
              {title || "(no title)"}
            </a>
            <div className="seo-google-desc">
              {description || <span className="seo-google-desc-empty">(no description set)</span>}
            </div>
          </div>
        </div>

        {/* Social card preview */}
        <div className="seo-preview-card">
          <div className="seo-preview-card-label mono">Open Graph / Twitter card</div>
          <div className="seo-social">
            <div
              className="seo-social-image"
              style={ogImage ? { backgroundImage: `url(${ogImage})` } : undefined}
            >
              {!ogImage && <span className="seo-social-image-empty">No image set</span>}
            </div>
            <div className="seo-social-body">
              <div className="seo-social-domain mono">{displayUrl.split("/")[0]}</div>
              <div className="seo-social-title">{title || "(no title)"}</div>
              {description && <div className="seo-social-desc">{description}</div>}
            </div>
          </div>
        </div>

        {/* Keywords block */}
        {(post.primary_keyword || (post.secondary_keywords ?? []).length > 0) && (
          <div className="seo-preview-card">
            <div className="seo-preview-card-label mono">Keywords</div>
            {post.primary_keyword && (
              <div style={{ marginBottom: 12 }}>
                <div className="seo-google-meta" style={{ marginBottom: 6 }}>
                  <span className="admin-pill admin-pill--accent">Primary</span>
                </div>
                <div className="seo-keyword">{post.primary_keyword}</div>
              </div>
            )}
            {(post.secondary_keywords ?? []).length > 0 && (
              <div className="seo-keywords">
                {post.secondary_keywords.map((k) => (
                  <span key={k} className="seo-keyword-chip">{k}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function SeoStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`seo-stat seo-stat--${tone}`}>
      <div className="seo-stat-label mono">{label}</div>
      <div className="seo-stat-val">{value}</div>
    </div>
  );
}
