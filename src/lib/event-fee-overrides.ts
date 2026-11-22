// Overrides to the standard USD$100 late-cancellation / USD$200 no-show
// policy (see EventPolicyNotice.tsx and the ticket confirmation email in
// email.ts).
//
// Forum Training events are USD$250 no-show by board decision (Ngan, 15 Sep
// 2026) — applies automatically to every Forum Training, present and
// future, with no per-event edit needed here.
//
// "Forum" (event.type) is a broad category — it also covers non-training
// Forum events (e.g. a "Forum Reformation Workshop", the placeholder text
// in the board's own event form). There's no dedicated "is this a
// training" column, so a Forum Training is identified as type "forum" AND
// a title containing "training" (case-insensitive) — matches "SLP Forum
// Training with Naeda Cheri" but not a Forum retreat, workshop, etc.
export const FORUM_TRAINING_NO_SHOW_FEE_USD = 250;
const DEFAULT_NO_SHOW_FEE_USD = 200;

// One-off exceptions only: an event whose fee needs to differ from what
// the rule above would compute. Keyed by the event's UUID in the `events`
// table. Empty unless the board approves a specific exception.
export const NO_SHOW_FEE_OVERRIDES_USD: Record<string, number> = {};

// Prepaid events whose payments are non-refundable (decided by the board / Chapter
// Manager). The standard late-cancellation and no-show fees do not apply to them, so the
// waiver notice and the ticket email say "non-refundable" instead of quoting those fees.
// Keyed by the event's UUID in the `events` table. Add an entry only once the event's
// own page says the same.
export const NON_REFUNDABLE_EVENT_IDS: ReadonlySet<string> = new Set([
  "4e798f9d-3d3a-40d9-aaae-d829a5a0e272", // Chapter Retreat 2026: fee paid by bank transfer, all payments non-refundable
]);

export function isNonRefundableEvent(event: { id: string }): boolean {
  return NON_REFUNDABLE_EVENT_IDS.has(event.id);
}

function isForumTraining(event: {
  type?: string | null;
  title?: string | null;
}): boolean {
  return event.type === "forum" && /training/i.test(event.title ?? "");
}

// The no-show fee to display/charge for a given event. Checks an explicit
// per-event exception first, then falls back to the Forum Training rule.
export function noShowFeeForEvent(event: {
  id: string;
  type?: string | null;
  title?: string | null;
}): number {
  if (event.id in NO_SHOW_FEE_OVERRIDES_USD) {
    return NO_SHOW_FEE_OVERRIDES_USD[event.id];
  }
  return isForumTraining(event)
    ? FORUM_TRAINING_NO_SHOW_FEE_USD
    : DEFAULT_NO_SHOW_FEE_USD;
}
