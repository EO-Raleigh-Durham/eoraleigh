// Confirm-card content for a chatbot proposal. Built on the server from the
// proposal's own parameters and the records they point at (describeAction in
// writes.ts), never from text the model wrote, so the card shows what Confirm
// will actually do. No imports: safe for the client to import the type.

export type ProposalChange = {
  field: string;
  /** Current value, or null when the change adds something new. */
  from: string | null;
  to: string;
};

export type ProposalCard = {
  /** What the action does, e.g. "Move deal to a new stage". */
  action: string;
  /** The record it acts on, by name, e.g. "Deal: Nguyen Van A". */
  record: string;
  changes: ProposalChange[];
};

const MAX_VALUE_CHARS = 200;

/** One value as card text: empty, yes/no, or the text itself (capped). */
export function showValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "(empty)";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  const text = typeof v === "string" ? v : JSON.stringify(v);
  return text.length > MAX_VALUE_CHARS ? `${text.slice(0, MAX_VALUE_CHARS)}...` : text;
}

/** One change per patched field, current value against new value. */
export function fieldChanges(
  before: Record<string, unknown>,
  patch: Record<string, unknown>,
): ProposalChange[] {
  return Object.entries(patch).map(([key, to]) => ({
    field: key.replace(/_/g, " "),
    from: showValue(before[key]),
    to: showValue(to),
  }));
}

/** The one-line form stored in chatbot_actions.summary (the audit log). */
export function cardSummary(card: ProposalCard): string {
  const changes = card.changes
    .map((c) => (c.from === null ? `${c.field}: ${c.to}` : `${c.field}: ${c.from} -> ${c.to}`))
    .join("; ");
  return `${card.action}. ${card.record}. ${changes}`;
}
