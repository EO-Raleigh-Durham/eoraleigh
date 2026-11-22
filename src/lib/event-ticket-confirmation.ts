export type TicketConfirmationDeliveryResult =
  | { sent: false; recorded: false }
  | { sent: true; recorded: true }
  | { sent: true; recorded: false; error: unknown };

type TicketConfirmationDeliveryOptions = {
  send: () => Promise<boolean>;
  recordSent: () => Promise<void>;
};

export async function deliverTicketConfirmation({
  send,
  recordSent,
}: TicketConfirmationDeliveryOptions): Promise<TicketConfirmationDeliveryResult> {
  const sent = await send();
  if (!sent) return { sent: false, recorded: false };

  try {
    await recordSent();
    return { sent: true, recorded: true };
  } catch (error) {
    return { sent: true, recorded: false, error };
  }
}
