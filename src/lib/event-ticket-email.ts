export function shouldSendEventTicketEmail(input: {
  status: string;
  confirmationSentAt: string | null;
}): boolean {
  return (
    (input.status === "registered" || input.status === "attended") &&
    input.confirmationSentAt === null
  );
}
