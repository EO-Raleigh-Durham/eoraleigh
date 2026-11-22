// MyEO Beneath the Chopsticks: the dinner that follows RISE 4 on 13 November.
// The event page asks a few questions before the RSVP form, and each answer
// lands on one of three tickets so the board roster shows which path the
// registrant took. Everyone registers for themselves with name, email, phone
// and an optional dietary note; guests get no extra questions.

import { CHAPTER_NAME } from "../kernel/config/chapter.ts";

export const MYEO_DINNER_SLUG = "myeo-beneath-the-chopsticks";

// Where "I am planning to join RISE 4" sends people. The slug is the live
// RISE 4 path (next.config.ts redirects the longer slugs to it).
export const RISE4_REGISTRATION_HREF =
  "/events/eo-rise-4?utm_source=myeo-dinner&utm_medium=event-page#rsvp";

// The ticket names the board creates on the event. The gate matches on these.
// "<chapter name> Member" and "Guest" are the names the RSVP form already treats as
// the member and guest tickets on RISE 4.
export const DINNER_TICKET_MEMBER = `${CHAPTER_NAME} Member`;
export const DINNER_TICKET_GUEST = "Guest";

export type DinnerPath = "member" | "guest";

type TicketChoice = { id: string; name: string; active?: boolean };

const TICKET_NAME_BY_PATH: Record<DinnerPath, string> = {
  member: DINNER_TICKET_MEMBER,
  guest: DINNER_TICKET_GUEST,
};

// The id of the ticket a path maps to, or "" when the board has not created
// it (or has renamed it). An empty id leaves the RSVP form on its ordinary
// ticket picker, so a naming slip never blocks registration.
export function findDinnerTicketId(
  tickets: ReadonlyArray<TicketChoice>,
  path: DinnerPath,
): string {
  const wanted = TICKET_NAME_BY_PATH[path].toLowerCase();
  const match = tickets.find(
    (ticket) =>
      ticket.active !== false && ticket.name.trim().toLowerCase() === wanted,
  );
  return match?.id ?? "";
}

// The seven-course set menu NÚC Kitchen and Bar sent for the dinner (their
// "Private Event Menu", 9 Nov 2026). The page renders this list, so a menu
// change is an edit here and not a rewrite of the blurb on the board.
export type DinnerCourse = { name: string; ingredients: string[] };

export const DINNER_MENU: ReadonlyArray<DinnerCourse> = [
  {
    name: "Tomato Salad",
    ingredients: ["Cherry Tomato", "Tamarillo", "Edamame Hummus", "Ginger Dressing", "Sorrel"],
  },
  {
    name: "Tiger Prawn, Sourdough",
    ingredients: ["Tiger Prawn", "Garlic", "Chili", "Olive Oil", "Shrimp Jus", "Sourdough Toast"],
  },
  {
    name: "Scallop",
    ingredients: ["Seared Scallop", "Coppa", "Pickled Mizuna", "Lacto Mushroom Sauce"],
  },
  {
    name: "Papalina Pasta, Wild Mushroom",
    ingredients: ["Termite Mushroom", "Shiitake", "Cream", "Long Pepper", "Pecorino Romano"],
  },
  {
    name: "Dry-Aged Striploin, Winged Bean, Toasted Rice Crust",
    ingredients: ["Winged Bean", "Taro", "Seaweed", "Palm Sugar Sauce", "Japanese Mint"],
  },
  {
    name: "Star Gooseberry, Kumquat Tea Granita",
    ingredients: ["Star Gooseberry Sorbet", "Kumquat Tea Granita", "Kumquat Jam"],
  },
  {
    name: "Adzuki Bean Gelato",
    ingredients: ["Red Bean Purée", "Candied Pineapple", "Peanut", "Coconut Cream", "Banana"],
  },
];

// The venue photo that sits beside the menu. The file is committed under
// public/images/events/myeo-beneath-the-chopsticks/.
export const DINNER_VENUE_PHOTO = {
  src: "/images/events/myeo-beneath-the-chopsticks/nuc-dining-room.jpg",
  alt: "The dining room at NÚC Kitchen and Bar, set for dinner with candles, glassware and menu cards on wooden tables",
  width: 1118,
  height: 1118,
} as const;

// The short dinner form (every dinner ticket) asks one optional
// question about allergies. The answer rides on the registration note, which the
// board roster shows, with this prefix so it reads clearly there. Returns ""
// when the answer is empty.
export const DINNER_ALLERGY_MAX = 250;
export const DINNER_ALLERGY_LABEL = "Allergies or dietary needs";
export const DINNER_PHONE_LABEL = "Phone";

export function dinnerAllergyNote(answer: string | null | undefined): string {
  const text = (answer ?? "").replace(/\s+/g, " ").trim().slice(0, DINNER_ALLERGY_MAX);
  return text ? `${DINNER_ALLERGY_LABEL}: ${text}` : "";
}

// The phone typed on the dinner form also rides on the registration note.
// An existing person's profile is never updated from a public form (anyone can
// type any email), so without this line a member's dinner phone was dropped.
export function dinnerPhoneNote(phone: string | null | undefined): string {
  const text = (phone ?? "").replace(/\s+/g, " ").trim();
  return text ? `${DINNER_PHONE_LABEL}: ${text}` : "";
}

// Reads one labelled line ("Label: value") back out of a registration note.
export function noteLineValue(
  notes: string | null | undefined,
  label: string,
): string {
  if (!notes) return "";
  const prefix = `${label}: `;
  const line = notes.split(/\r?\n/).find((entry) => entry.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : "";
}

// Guests register only when invited: on the dinner, the Guest ticket needs a
// valid invitation code (the free code the chapter shares). Members and RISE 4
// attendees register without one. The server enforces this (publicRsvp rejects
// the registration), and the form shows it and keeps the button disabled.
export const GUEST_INVITATION_ERROR =
  "An invitation code is needed to register as a guest. Please use the code you were sent.";

export function guestTicketNeedsInvitation(
  slug: string | null | undefined,
  ticketName: string | null | undefined,
): boolean {
  return slug === MYEO_DINNER_SLUG && /^guest$/i.test((ticketName ?? "").trim());
}

// The invitation code is for guests only. The code box shows, and the server
// accepts a code, only on the dinner's Guest ticket; every other event keeps its
// normal voucher behaviour.
export function invitationCodeAllowed(
  slug: string | null | undefined,
  ticketName: string | null | undefined,
): boolean {
  return slug !== MYEO_DINNER_SLUG || guestTicketNeedsInvitation(slug, ticketName);
}

// Phone and the food allergy question are required on the dinner form, because
// the restaurant needs both. People with nothing to report write "None".
export const DINNER_PHONE_ERROR = "Please enter your phone number.";
export const DINNER_ALLERGY_ERROR =
  "Please tell us about food allergies or dietary needs, or write None.";

export function dinnerMissingFieldError(
  phone: string | null | undefined,
  notes: string | null | undefined,
): string {
  if (!(phone ?? "").trim()) return DINNER_PHONE_ERROR;
  if (!(notes ?? "").trim()) return DINNER_ALLERGY_ERROR;
  return "";
}
