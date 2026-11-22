export const REGISTRATION_REVIEW_CLASSIFICATIONS = [
  "normal",
  "needs_review",
  "spam",
] as const;

export type RegistrationReviewClassification =
  (typeof REGISTRATION_REVIEW_CLASSIFICATIONS)[number];

export type ReviewableRegistration = {
  status: string;
  guest_count?: number | null;
  amount_paid?: number | null;
  price_final_total?: number | null;
  review_classification?: RegistrationReviewClassification | null;
};

type FeedbackIdentity = {
  event_id: string;
  person_id: string;
  person?: { email: string } | null;
};

type RegistrationIdentity = {
  event_id: string;
  person_id: string;
  review_classification: RegistrationReviewClassification | string;
  person?: { email: string } | null;
  attendees?: { email: string }[];
};

export function isSpamRegistration(
  registration: Pick<ReviewableRegistration, "review_classification">,
): boolean {
  return registration.review_classification === "spam";
}

export function isActiveRegistration(
  registration: ReviewableRegistration,
): boolean {
  return (
    !isSpamRegistration(registration) &&
    ["registered", "attended", "pending_payment"].includes(registration.status)
  );
}

export function isConfirmedRegistration(
  registration: ReviewableRegistration,
): boolean {
  return (
    !isSpamRegistration(registration) &&
    (registration.status === "registered" || registration.status === "attended")
  );
}

export function isPaymentDueRegistration(
  registration: ReviewableRegistration,
): boolean {
  if (
    isSpamRegistration(registration) ||
    !["registered", "attended", "pending_payment"].includes(registration.status)
  ) {
    return false;
  }
  const amountPaid = registration.amount_paid ?? 0;
  if (registration.price_final_total !== null && registration.price_final_total !== undefined) {
    return registration.price_final_total > amountPaid;
  }
  return amountPaid <= 0;
}

export function registrationAttendeeCount(
  registration: Pick<ReviewableRegistration, "guest_count">,
): number {
  return 1 + (registration.guest_count ?? 0);
}

export function occupiedSeats(registrations: ReviewableRegistration[]): number {
  return registrations
    .filter(isActiveRegistration)
    .reduce((sum, registration) => sum + registrationAttendeeCount(registration), 0);
}

export function canCheckInRegistration(
  registration: ReviewableRegistration,
): boolean {
  return !isSpamRegistration(registration) && registration.status === "registered";
}

export function isCommunicationEligible(
  registration: ReviewableRegistration,
  statuses: readonly string[],
): boolean {
  return !isSpamRegistration(registration) && statuses.includes(registration.status);
}

export function filterSpamLinkedFeedback<T extends FeedbackIdentity>(
  feedback: T[],
  registrations: RegistrationIdentity[],
): T[] {
  const spamPeople = new Set<string>();
  const spamEmails = new Set<string>();
  const operationalPeople = new Set<string>();
  const operationalEmails = new Set<string>();
  for (const registration of registrations) {
    const peopleSet = registration.review_classification === "spam"
      ? spamPeople
      : operationalPeople;
    const emailSet = registration.review_classification === "spam"
      ? spamEmails
      : operationalEmails;
    peopleSet.add(`${registration.event_id}:${registration.person_id}`);
    const emails = [
      registration.person?.email,
      ...(registration.attendees ?? []).map((attendee) => attendee.email),
    ];
    for (const email of emails) {
      if (email) emailSet.add(`${registration.event_id}:${email.toLowerCase()}`);
    }
  }

  return feedback.filter((row) => {
    const personKey = `${row.event_id}:${row.person_id}`;
    if (spamPeople.has(personKey) && !operationalPeople.has(personKey)) return false;
    const email = row.person?.email?.toLowerCase();
    if (!email) return true;
    const emailKey = `${row.event_id}:${email}`;
    return !spamEmails.has(emailKey) || operationalEmails.has(emailKey);
  });
}
