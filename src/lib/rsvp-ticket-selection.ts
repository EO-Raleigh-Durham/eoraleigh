type TicketChoice = { id: string };

// Which ticket the RSVP form starts on. A link that names a ticket
// (?rsvp_ticket=, a voucher, a team link) preselects it. An event with a single
// ticket has nothing to choose. With two or more, nothing is preselected, so a
// non-member has to pick the guest ticket themselves instead of being left on
// the member ticket by default.
export function getInitialTicketId({
  tickets,
  preferredTicketId,
  initialTicketTypeId,
}: {
  tickets: ReadonlyArray<TicketChoice>;
  preferredTicketId?: string;
  initialTicketTypeId?: string;
}): string {
  if (preferredTicketId) return preferredTicketId;
  if (initialTicketTypeId && tickets.some((ticket) => ticket.id === initialTicketTypeId)) {
    return initialTicketTypeId;
  }
  return tickets.length === 1 ? tickets[0].id : "";
}
