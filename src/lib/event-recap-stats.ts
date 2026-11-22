// Recap stat computation.
//
// These numbers go on a public page with no human approving them, so the rules
// here are the safety net rather than a first line of defence. Everything is
// computed in code and handed to the recap generator as fixed strings: the
// model never calculates and never invents a number.
//
// Pure, no Supabase client, so it stays directly testable.

export type RecapStatKey =
  | "attended"
  | "event_value_rating"
  | "growth_rating"
  | "companies";

export type RecapStat = {
  key: RecapStatKey;
  value: string;
  label: string;
  color: "blue" | "mint" | "magenta";
};

export type SuppressionNote = {
  key: RecapStatKey;
  reason: string;
};

export type RecapStatsResult = {
  stats: RecapStat[];
  suppressed: SuppressionNote[];
};

// A rating from a handful of people is noise, and a bad 2-response average is
// worse than no number at all.
export const MIN_RATING_RESPONSES = 5;
// Two companies is not "companies represented", it is a coffee.
export const MIN_COMPANIES = 3;

export type RecapRegistration = {
  checked_in_at: string | null;
  review_classification?: string | null;
  guest_count?: number | null;
  attendees?: { company: string | null }[];
};

export type RecapFeedbackSummary = {
  responses: number;
  eventValueRating: number | null;
  growthRating: number | null;
  eventValueResponses: number;
  growthResponses: number;
};

function isCheckedIn(registration: RecapRegistration): boolean {
  // Spam registrations are excluded everywhere else in the codebase and must
  // not inflate a public attendance figure either.
  if (registration.review_classification === "spam") return false;
  return registration.checked_in_at !== null;
}

// Normalizes for counting distinct employers: "ACME Ltd." and "acme ltd" are
// one company, not two.
function normalizeCompany(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\b(ltd|llc|inc|co|corp|jsc|company|limited)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function countAttended(registrations: RecapRegistration[]): number {
  return registrations
    .filter(isCheckedIn)
    .reduce((total, registration) => total + 1 + (registration.guest_count ?? 0), 0);
}

export function countCompanies(registrations: RecapRegistration[]): number {
  const seen = new Set<string>();
  for (const registration of registrations) {
    if (!isCheckedIn(registration)) continue;
    for (const attendee of registration.attendees ?? []) {
      if (!attendee.company) continue;
      const normalized = normalizeCompany(attendee.company);
      if (normalized) seen.add(normalized);
    }
  }
  return seen.size;
}

function formatRating(rating: number): string {
  // 4.6, not 4.60 and not 4.
  return rating.toFixed(1);
}

function responsesLabel(base: string, responses: number): string {
  return `${base}, from ${responses} ${responses === 1 ? "response" : "responses"}`;
}

export function computeRecapStats(
  registrations: RecapRegistration[],
  feedback: RecapFeedbackSummary | null,
): RecapStatsResult {
  const stats: RecapStat[] = [];
  const suppressed: SuppressionNote[] = [];

  // ATTENDANCE. Check-in only. There is deliberately no registered-count
  // fallback: historic attendance is an incomplete import that undercounts
  // real turnout, and a registration count is not attendance. An event with no
  // check-in data shows no attendance number rather than a misleading one.
  const attended = countAttended(registrations);
  if (attended > 0) {
    stats.push({
      key: "attended",
      value: String(attended),
      label: attended === 1 ? "attendee" : "attendees",
      color: "blue",
    });
  } else {
    suppressed.push({
      key: "attended",
      reason:
        "No check-in records for this event. Registration counts are never published as attendance.",
    });
  }

  // RATINGS. Always printed with their response count: "4.6 from 34 responses"
  // is credible, a bare "4.6" is not.
  const valueResponses = feedback?.eventValueResponses ?? 0;
  const valueRating = feedback?.eventValueRating ?? null;
  if (valueRating !== null && valueResponses >= MIN_RATING_RESPONSES) {
    stats.push({
      key: "event_value_rating",
      value: formatRating(valueRating),
      label: responsesLabel("event value", valueResponses),
      color: "mint",
    });
  } else {
    suppressed.push({
      key: "event_value_rating",
      reason: `Event value rating needs ${MIN_RATING_RESPONSES} responses, has ${valueResponses}.`,
    });
  }

  const growthResponses = feedback?.growthResponses ?? 0;
  const growthRating = feedback?.growthRating ?? null;
  if (growthRating !== null && growthResponses >= MIN_RATING_RESPONSES) {
    stats.push({
      key: "growth_rating",
      value: formatRating(growthRating),
      label: responsesLabel("growth rating", growthResponses),
      color: "mint",
    });
  } else {
    suppressed.push({
      key: "growth_rating",
      reason: `Growth rating needs ${MIN_RATING_RESPONSES} responses, has ${growthResponses}.`,
    });
  }

  // COMPANIES.
  const companies = countCompanies(registrations);
  if (companies >= MIN_COMPANIES) {
    stats.push({
      key: "companies",
      value: String(companies),
      label: "companies represented",
      color: "magenta",
    });
  } else {
    suppressed.push({
      key: "companies",
      reason: `Companies represented needs ${MIN_COMPANIES}, has ${companies}.`,
    });
  }

  return { stats, suppressed };
}

// The stat-callout block, or null when every stat was suppressed. A recap with
// no stat block is still a good recap: silence beats a wrong number.
export function statCalloutBlock(
  result: RecapStatsResult,
): { tag: "stat-callout"; stats: Array<{ value: string; label: string; color: "blue" | "mint" | "magenta" }> } | null {
  if (result.stats.length === 0) return null;
  return {
    tag: "stat-callout",
    stats: result.stats.map((stat) => ({
      value: stat.value,
      label: stat.label,
      color: stat.color,
    })),
  };
}
