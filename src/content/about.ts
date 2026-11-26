import type { Testimonial } from "@/components/Testimonials";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

// Chapter-specific copy for /about: member quotes, the chapter's own member
// count and the purpose paragraph. Replace these with your chapter's own.

/** Member quotes shown in the "In their own words" carousel. Empty hides it. */
export const COMMUNITY_TESTIMONIALS: Testimonial[] = [
  {
    name: "Dave Hunt",
    quote:
      "It's one thing to be a leader within my own organization. It's another thing to sit alongside other talented leaders, collaborating on creative ideas because we all want to be there and believe in the impact we can collectively achieve. That's been a tremendous learning experience for me.",
  },
  {
    name: "Jesse Lipson",
    role: "Emeritus Sponsor, Founder of ShareFile",
    quote:
      "Since I've joined EO, I've sold two businesses, grown from 3 employees to 75+ and increased revenue 10x. There is no question EO has had a seven figure impact on my business and, more importantly, made me a better entrepreneur and leader.",
  },
];

/** The chapter's own headline stat, shown first in the stats panel. Null hides it. */
export const ABOUT_CHAPTER_STAT: { num: string; label: string } | null = null;

/** Lead paragraph under "Our purpose". */
export const ABOUT_PURPOSE_LEAD = `${CHAPTER_NAME} is a chapter of Entrepreneurs' Organization. Our members are founders of companies with US$1M+ in revenue, and we welcome ambitious business owners from any industry, culture, generation, and geography.`;
