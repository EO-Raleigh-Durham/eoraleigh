import type { EventRegistration, EventTicketType } from "./events.ts";
import {
  isSpamRegistration,
  registrationAttendeeCount,
} from "./event-registration-review.ts";
import {
  DINNER_ALLERGY_LABEL,
  DINNER_PHONE_LABEL,
  noteLineValue,
} from "./myeo-dinner.ts";

export type RosterFilter = "active" | "cancelled" | "spam" | "all";
export type InviterFilter = "all" | "none" | string;
export type ProspectFilter = "all" | "prospects";

export function isMemberTicket(ticketName: string | null | undefined): boolean {
  if (!ticketName) return false;
  const normalized = ticketName.toLowerCase();
  if (
    normalized.includes("non-member") ||
    normalized.includes("non member") ||
    normalized.includes("staff")
  ) {
    return false;
  }
  return /\bmember\b/.test(normalized) && !normalized.includes("guest");
}

export function isActiveRosterRegistration(
  registration: Pick<EventRegistration, "status" | "review_classification">,
): boolean {
  return (
    !isSpamRegistration(registration) &&
    registration.status !== "cancelled" &&
    registration.status !== "no_show"
  );
}

export function inviterPersonId(
  registration: Pick<EventRegistration, "invited_by_person_id" | "inviter">,
): string | null {
  return registration.invited_by_person_id ?? registration.inviter?.person?.id ?? null;
}

export function rosterFilterCounts(registrations: EventRegistration[]) {
  return {
    active: registrations.filter(isActiveRosterRegistration).length,
    cancelled: registrations.filter(
      (registration) =>
        !isSpamRegistration(registration) && registration.status === "cancelled",
    ).length,
    spam: registrations.filter(isSpamRegistration).length,
    prospects: registrations.filter(
      (registration) => registration.is_prospect && !isSpamRegistration(registration),
    ).length,
    all: registrations.length,
  };
}

export function activeRosterPeopleCount(
  registrations: EventRegistration[],
): number {
  return registrations
    .filter(isActiveRosterRegistration)
    .reduce(
      (total, registration) => total + registrationAttendeeCount(registration),
      0,
    );
}

// Rows for the roster's "View party details" panel. Registrations with
// attendee rows show those. The MyEO dinner's short form creates none, so its
// phone and allergy answers (saved as labelled lines in the registration note)
// are shown as one row built from the person. Registrations with neither
// attendee rows nor those note lines return an empty list and get no panel.
export function registrationDetailAttendees(
  registration: EventRegistration,
): NonNullable<EventRegistration["attendees"]> {
  const attendees = registration.attendees ?? [];
  if (attendees.length > 0) return attendees;

  const phone = noteLineValue(registration.notes, DINNER_PHONE_LABEL);
  const allergy = noteLineValue(registration.notes, DINNER_ALLERGY_LABEL);
  if (!phone && !allergy) return [];

  return [
    {
      id: `note-${registration.id}`,
      registration_id: registration.id,
      full_name: registration.person?.name?.trim() || registration.person?.email || "",
      email: registration.person?.email ?? "",
      phone,
      company: null,
      title: null,
      food_allergy: allergy || null,
      created_at: registration.created_at,
    },
  ];
}

export function registrationCompanies(registration: EventRegistration): string[] {
  return Array.from(
    new Set(
      (registration.attendees ?? [])
        .map((attendee) => attendee.company?.trim())
        .filter((company): company is string => Boolean(company)),
    ),
  );
}

export function registrationAmountCents(
  registration: Pick<
    EventRegistration,
    "amount_paid" | "price_final_total" | "guest_count" | "ticket_type"
  >,
  eventPriceAmount = 0,
  guestPriceAmount = 0,
  tickets: EventTicketType[] = [],
): number {
  const activeTickets = tickets.filter((ticket) => ticket.active);
  const ticketGuestPrice =
    registration.ticket_type?.id &&
    registration.ticket_type.price_amount === 0 &&
    registration.ticket_type.max_attendees === 1 &&
    activeTickets.length === 2
      ? activeTickets.find(
          (ticket) =>
            ticket.id !== registration.ticket_type?.id && ticket.price_amount > 0,
        )?.price_amount
      : undefined;
  const guestCount = registration.guest_count ?? 0;
  const expected = registration.price_final_total ??
    (registration.ticket_type
      ? ticketGuestPrice !== undefined
        ? (registration.ticket_type.price_amount ?? 0) + guestCount * ticketGuestPrice
        : (registration.ticket_type.price_amount ?? 0) * (1 + guestCount)
      : eventPriceAmount + guestCount * guestPriceAmount);
  return Math.max(registration.amount_paid ?? 0, expected);
}

export function isRosterPaymentDue(
  registration: Pick<EventRegistration, "status" | "review_classification" | "amount_paid">,
  expectedAmount: number,
): boolean {
  return (
    !isSpamRegistration(registration) &&
    ["registered", "attended", "pending_payment"].includes(registration.status) &&
    expectedAmount > 0 &&
    (registration.amount_paid ?? 0) < expectedAmount
  );
}

export function filterRosterRegistrations(
  registrations: EventRegistration[],
  filter: RosterFilter,
  search: string,
  inviterFilter: InviterFilter = "all",
  prospectFilter: ProspectFilter = "all",
): EventRegistration[] {
  const query = search.trim().toLowerCase();

  return registrations
    .filter((registration) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && isActiveRosterRegistration(registration)) ||
        (filter === "cancelled" &&
          !isSpamRegistration(registration) &&
          registration.status === "cancelled") ||
        (filter === "spam" && isSpamRegistration(registration));

      if (!matchesFilter) return false;
      const matchesInviter =
        inviterFilter === "all" ||
        (inviterFilter === "none" && !inviterPersonId(registration)) ||
        inviterPersonId(registration) === inviterFilter;
      if (!matchesInviter) return false;
      if (prospectFilter === "prospects" && !registration.is_prospect) return false;
      if (!query) return true;

      return [
        registration.person?.name,
        registration.person?.email,
        registration.inviter?.person?.name,
        registration.inviter?.person?.email,
        ...(registration.attendees ?? []).flatMap((attendee) => [
          attendee.full_name,
          attendee.email,
          attendee.company,
        ]),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    })
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    );
}
