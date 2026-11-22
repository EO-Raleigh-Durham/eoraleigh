"use client";

// Stand-in for a one-off family-day registration form that belongs to another
// chapter's event. It keeps the same exports and props so the shared event
// page compiles, and renders nothing.

/** Where registrants complete the EO Global side of the registration. */
export const MYEO_EVENT_URL = "https://member.eonetwork.org";

export function MyeoFamilyDayForm(props: {
  eventId: string;
  antiSpamToken: string;
  defaultName?: string | null;
  defaultEmail?: string | null;
  masterclassCapacity: number | null;
  masterclassRegistered: number;
}) {
  void props;
  return null;
}
