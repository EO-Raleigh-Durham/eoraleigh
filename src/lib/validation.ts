// Shared input bounds for public-facing writes.
//
// Every public form (join, podcast guest, event RSVP, post-event survey, the
// AI Era landing page) writes through the service-role Supabase client, which
// bypasses RLS. These caps are therefore the only backstop against oversized or
// abusive payloads reaching the database. Limits are deliberately generous:
// they exist to stop abuse, not to constrain a genuine submission.

export const FIELD_MAX = {
  name: 200,
  email: 320, // RFC 5321 maximum total length
  phone: 40,
  company: 200,
  city: 120,
  role: 160,
  industry: 200,
  revenue: 80,
  title: 160, // job title on a per-attendee event registration
  food_allergy: 300,
  shortText: 1000, // single-line notes and short answers
  longText: 6000, // "why I want to join", guest story, survey free-text
} as const;

// Returns the first over-limit field's error message, or null if all fit.
// Pass values that have already been trimmed.
export function checkLengths(
  fields: Array<[label: string, value: string, max: number]>,
): string | null {
  for (const [label, value, max] of fields) {
    if (value.length > max) {
      return `${label} is too long (maximum ${max} characters)`;
    }
  }
  return null;
}
