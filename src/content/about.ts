import type { Testimonial } from "@/components/Testimonials";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

// Chapter-specific copy for /about: member quotes, the chapter's own member
// count and the purpose paragraph. Replace these with your chapter's own.

/** Member quotes shown in the "In their own words" carousel. Empty hides it. */
export const COMMUNITY_TESTIMONIALS: Testimonial[] = [];

/** The chapter's own headline stat, shown first in the stats panel. Null hides it. */
export const ABOUT_CHAPTER_STAT: { num: string; label: string } | null = null;

/** Lead paragraph under "Our purpose". */
export const ABOUT_PURPOSE_LEAD = `${CHAPTER_NAME} is a chapter of Entrepreneurs' Organization. Our members are founders of companies with US$1M+ in revenue, and we welcome ambitious business owners from any industry, culture, generation, and geography.`;
