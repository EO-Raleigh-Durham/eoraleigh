"use client";

import { useCallback, useEffect, useState } from "react";

// A grid of thumbnails that opens any photo in a full-screen lightbox.
// Click a thumbnail to enlarge; arrow keys or the on-screen arrows move
// between photos; Escape or the backdrop closes. Rendered by BlockRenderer
// for the "photo-gallery" block. Client component: the lightbox needs state,
// keyboard handling and a scroll lock.

type GalleryImage = { src: string; alt: string; caption?: string };

export function PhotoGallery({
  images,
  label,
}: {
  images: GalleryImage[];
  label?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const count = images.length;

  const close = useCallback(() => setOpenIndex(null), []);
  const prev = useCallback(
    () => setOpenIndex((n) => (n === null ? n : (n - 1 + count) % count)),
    [count],
  );
  const next = useCallback(
    () => setOpenIndex((n) => (n === null ? n : (n + 1) % count)),
    [count],
  );

  useEffect(() => {
    if (openIndex === null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);

    // Lock the page behind the lightbox so it does not scroll under the overlay.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [openIndex, close, prev, next]);

  if (count === 0) return null;

  const active = openIndex === null ? null : images[openIndex];

  return (
    <section className="blog-gallery" aria-label={label ?? "Photo gallery"}>
      <ul className="blog-gallery-grid">
        {images.map((img, i) => (
          <li key={i}>
            <button
              type="button"
              className="blog-gallery-thumb"
              onClick={() => setOpenIndex(i)}
              aria-label={
                img.caption ? `Enlarge photo: ${img.caption}` : `Enlarge photo ${i + 1}`
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt={img.alt} loading="lazy" />
            </button>
          </li>
        ))}
      </ul>

      {active && (
        <div
          className="blog-gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={active.caption ?? active.alt ?? "Photo"}
          onClick={close}
        >
          <button
            type="button"
            className="blog-gallery-close"
            onClick={close}
            aria-label="Close"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          {count > 1 && (
            <button
              type="button"
              className="blog-gallery-nav blog-gallery-prev"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous photo"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
          )}

          <figure
            className="blog-gallery-figure"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.src} alt={active.alt} />
            {active.caption && <figcaption>{active.caption}</figcaption>}
            {count > 1 && (
              <div className="blog-gallery-counter mono">
                {openIndex! + 1} / {count}
              </div>
            )}
          </figure>

          {count > 1 && (
            <button
              type="button"
              className="blog-gallery-nav blog-gallery-next"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next photo"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
