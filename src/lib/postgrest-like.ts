/** Escape a value so PostgREST `like` and `ilike` treat it as a literal. */
export function postgrestLikeLiteral(value: string): string {
  return value.replace(/[\\%_*]/g, "\\$&");
}
