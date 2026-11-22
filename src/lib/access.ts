// Single source of truth for the role / page-tier / content-audience ladder.
//
// One ordered scale underlies role-based access across the whole site:
//
//     rank   0        1        2        3        4
//            public   guest    member   board    admin
//
// Each tier sees everything the tier below sees, plus more (cumulative).
// This module is intentionally dependency-free at runtime (the only import is
// a type, which is erased) so it is safe to use from the edge proxy, server
// components, and client components alike.

// contractor: a non-member helper (e.g. TK's SAP team). Guest-level on the
// ladder; any extra access comes only from an access grant for a named area
// (see src/lib/access-grants.ts), never from rank.
export type UserRole = "super_admin" | "board" | "member" | "guest" | "contractor";

export type PageTier = "public" | "guest" | "member" | "board" | "admin";

export const TIER_RANK: Record<PageTier, number> = {
  public: 0,
  guest: 1,
  member: 2,
  board: 3,
  admin: 4,
};

// A user's role maps onto the same scale. super_admin is the "admin" tier; a
// logged-out visitor (null/undefined) is "public" (rank 0).
export function roleRank(role: UserRole | null | undefined): number {
  if (!role) return TIER_RANK.public;
  if (role === "super_admin") return TIER_RANK.admin;
  if (role === "contractor") return TIER_RANK.guest;
  return TIER_RANK[role];
}

// Content rows (events, surveys) are tagged with an audience. "community" sits
// at rank 0 — publicly visible (homepage, /community-events) — the same rank as
// "public", just the word used for content rows vs routes.
export type ContentAudience = "community" | "member" | "board";

export const AUDIENCE_RANK: Record<ContentAudience, number> = {
  community: 0,
  member: 2,
  board: 3,
};

// THE access predicate for routes: does this role meet the page's tier?
export function roleAtLeast(
  role: UserRole | null | undefined,
  minTier: PageTier,
): boolean {
  return roleRank(role) >= TIER_RANK[minTier];
}

// THE visibility predicate for content: can this role see this audience's rows?
export function canView(
  role: UserRole | null | undefined,
  audience: ContentAudience,
): boolean {
  return roleRank(role) >= AUDIENCE_RANK[audience];
}
