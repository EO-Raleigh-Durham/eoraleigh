import { CHAPTER_NAME } from "../kernel/config/chapter.ts";

const CHAPTER_NAME_PATTERN = CHAPTER_NAME.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MEMBER_TICKET = new RegExp(`^(?:eo |${CHAPTER_NAME_PATTERN} )?member$`, "i");

export type TeamInviteSource = {
  status: string;
  reviewClassification: string;
  voucherId: string | null;
  ticketName: string | null;
  amountPaid: number;
};

export type TeamRegistrationLinkInput = {
  voucherCode: string;
  ticketTypeId: string;
  inviterTicketCode: string;
};

export function canOfferTeamRegistration(source: TeamInviteSource): boolean {
  const isPaidRegistration = source.amountPaid > 0;
  // Free source tickets are limited to the chapter's canonical member labels.
  // Broad substring matching would incorrectly authorize "Staff Member" or
  // "Non-member Guest" tickets.
  const isMemberTicket = MEMBER_TICKET.test((source.ticketName ?? "").trim());
  return (
    (source.status === "registered" || source.status === "attended") &&
    source.reviewClassification !== "spam" &&
    source.voucherId === null &&
    (isPaidRegistration || isMemberTicket)
  );
}

export function buildTeamRegistrationUrl(
  eventPath: string,
  input: TeamRegistrationLinkInput,
): string {
  const params = new URLSearchParams({
    voucher: input.voucherCode,
    ticket: input.ticketTypeId,
    team: "1",
    invite: input.inviterTicketCode,
  });
  return `${eventPath}?${params.toString()}#rsvp`;
}
