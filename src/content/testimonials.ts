import type { Testimonial } from "@/components/Testimonials";

// Member quotes used on the public pages (/community-events, /forum, /join).
// Add your own members' words here; an empty list hides the section.

export const SOCIALS_TESTIMONIALS: Testimonial[] = [];

export const FORUM_TESTIMONIALS: Testimonial[] = [];

/** The single quote between the /join hero and the application form. Null hides it. */
export const JOIN_TESTIMONIAL: { quote: string; attribution: string } | null = null;
