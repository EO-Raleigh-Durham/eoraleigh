import type { Block } from "@/lib/blog";

// Static event recaps, keyed by event slug.
//
// The event detail page (src/app/events/[id]/page.tsx) renders the DB recap
// (events.recap_blocks) when one is published, and falls back to this map
// otherwise. Add a recap here for an event that only has a companion page.

// True when a static recap exists for this event slug.
export function hasStaticRecap(slug: string | null | undefined): boolean {
  return !!slug && slug in EVENT_RECAPS;
}

export const EVENT_RECAPS: Record<string, Block[]> = {};
