import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The marketing system renders data diagrams to PNG with resvg's native addon,
  // which must be loaded by Node at runtime rather than bundled (as in edge8-web).
  serverExternalPackages: ["@resvg/resvg-js"],
  // Sharp's native addon loads libvips dynamically. Include the shared
  // libraries that static tracing misses in Vercel function bundles.
  outputFileTracingIncludes: {
    "/*": ["node_modules/@img/sharp-libvips-*/lib/**/*"],
  },
  // Default Server Action body limit is 1MB, well under what MyeoFamilyDayForm
  // needs for its attendee door-gift photo uploads. Raised to 4MB, kept below
  // Vercel's ~4.5MB Serverless Function request body ceiling so an oversized
  // request still fails predictably instead of being truncated at the edge.
  // The form's own combined-photo-size cap (MyeoFamilyDayForm.tsx) stays under
  // this so real submissions never hit the raw limit at all.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
    // Turbopack's build cache (on by default since Next 16.3) lives in
    // .next/cache, which Vercel restores between deployments. A restored cache
    // served an unchanged globals.css for a CSS-only commit (PR #649 preview),
    // so every build compiles from scratch instead. Costs about 20s per build.
    turbopackFileSystemCacheForBuild: false,
  },
  // Serve the static /workflows/*.html pages at clean, extension-less URLs.
  // vercel.json sets cleanUrls, but Next.js ignores vercel.json routing, so we
  // map the clean path to the underlying .html file here. These run after the
  // filesystem check, so direct .html and the /workflows index still resolve.
  async rewrites() {
    return [
      { source: "/workflows", destination: "/workflows/index.html" },
      { source: "/workflows/:page", destination: "/workflows/:page.html" },
      // The connector's protected-resource metadata (RFC 9728). The standard
      // fixes the path under /.well-known; the route lives at /api/mcp/resource.
      { source: "/.well-known/oauth-protected-resource", destination: "/api/mcp/resource" },
      { source: "/.well-known/oauth-protected-resource/api/mcp", destination: "/api/mcp/resource" },
    ];
  },
  // Preserve legacy Wix blog URLs. The old site served posts under
  // /featured-blog/<slug>; the new site serves them at /post/<slug> with the
  // same slugs, so a 301 keeps old links and SEO equity intact.
  async redirects() {
    // Sections that moved from /admin to /board when the board area became the
    // single internal shell (/admin keeps only login + user management).
    const movedAdminSections = [
      "blogs",
      "historical-metrics",
      "leads",
      "marketing",
      "members",
      "membership-pipeline",
      "onboarding",
      "prospects",
      "seo",
      "strategic-alliance-partners",
    ];
    return [
      {
        source: "/featured-blog/:slug",
        destination: "/post/:slug",
        permanent: true,
      },
      // The member area moved from /portal to /member. Keep old links
      // (bookmarks, newsletter email links) working.
      {
        source: "/portal",
        destination: "/member",
        permanent: true,
      },
      {
        source: "/portal/:path*",
        destination: "/member/:path*",
        permanent: true,
      },
      // Both events were renamed (new title, new slug) after their event
      // pages had already gone out in the Sep 2026 newsletter/WhatsApp send.
      // Those links can't be un-sent, so redirect the old slugs instead.
      {
        // The LALA event was renamed a second time (behind-the-factory-floor
        // -> a-seat-at-my-factory). Point the original newsletter link
        // straight at the current slug rather than chaining through the
        // now-dead intermediate one.
        source: "/events/a-seat-at-my-business-october-lala",
        destination: "/events/a-seat-at-my-factory-october-lala",
        permanent: true,
      },
      {
        // Covers the intermediate slug too, in case it was shared anywhere
        // on its own between the two renames.
        source: "/events/behind-the-factory-floor-october-lala",
        destination: "/events/a-seat-at-my-factory-october-lala",
        permanent: true,
      },
      {
        // RISE 4 has been renamed more than once. Point every earlier link
        // straight at the current neutral slug rather than chaining
        // redirects.
        source: "/events/eo-rise-4-personal-branding-content-workshop",
        destination: "/events/eo-rise-4",
        permanent: true,
      },
      {
        // The intermediate RISE 4 slug went out in emails, WhatsApp and the
        // Randy blog post before the Oct 2026 retitle.
        source: "/events/eo-rise-4-building-brands-that-become-lifestyles",
        destination: "/events/eo-rise-4",
        permanent: true,
      },
      {
        // The Randy Dobson RISE 4 post was unpublished on 26 Oct 2026 when
        // the speaker changed; its link was shared ahead of the event, so
        // send clickers to the current event page. Not permanent: the post
        // content stays in git history and may return for a future event.
        source: "/post/category-creation-randy-dobson-rise-4",
        destination: "/events/eo-rise-4",
        permanent: false,
      },
      {
        // The Oct 2026 retitle slug. EVENT_SLUG_ALIASES in src/lib/events.ts
        // keeps /events/eo-rise-4 resolving until the board editor flips
        // the DB row to the same slug.
        source: "/events/eo-rise-4-zero-to-200m",
        destination: "/events/eo-rise-4",
        permanent: true,
      },
      {
        // DecisionLab dropped "poker" from its slug in Nov 2026 (sensitive
        // wording for an event in the chapter's country). The old link already went out on
        // WhatsApp, so it keeps opening the event page. Any query string
        // (utm tags) is passed through to the new address.
        source: "/events/decisionlab-poker-december-2026",
        destination: "/events/decisionlab-december-2026",
        permanent: true,
      },
      {
        source: "/events/glc-kyoto",
        destination: "/events/glc-kyoto-2027",
        permanent: true,
      },
      ...movedAdminSections.flatMap((section) => [
        {
          source: `/admin/${section}`,
          destination: `/board/${section}`,
          permanent: true,
        },
        {
          source: `/admin/${section}/:path*`,
          destination: `/board/${section}/:path*`,
          permanent: true,
        },
      ]),
    ];
  },
};

export default nextConfig;
