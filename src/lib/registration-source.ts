export type RegistrationSourceFields = {
  channel_source?: string | null;
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  referral_source?: string | null;
};

// Lines for the board roster's Source column: the channel first, then the
// campaign and post tag, then the guest's own "how did you hear" answer.
export function registrationSourceLines(r: RegistrationSourceFields): string[] {
  const lines: string[] = [];
  const channel = r.channel_source?.trim() || r.utm_source?.trim();
  if (channel) lines.push(channel);
  const tags = [r.utm_campaign, r.utm_content]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  if (tags.length > 0) lines.push(tags.join(" / "));
  const heard = r.referral_source?.trim();
  if (heard) lines.push(`Heard via ${heard}`);
  return lines;
}
