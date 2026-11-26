import type { Testimonial } from "@/components/Testimonials";

// Member quotes used on the public pages (/community-events, /forum, /join).
// Add your own members' words here; an empty list hides the section.

export const SOCIALS_TESTIMONIALS: Testimonial[] = [];

export const FORUM_TESTIMONIALS: Testimonial[] = [
  {
    name: "Sara Blakely",
    role: "Founder of Spanx, EO Atlanta member",
    quote:
      "EO has provided me with a great, trusted circle of friends. I have been in a Forum for 14 years, with primarily the same 10 guys. I attribute so much of Spanx's success to the advice I've received from these brilliant business owners in the trusted, confidential EO format.",
  },
];

/** The single quote between the /join hero and the application form. Null hides it. */
export const JOIN_TESTIMONIAL: { quote: string; attribution: string } | null = {
  quote:
    "Since I've joined EO, I've sold two businesses, grown from 3 employees to 75+ and increased revenue 10x. There is no question EO has had a seven figure impact on my business and, more importantly, made me a better entrepreneur and leader.",
  attribution: "Jesse Lipson, Emeritus Sponsor, Founder of ShareFile",
};
