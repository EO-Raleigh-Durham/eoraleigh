import type { Metadata } from "next";
import type { PageTier, UserRole } from "./access";

export type { PageTier };

// Single source of truth for what tier each ROUTE requires. An ordered prefix
// list, longest match wins, default "public". This one declaration drives
// access enforcement (proxy), SEO indexing (robotsFor), and nav visibility.
//
// Phase 4b: specific board-governance pages (chapter dashboard, overview, the
// handover decks, events, surveys, forum — including chapter financials, per
// the owner's call) are board-tier. Everything else under /admin stays
// super_admin via the fail-closed default below; /admin/users is super_admin;
// /member is reserved for members and higher roles. Longest-prefix match wins.
type RouteRule = { prefix: string; tier: PageTier };

const ROUTES: RouteRule[] = [
  // /admin is now super_admin-only (CRM + system). All board-accessible
  // governance moved to /board, which has its own shell. /board-of-directors is
  // the PUBLIC "meet the board" page and does NOT match the "/board" prefix
  // (matching is exact or prefix + "/"), so it stays public.
  { prefix: "/admin", tier: "admin" }, // all of /admin: super_admin (fail-closed)
  { prefix: "/board", tier: "board" }, // board governance area: board or above
  { prefix: "/member/events", tier: "guest" }, // self-scoped registrations
  { prefix: "/member", tier: "member" }, // member portal: member or above
  { prefix: "/portal", tier: "member" }, // legacy alias before redirect
  // everything else: public (the marketing site)
];

export function pageTier(pathname: string): PageTier {
  let best: RouteRule | null = null;
  for (const rule of ROUTES) {
    const matches =
      pathname === rule.prefix || pathname.startsWith(rule.prefix + "/");
    if (matches && (!best || rule.prefix.length > best.prefix.length)) {
      best = rule;
    }
  }
  return best ? best.tier : "public";
}

// Default destinations after login. Guests land on their self-scoped event
// registrations; members and higher roles retain their internal destinations.
export function roleHomePath(role: UserRole): string {
  if (role === "super_admin" || role === "board") return "/board/chapter-dashboard";
  // Kept in sync with CONTRACTOR_HOME in access-grants.ts (not imported here so
  // the access map stays dependency-free for the edge proxy).
  if (role === "contractor") return "/board/strategic-alliance-partners";
  if (role === "member") return "/member";
  return "/member/events";
}

// SEO indexing derives from the tier: only public routes are indexable.
// Replaces the hand-written robots blocks previously scattered across layouts.
export function robotsFor(tier: PageTier): Metadata["robots"] {
  if (tier === "public") {
    return {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    };
  }
  return {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  };
}
