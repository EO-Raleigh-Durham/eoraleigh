export type GuestRegistrationContext = {
  relationship: string;
  host_member: string;
  visiting_chapter: string;
  referral_source: string;
};

// The fixed answers to "How did you hear about this event?". Shared by the
// form (the dropdown) and the server (publicRsvp stores only these values in
// event_registrations.referral_source, so a forged request cannot plant free
// text in a countable column). The free-text era's answers live on in notes.
export const REFERRAL_SOURCE_OPTIONS = [
  "Facebook",
  "LinkedIn",
  "Instagram",
  "Member invite",
  "A friend",
  "Email",
  "Other",
] as const;

export function isReferralSourceOption(value: string): boolean {
  return (REFERRAL_SOURCE_OPTIONS as readonly string[]).includes(value);
}

// The guest form's "How are you joining us?" answers are saved as labelled
// lines inside the registration's internal note. The board reads them back out
// by the same labels, so build and parse share this one list.
const GUEST_CONTEXT_LABELS: ReadonlyArray<
  readonly [keyof GuestRegistrationContext, string]
> = [
  ["relationship", "How they are joining"],
  ["host_member", "Invited by"],
  ["visiting_chapter", "Home EO chapter"],
  ["referral_source", "How they heard"],
];

export function buildGuestRegistrationNotes(
  context: GuestRegistrationContext,
): string {
  const details = GUEST_CONTEXT_LABELS.flatMap(([key, label]) =>
    context[key] ? [`${label}: ${context[key]}`] : [],
  );

  return details.length > 0
    ? ["Registration details:", ...details].join("\n")
    : "";
}

export type GuestRegistrationDetail = { label: string; value: string };

// Reads the labelled lines back out of a registration note, in form order.
// Other lines in the note (staff edits, complimentary audit text) are ignored,
// and a note with none of the labels returns an empty list.
export function getGuestRegistrationDetails(
  notes: string | null | undefined,
): GuestRegistrationDetail[] {
  if (!notes) return [];
  const lines = notes.split(/\r?\n/);
  return GUEST_CONTEXT_LABELS.flatMap(([, label]) => {
    const prefix = `${label}: `;
    const line = lines.find((entry) => entry.startsWith(prefix));
    const value = line ? line.slice(prefix.length).trim() : "";
    return value ? [{ label, value }] : [];
  });
}
