// Spam control for the public forms, with no third-party service and nothing
// visible on the page. Two signals, both sent by components/SpamTrap:
//   - a honeypot: a field people never see, so only a bot fills it in
//   - the time between the form appearing and being sent: nobody types a
//     name, an email and a company in under two seconds
// A caller that gets true answers with its normal success response and saves
// nothing, so a bot is not told it was caught.

export const MIN_SUBMIT_MS = 2000;

export function looksLikeBot(input: { honeypot?: unknown; elapsedMs?: unknown }): boolean {
  if (typeof input.honeypot === "string" && input.honeypot.trim() !== "") return true;
  // A missing time is let through: a page loaded before this shipped does
  // not send one, and a real application must never be dropped silently.
  const elapsed = input.elapsedMs;
  return typeof elapsed === "number" && elapsed >= 0 && elapsed < MIN_SUBMIT_MS;
}
