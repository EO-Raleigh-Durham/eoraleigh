import type { UserRole } from "./access";

type LookupResult = { error: { message: string } | null };

export function profileLookupError(...results: LookupResult[]): string | null {
  return results.find((result) => result.error)?.error?.message ?? null;
}

// An Auth account that is already linked keeps its person. For a new link,
// a verified alternate email wins over the legacy primary-email fallback.
export function resolvedProfilePersonId(
  existingPersonId: string | null,
  aliasPersonId: string | null,
  primaryPersonId: string | null,
): string | null {
  return existingPersonId ?? aliasPersonId ?? primaryPersonId;
}

// Authentication proves control of an email address. Membership still comes
// from chapter_memberships. Lookup failures are handled before this policy is
// called, so an ordinary member without a current membership becomes a guest.
export function resolvedProfileRole(
  existingRole: UserRole | null,
  hasCurrentMembership: boolean,
): UserRole {
  if (existingRole === "board" || existingRole === "super_admin") return existingRole;
  if (hasCurrentMembership) return "member";
  // A contractor is assigned by a super admin and is not membership-derived,
  // so it must survive the per-request re-derivation instead of decaying to
  // guest. A contractor who becomes a member is promoted to member above.
  return existingRole === "contractor" ? "contractor" : "guest";
}
