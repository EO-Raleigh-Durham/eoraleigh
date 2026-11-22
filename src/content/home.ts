// Chapter-specific homepage content: member quotes, the "members in the
// news" story and the outdoor-activities blurb. Replace these with your
// chapter's own.

export type HomeQuote = {
  img: string | null;
  name: string;
  role: string;
  quote: string;
};

/** Member quotes in the "In their own words" band. Empty hides it. */
export const HOME_MEMBER_QUOTES: HomeQuote[] = [];

/** The "Members in the news" feature. Null hides the section. */
export type HomeNewsStory = {
  image: string;
  imageAlt: string;
  title: string;
  /** Lead sentence, split around the member's name (shown in bold). */
  leadBefore: string;
  leadName: string;
  leadAfter: string;
  body: string;
  href: string;
};

export const HOME_NEWS_STORY: HomeNewsStory | null = null;

/** Body copy of the "Outdoor activities" card in the programs grid. */
export const HOME_OUTDOOR_COPY = "Treks, rides and sailing weekends with fellow members. Hard challenges, harder bonds, built outside the boardroom.";
