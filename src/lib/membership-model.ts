// Pure helpers for adding members and changing membership status from the
// board's member pages. chapter_memberships is the authority for member access:
// active and on_leave sign in as members; every other status signs in as guest.

export const MEMBERSHIP_STATUS_OPTIONS = [
  { value: "active", label: "Active", grantsAccess: true },
  { value: "on_leave", label: "On leave", grantsAccess: true },
  { value: "elumni", label: "Alumni (left in good standing)", grantsAccess: false },
  { value: "terminated", label: "Ended", grantsAccess: false },
  { value: "transferred", label: "Transferred to another chapter", grantsAccess: false },
] as const;
export type ChapterMembershipStatus = (typeof MEMBERSHIP_STATUS_OPTIONS)[number]["value"];

export const MEMBERSHIP_TYPE_OPTIONS = [
  { value: "Primary Membership", label: "Primary" },
  { value: "Secondary Membership", label: "Secondary" },
] as const;
export type ChapterMembershipType = (typeof MEMBERSHIP_TYPE_OPTIONS)[number]["value"];

export function isMembershipStatus(v: string): v is ChapterMembershipStatus {
  return MEMBERSHIP_STATUS_OPTIONS.some((o) => o.value === v);
}

export function isMembershipType(v: string): v is ChapterMembershipType {
  return MEMBERSHIP_TYPE_OPTIONS.some((o) => o.value === v);
}

export function statusLabel(v: string): string {
  return MEMBERSHIP_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

export function grantsMemberAccess(v: string): boolean {
  return MEMBERSHIP_STATUS_OPTIONS.find((o) => o.value === v)?.grantsAccess ?? false;
}

/** A yyyy-mm-dd date, or null. */
export function isoDate(v: string | null | undefined): string | null {
  if (!v) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) ? v : null;
}

/**
 * What a status change should store. Statuses that end access need an end
 * date (today when none is given); going back to active or on leave clears it.
 */
export function statusChange(
  status: ChapterMembershipStatus,
  endDate: string | null,
  today: string,
): { status: ChapterMembershipStatus; end_date: string | null } {
  return grantsMemberAccess(status) ? { status, end_date: null } : { status, end_date: endDate ?? today };
}

/** Lower-case, trimmed email; null when it is not a plausible address. */
export function memberEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
