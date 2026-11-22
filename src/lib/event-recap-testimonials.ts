// Testimonial selection for event recaps.
//
// Three member voices per recap, chosen in code before the model sees
// anything. The generator places them verbatim: it never picks, edits, or
// writes a quote.
//
// Pure, no Supabase client, so every rule below is directly testable.

export const TESTIMONIAL_COUNT = 3;
// Under 40 characters is "Great event!", which proves nothing.
export const MIN_QUOTE_LENGTH = 40;
// Over 280 characters stops being a card and starts being a paragraph.
export const MAX_QUOTE_LENGTH = 280;

export type TestimonialCandidate = {
  personId: string;
  // event_feedback.loved_text. improve_text is NEVER a source: it is critical
  // feedback given in confidence and must not reach a public page.
  lovedText: string | null;
  rating: number | null;
  name: string | null;
  role: string | null;
  photoUrl: string | null;
  isActiveMember: boolean;
};

export type Testimonial = {
  quote: string;
  name: string;
  role?: string;
  rating?: number;
  photoUrl?: string;
};

function isEligible(candidate: TestimonialCandidate): boolean {
  // Members only. A recap is member proof, so the faces on it have to be
  // members. on_leave is excluded upstream, as everywhere else in the codebase.
  if (!candidate.isActiveMember) return false;
  // No anonymous quotes: a quote with no name is not social proof.
  if (!candidate.name || candidate.name.trim().length === 0) return false;

  const quote = candidate.lovedText?.trim() ?? "";
  if (quote.length < MIN_QUOTE_LENGTH) return false;
  if (quote.length > MAX_QUOTE_LENGTH) return false;
  return true;
}

function compare(a: TestimonialCandidate, b: TestimonialCandidate): number {
  // Highest rating first.
  const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
  if (ratingDiff !== 0) return ratingDiff;

  // Then the more substantive quote.
  const lengthDiff =
    (b.lovedText?.trim().length ?? 0) - (a.lovedText?.trim().length ?? 0);
  if (lengthDiff !== 0) return lengthDiff;

  // Then prefer a member with a photo, so the block looks its best.
  const aPhoto = a.photoUrl ? 1 : 0;
  const bPhoto = b.photoUrl ? 1 : 0;
  if (aPhoto !== bPhoto) return bPhoto - aPhoto;

  // Stable tiebreak so the same input always produces the same recap.
  return a.personId.localeCompare(b.personId);
}

export function selectTestimonials(
  candidates: TestimonialCandidate[],
  limit: number = TESTIMONIAL_COUNT,
): Testimonial[] {
  const eligible = candidates.filter(isEligible).sort(compare);

  const seen = new Set<string>();
  const chosen: Testimonial[] = [];

  for (const candidate of eligible) {
    if (chosen.length >= limit) break;
    // One quote per person. No stacking the block with a single enthusiast.
    if (seen.has(candidate.personId)) continue;
    seen.add(candidate.personId);

    const testimonial: Testimonial = {
      quote: candidate.lovedText!.trim(),
      name: candidate.name!.trim(),
    };
    if (candidate.role) testimonial.role = candidate.role;
    if (typeof candidate.rating === "number") testimonial.rating = candidate.rating;
    if (candidate.photoUrl) testimonial.photoUrl = candidate.photoUrl;
    chosen.push(testimonial);
  }

  return chosen;
}

// The testimonial-row block, or null when nothing qualified. Fewer than three
// is fine; zero renders nothing. Never pad, never invent.
export function testimonialBlock(
  testimonials: Testimonial[],
): { tag: "testimonial-row"; items: Testimonial[] } | null {
  if (testimonials.length === 0) return null;
  return { tag: "testimonial-row", items: testimonials };
}

// The fixed teaser closing every recap. Assembled here rather than generated so
// the wording cannot drift between recaps.
export const TEASER_LABEL = "For the full event gallery and learnings, click here";

export function teaserBlock(
  postSlug: string,
): { tag: "cta-button"; label: string; href: string; tone: "primary" } {
  return {
    tag: "cta-button",
    label: TEASER_LABEL,
    href: `/post/${postSlug}`,
    tone: "primary",
  };
}
