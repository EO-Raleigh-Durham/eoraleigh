// Which ticket a public RSVP is priced by. Pure, so the rule is unit tested.

export const TICKET_LOOKUP_ERROR =
  "We could not load the ticket options just now. Please try again in a moment.";

export const TICKET_SOLD_OUT_ERROR =
  "This ticket is sold out. Please choose another ticket or contact the chapter.";

/**
 * Whether register_for_event() refused the seat because the chosen ticket has
 * no seats left (migration 126). The limit is counted in the database, under
 * the event lock, never from anything the browser sent.
 */
export function isTicketSoldOutError(message: string | null | undefined): boolean {
  return /ticket_sold_out/.test(message ?? "");
}

export type EventTicketSelection<T> =
  | { ok: true; ticket: T | null }
  | { ok: false; error: string };

/**
 * Tickets override the event-level price. When the ticket lookup fails the
 * price is unknown, so the registration must stop: falling back to the event
 * price (usually zero) would hand out a free ticket to a paid event. An event
 * with no active tickets is priced by the event itself (ticket is null).
 */
export function selectEventTicket<T extends { id: string }>(input: {
  tickets: T[] | null;
  lookupFailed: boolean;
  ticketTypeId: string;
}): EventTicketSelection<T> {
  if (input.lookupFailed) return { ok: false, error: TICKET_LOOKUP_ERROR };
  const tickets = input.tickets ?? [];
  if (tickets.length === 0) return { ok: true, ticket: null };
  if (!input.ticketTypeId) return { ok: false, error: "Please choose a ticket" };
  const match = tickets.find((t) => t.id === input.ticketTypeId);
  if (!match) return { ok: false, error: "Invalid ticket selection" };
  return { ok: true, ticket: match };
}
