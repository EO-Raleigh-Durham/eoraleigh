import { CHAPTER_DOMAIN, CHAPTER_NAME } from "../kernel/config/chapter.ts";
import type { Metadata } from "next";

/**
 * Absolute site origin (bare chapter domain, no www). Kept here as the single
 * source of truth. Falls back to localhost when no site URL is configured, so
 * metadataBase stays a valid URL.
 */
export const SITE_URL = CHAPTER_DOMAIN ? `https://${CHAPTER_DOMAIN}` : "http://localhost:3000";

/**
 * Brand share card used whenever a page has no image of its own (homepage,
 * events with a blank cover, any route that omits an image of its own).
 */
export const DEFAULT_OG_IMAGE = "/images/hero.jpg";

type PageMetaInput = {
  /**
   * Bare page title. The root layout appends " · <chapter name>" to the <title>
   * tag via its title template; the share card uses this title verbatim.
   */
  title: string;
  description: string;
  /** This page's path, e.g. "/training". Used for the canonical URL + og:url. */
  path: string;
  /** Share-card image. Defaults to the brand hero. */
  image?: string;
  /** og:type. "website" for sections, "article" for posts. Defaults to "website". */
  type?: "website" | "article";
  /**
   * Robots directive, passed through untouched (e.g. noindex for private
   * pages). Omit to inherit the public policy from the root layout.
   */
  robots?: Metadata["robots"];
};

/**
 * Build a complete Metadata object whose social share card (openGraph +
 * twitter) always mirrors the page's real title and description.
 *
 * Why this exists: Next.js merges metadata *shallowly*, and it does NOT derive
 * og:title / og:description from a page's `title` / `description`. A page that
 * sets only those two fields inherits the ENTIRE openGraph block from the root
 * layout, so its share card shows the homepage title, description, and image.
 * Routing every page through this helper makes that failure impossible.
 */
export function pageMeta({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  type = "website",
  robots,
}: PageMetaInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: CHAPTER_NAME,
      title,
      description,
      url: path,
      locale: "en_US",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    ...(robots !== undefined ? { robots } : {}),
  };
}
