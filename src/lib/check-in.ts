import type { RegistrationStatus } from "./events";

type RosterRegistration = {
  id: string;
  status: RegistrationStatus;
  guest_count: number | null;
  checked_in_at: string | null;
  waiver_accepted_at: string | null;
  review_classification?: string | null;
  person: { name: string | null; email: string } | null;
  attendees?: Array<{ full_name: string; email: string }>;
  ticket_type?: { name: string } | null;
};

export type CheckInCandidate = {
  id: string;
  displayName: string;
  displayEmail: string;
  searchTerms: string[];
  attendeeCount: number;
  ticketType: string | null;
  status: RegistrationStatus;
  checkedInAt: string | null;
  waiverAccepted: boolean;
};

export type CheckInEligibility =
  | { kind: "ready" }
  | { kind: "already" }
  | { kind: "blocked"; reason: string };

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function maskEmail(email: string): string {
  const [local, domain, ...rest] = email.trim().split("@");
  if (!local || !domain || rest.length > 0) return "Hidden email";
  return `${local[0]}${"*".repeat(Math.max(1, Math.min(5, local.length - 1)))}@${domain.toLowerCase()}`;
}

export function buildCheckInRoster(
  registrations: RosterRegistration[],
): CheckInCandidate[] {
  return registrations
    .filter((registration) => registration.review_classification !== "spam")
    .map((registration) => {
      const namedAttendees = registration.attendees ?? [];
      const primaryEmail = registration.person?.email ?? "";
      const fallbackName = namedAttendees[0]?.full_name || primaryEmail || "Guest";
      const displayName = registration.person?.name || fallbackName;
      const searchTerms = [
        displayName,
        primaryEmail,
        ...namedAttendees.flatMap((attendee) => [attendee.full_name, attendee.email]),
      ]
        .map(normalizeSearchText)
        .filter(Boolean);

      return {
        id: registration.id,
        displayName,
        displayEmail: maskEmail(primaryEmail),
        searchTerms,
        attendeeCount: 1 + (registration.guest_count ?? 0),
        ticketType: registration.ticket_type?.name ?? null,
        status: registration.status,
        checkedInAt: registration.checked_in_at,
        waiverAccepted: Boolean(registration.waiver_accepted_at),
      };
    });
}

function searchRank(status: RegistrationStatus): number {
  if (status === "registered") return 0;
  if (status === "attended") return 1;
  if (status === "pending_payment" || status === "waitlisted") return 2;
  return 3;
}

export function searchCheckInCandidates(
  candidates: CheckInCandidate[],
  query: string,
  limit = 8,
): CheckInCandidate[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  return candidates
    .filter((candidate) =>
      candidate.searchTerms.some((term) => term.includes(normalized)),
    )
    .sort((left, right) => {
      const statusDifference = searchRank(left.status) - searchRank(right.status);
      if (statusDifference !== 0) return statusDifference;
      return left.displayName.localeCompare(right.displayName);
    })
    .slice(0, limit);
}

export function checkInTotals(candidates: CheckInCandidate[]) {
  let confirmed = 0;
  let checkedIn = 0;
  for (const candidate of candidates) {
    if (candidate.status === "registered" || candidate.status === "attended") {
      confirmed += candidate.attendeeCount;
    }
    if (candidate.status === "attended") checkedIn += candidate.attendeeCount;
  }
  return {
    confirmed,
    checkedIn,
    expected: Math.max(0, confirmed - checkedIn),
  };
}

export function reconcileCheckInCandidate(
  candidates: CheckInCandidate[],
  candidate: CheckInCandidate,
): CheckInCandidate[] {
  const existing = candidates.find((row) => row.id === candidate.id);
  if (!existing) return [...candidates, candidate];
  return candidates.map((row) =>
    row.id === candidate.id
      ? { ...candidate, searchTerms: existing.searchTerms }
      : row,
  );
}

export function checkInEligibility(
  candidate: Pick<CheckInCandidate, "status">,
): CheckInEligibility {
  switch (candidate.status) {
    case "registered":
      return { kind: "ready" };
    case "attended":
      return { kind: "already" };
    case "pending_payment":
      return { kind: "blocked", reason: "Payment is not complete." };
    case "waitlisted":
      return { kind: "blocked", reason: "This registration is still waitlisted." };
    case "cancelled":
      return { kind: "blocked", reason: "This registration is cancelled." };
    case "no_show":
      return { kind: "blocked", reason: "This registration is marked as a no-show." };
  }
}
