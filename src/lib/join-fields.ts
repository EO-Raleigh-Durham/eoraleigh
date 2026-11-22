// Required fields for POST /api/join. The full /join application asks
// "why"; the /founders expression-of-interest form does not.
const APPLICATION_FIELDS = ["name", "email", "company", "role", "revenue", "why"] as const;
const INTEREST_FIELDS = ["name", "email", "company", "role", "revenue"] as const;

export function missingJoinFields(
  body: Partial<Record<(typeof APPLICATION_FIELDS)[number], unknown>>,
  isInterest: boolean,
): string[] {
  const fields = isInterest ? INTEREST_FIELDS : APPLICATION_FIELDS;
  return fields.filter((k) => !body[k] || String(body[k]).trim() === "");
}
