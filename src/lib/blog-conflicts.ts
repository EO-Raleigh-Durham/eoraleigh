// Pure helpers for interpreting blog_posts write failures. Kept free of the
// Supabase client so it stays directly testable, matching the split used by
// event-feedback-metrics.ts and the other pure modules here.

// Two unique constraints on blog_posts can raise a 23505: the slug, and the
// one-post-per-event index from migration 084. A board editor's next action is
// completely different depending on which one fired, so they are told apart
// rather than reported as one generic conflict.
export function uniqueViolationMessage(error: {
  code?: string;
  message: string;
}): string | null {
  if (error.code !== "23505" && !/duplicate key/i.test(error.message)) return null;
  if (/event_id/i.test(error.message)) {
    return "This event already has a recap post. Clear the event on that post first.";
  }
  return "A post with this slug already exists";
}
