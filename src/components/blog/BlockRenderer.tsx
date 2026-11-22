import type { Block } from "@/lib/blog";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { PhotoGallery } from "./PhotoGallery";

// Renders an array of typed Blocks. Each block type has its own visual
// treatment via blog-blocks.css. Authors do not pick fonts or spacing.
//
// HTML in `text` fields is intentional, light formatting only:
// <strong>, <em>, <a>, <code>. Anything heavier should be its own block.
//
// Board accounts write this content and every visitor receives it, so all of
// it goes through the sanitizeHtml allow-list before it is rendered.

function renderInlineHtml(text: string) {
  return <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />;
}

// Fallback avatar for a testimonial from a member with no photo on file. Photos
// are patchy, so this path is common rather than exceptional.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="blog-prose">
      {blocks.map((block, i) => {
        switch (block.tag) {
          case "h2":
            return <h2 key={i} className="blog-h2">{renderInlineHtml(block.text)}</h2>;
          case "h3":
            return <h3 key={i} className="blog-h3">{renderInlineHtml(block.text)}</h3>;
          case "h4":
            return <h4 key={i} className="blog-h4">{renderInlineHtml(block.text)}</h4>;
          case "p":
            return <p key={i} className="blog-p">{renderInlineHtml(block.text)}</p>;
          case "blockquote":
            return <blockquote key={i} className="blog-blockquote">{renderInlineHtml(block.text)}</blockquote>;
          case "li":
            return (
              <div key={i} className="blog-li">
                <span className="blog-li-bullet" />
                <span>{renderInlineHtml(block.text)}</span>
              </div>
            );
          case "pull-quote":
            return (
              <div key={i} className="blog-pull-quote">
                <div className="blog-pull-quote-text">{renderInlineHtml(block.text)}</div>
                {block.attribution && (
                  <div className="blog-pull-quote-attr mono">{block.attribution}</div>
                )}
              </div>
            );
          case "emphasis-box":
            return (
              <div key={i} className="blog-emphasis-box">
                {block.label && (
                  <div className="blog-emphasis-label mono">{block.label}</div>
                )}
                <p>{renderInlineHtml(block.text)}</p>
              </div>
            );
          case "tl-dr":
            return (
              <div key={i} className="blog-callout-box">
                <div className="blog-callout-label mono">TL;DR</div>
                <ul className="blog-callout-list">
                  {block.items.map((item, j) => (
                    <li key={j}>
                      <span className="blog-li-bullet" />
                      <span>{renderInlineHtml(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          case "stat-callout":
            return (
              <div key={i} className="blog-stat-callout">
                {block.stats.map((stat, j) => (
                  <div key={j} className="blog-stat" data-color={stat.color ?? "blue"}>
                    <div className="blog-stat-value">{stat.value}</div>
                    <div className="blog-stat-label mono">{stat.label}</div>
                  </div>
                ))}
              </div>
            );
          case "callout":
            return (
              <div key={i} className={`blog-callout blog-callout--${block.tone ?? "info"}`}>
                <div className="blog-callout-label mono">{block.label}</div>
                <p>{renderInlineHtml(block.text)}</p>
              </div>
            );
          case "shipped-list":
            return (
              <div key={i} className="blog-callout-box">
                <div className="blog-callout-label mono">{block.title}</div>
                <ul className="blog-callout-list">
                  {block.items.map((item, j) => (
                    <li key={j}>
                      <span className="blog-li-bullet" />
                      <span>{renderInlineHtml(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          case "conclusion-box":
            return (
              <div key={i} className="blog-conclusion-box">
                <h2 className="blog-conclusion-title">{block.title}</h2>
                {block.paragraphs.map((p, j) => (
                  <p key={j}>{renderInlineHtml(p)}</p>
                ))}
              </div>
            );
          case "faq":
            return (
              <details key={i} className="blog-faq">
                <summary>{block.question}</summary>
                <div className="blog-faq-answer">{renderInlineHtml(block.answer)}</div>
              </details>
            );
          case "image":
            return (
              <figure key={i} className="blog-figure">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.src} alt={block.alt} />
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            );
          case "photo-strip":
            return (
              <section
                key={i}
                className="blog-photo-strip"
                aria-label={block.label ?? "Event photos"}
              >
                <ul className="blog-photo-strip-track" tabIndex={0}>
                  {block.images.map((img, j) => (
                    <li key={j} className="blog-photo-strip-item">
                      <figure>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.src} alt={img.alt} loading="lazy" />
                        {img.caption && <figcaption>{img.caption}</figcaption>}
                      </figure>
                    </li>
                  ))}
                </ul>
              </section>
            );
          case "testimonial-row":
            return (
              <ul key={i} className="blog-testimonial-row">
                {block.items.map((item, j) => (
                  <li key={j} className="blog-testimonial">
                    <div className="blog-testimonial-head">
                      {item.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.photoUrl}
                          alt=""
                          className="blog-testimonial-photo"
                          loading="lazy"
                        />
                      ) : (
                        <span className="blog-testimonial-photo blog-testimonial-initials">
                          {initials(item.name)}
                        </span>
                      )}
                      <div className="blog-testimonial-who">
                        <span className="blog-testimonial-name">{item.name}</span>
                        {item.role && (
                          <span className="blog-testimonial-role">{item.role}</span>
                        )}
                      </div>
                    </div>
                    {typeof item.rating === "number" && (
                      <span
                        className="blog-testimonial-stars"
                        aria-label={`Rated ${item.rating} out of 5`}
                      >
                        {"★".repeat(Math.max(0, Math.min(5, Math.round(item.rating))))}
                      </span>
                    )}
                    <p className="blog-testimonial-quote">{item.quote}</p>
                  </li>
                ))}
              </ul>
            );
          case "photo-gallery":
            return (
              <PhotoGallery key={i} images={block.images} label={block.label} />
            );
          case "step-card":
            return (
              <div key={i} className="blog-step-card">
                {block.eyebrow && <div className="blog-step-eyebrow mono">{block.eyebrow}</div>}
                <h3 className="blog-step-title">{block.title}</h3>
                <div className="blog-step-body">
                  <BlockRenderer blocks={block.body} />
                </div>
              </div>
            );
          case "phase-lane":
            return (
              <div key={i} className="blog-phase-lanes">
                {block.lanes.map((lane, j) => (
                  <div key={j} className="blog-phase-lane">
                    <div className="blog-phase-lane-title">{lane.title}</div>
                    <ul>
                      {lane.items.map((item, k) => (
                        <li key={k}>{renderInlineHtml(item)}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            );
          case "cta-button": {
            const external = /^https?:\/\//.test(block.href);
            return (
              <div key={i} className="blog-cta">
                <a
                  href={block.href}
                  className={`blog-cta-btn blog-cta-btn--${block.tone ?? "primary"}`}
                  {...(external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {block.label}
                </a>
              </div>
            );
          }
          case "html":
            return (
              <div
                key={i}
                className="blog-html"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html) }}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
