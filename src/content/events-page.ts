import type { Testimonial } from "@/components/Testimonials";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

// Chapter-specific content for /events: member quotes, hand-pinned event
// cards and the hero copy. Replace these with your chapter's own.

/** A hand-written event card listed above the database events. */
export type PinnedEvent = {
  href: string;
  /** ISO timestamp after which the card is hidden. */
  until: string;
  day: string;
  month: string;
  cat: string;
  title: string;
  meta: [string, string];
};

export const EVENTS_PAGE_DESCRIPTION = `The ${CHAPTER_NAME} member calendar: monthly learning events, Forum gatherings and signature programs.`;

export const EVENTS_HERO_LEAD = `Monthly learning events with operators who have done it. Forum gatherings. Signature programs with EO chapters around the world. The full ${CHAPTER_NAME} calendar, in one place.`;

/** Member quotes shown under the calendar. Empty hides the section. */
export const LEARNING_TESTIMONIALS: Testimonial[] = [];

/** Hand-pinned event cards that are not in the database. */
export const PINNED_EVENTS: PinnedEvent[] = [];

/** Old event slugs whose database row should not be listed. */
export const RETIRED_EVENT_SLUGS: string[] = [];
