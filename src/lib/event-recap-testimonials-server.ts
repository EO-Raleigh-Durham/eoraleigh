import { supabase } from "./supabase";
import {
  selectTestimonials,
  type Testimonial,
  type TestimonialCandidate,
} from "./event-recap-testimonials.ts";

// Server-only loader for recap testimonials.
//
// The select list below is the security boundary. It reads loved_text and
// nothing else from event_feedback: improve_text is critical feedback given in
// confidence and is excluded from the query itself rather than filtered
// afterwards, so it cannot reach the prompt or the page even by mistake.
// scripts/guardrails/recap-testimonial-source.test.mjs enforces that.

type FeedbackRow = {
  person_id: string;
  loved_text: string | null;
  event_value_rating: number | null;
  person: {
    id: string;
    name: string | null;
    preferred_name: string | null;
    headline: string | null;
    member_photos: { url: string; is_primary: boolean; sort_order: number }[] | null;
  } | null;
};

function pickPhoto(
  photos: { url: string; is_primary: boolean; sort_order: number }[] | null,
): string | null {
  if (!photos || photos.length === 0) return null;
  const primary = photos.find((p) => p.is_primary);
  if (primary) return primary.url;
  return [...photos].sort((a, b) => a.sort_order - b.sort_order)[0].url;
}

export async function getEventTestimonials(eventId: string): Promise<Testimonial[]> {
  const { data, error } = await supabase
    .from("event_feedback")
    .select(
      "person_id, loved_text, event_value_rating, " +
        "person:people!event_feedback_person_id_fkey(" +
        "id, name, preferred_name, headline, " +
        "member_photos ( url, is_primary, sort_order ))",
    )
    .eq("event_id", eventId)
    .not("loved_text", "is", null);

  if (error) {
    console.warn("getEventTestimonials:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as FeedbackRow[];
  if (rows.length === 0) return [];

  const activeMemberIds = await loadActiveMemberIds(
    rows.map((row) => row.person_id),
  );

  const candidates: TestimonialCandidate[] = rows.map((row) => ({
    personId: row.person_id,
    lovedText: row.loved_text,
    rating: row.event_value_rating,
    name: row.person?.preferred_name || row.person?.name || null,
    role: row.person?.headline ?? null,
    photoUrl: pickPhoto(row.person?.member_photos ?? null),
    isActiveMember: activeMemberIds.has(row.person_id),
  }));

  return selectTestimonials(candidates);
}

// chapter_memberships is the source of truth for who is a member. Active only:
// on_leave is not active, per the chapter rule applied everywhere else.
async function loadActiveMemberIds(personIds: string[]): Promise<Set<string>> {
  if (personIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from("chapter_memberships")
    .select("person_id, status")
    .in("person_id", personIds)
    .eq("status", "active");

  if (error) {
    // Failing closed means no testimonials rather than quoting a non-member.
    console.warn("getEventTestimonials memberships:", error.message);
    return new Set();
  }

  return new Set(
    ((data ?? []) as { person_id: string }[]).map((row) => row.person_id),
  );
}
