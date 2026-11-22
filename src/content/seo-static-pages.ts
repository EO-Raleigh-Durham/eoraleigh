// The chapter's hand-curated SEO registry of static pages, shown on
// /board/seo. Pages listed with a null title or description show up as gaps,
// so fill in each one as you write its metadata and pick its primary keyword.

export type SeoStaticPage = {
  path: string;
  title: string | null;
  description: string | null;
  primaryKeyword: string | null;
  // The page's OWN OG share image. Leave undefined when the page has no image
  // of its own and relies on the site-wide backup (DEFAULT_OG_IMAGE in
  // layout.tsx).
  ogImageUrl?: string;
  recommendedTitle?: string;
  recommendedDescription?: string;
  notes?: string;
};

const page = (path: string): SeoStaticPage => ({ path, title: null, description: null, primaryKeyword: null });

export const STATIC_PAGES: SeoStaticPage[] = [
  page("/"),
  page("/about"),
  page("/board-of-directors"),
  page("/blog"),
  page("/community-events"),
  page("/directory"),
  page("/events"),
  page("/forum"),
  page("/join"),
  page("/partners"),
  page("/past-events"),
  page("/podcast"),
  page("/privacy"),
  page("/partners/suggest"),
  page("/chapter-dues"),
  page("/secondary-chapter-dues"),
];
