// The chapter this deployment runs for. Every place the code names the
// chapter, its city, its timezone or its local currency reads it from here,
// so any EO chapter can run the same code by setting environment
// variables instead of editing files (Plan 40, open-source Chapter Manager).
//
// All values are NEXT_PUBLIC so client components can read them; none is a
// secret. Defaults are deliberately neutral: an unset variable shows
// "EO Chapter" or UTC, never another chapter's name. EO's fiscal year
// (1 July to 30 June) is global and stays in src/lib/fiscal-year.ts.

function env(value: string | undefined, fallback: string): string {
  const v = (value ?? "").trim();
  return v || fallback;
}

/** Full chapter name, e.g. "EO Example". */
export const CHAPTER_NAME = env(process.env.NEXT_PUBLIC_ORG_NAME, "EO Chapter");

/** Short label for tight spaces and subject tags, e.g. "EOEX". */
export const CHAPTER_SHORT_NAME = env(process.env.NEXT_PUBLIC_CHAPTER_SHORT_NAME, CHAPTER_NAME);

/** Slug of this chapter's row in public.brands, e.g. "eo-example". */
export const CHAPTER_SLUG = env(process.env.NEXT_PUBLIC_CHAPTER_SLUG, "eo-chapter");

/** Main city, used as the default event venue city, e.g. "Example City". */
export const CHAPTER_CITY = env(process.env.NEXT_PUBLIC_CHAPTER_CITY, "");

/** Country or region, e.g. "Exampleland". */
export const CHAPTER_COUNTRY = env(process.env.NEXT_PUBLIC_CHAPTER_COUNTRY, "");

/** IANA timezone the chapter's calendar runs on, e.g. "Asia/Singapore". */
export const CHAPTER_TIME_ZONE = env(process.env.NEXT_PUBLIC_CHAPTER_TIME_ZONE, "UTC");

/** Short timezone label shown next to times, e.g. "SGT". */
export const CHAPTER_TIME_ZONE_LABEL = env(process.env.NEXT_PUBLIC_CHAPTER_TIME_ZONE_LABEL, CHAPTER_TIME_ZONE);

/** Local currency besides USD, e.g. "SGD". Empty means USD only. */
export const CHAPTER_LOCAL_CURRENCY = env(process.env.NEXT_PUBLIC_CHAPTER_LOCAL_CURRENCY, "").toUpperCase();

/** Fixed planning rate: local currency units per US dollar, e.g. 1.35. */
export const CHAPTER_LOCAL_PER_USD = Number(env(process.env.NEXT_PUBLIC_CHAPTER_LOCAL_PER_USD, "0")) || 0;

/** Public site address, no trailing slash, e.g. "https://www.eo-chapter.example". */
export const CHAPTER_SITE_URL = env(process.env.NEXT_PUBLIC_SITE_URL, "").replace(/\/+$/, "");

/** Bare host of the public site, e.g. "eo-chapter.example". */
export const CHAPTER_DOMAIN = CHAPTER_SITE_URL.replace(/^https?:\/\//, "").replace(/^www\./, "");

/** Public contact address shown on pages, e.g. "hello@eo-chapter.example". */
export const CHAPTER_CONTACT_EMAIL = env(process.env.NEXT_PUBLIC_SUPPORT_EMAIL, "");

/** Staff address for the chapter office, e.g. "office@eo-chapter.example". */
export const CHAPTER_MANAGER_EMAIL = env(process.env.NEXT_PUBLIC_CHAPTER_MANAGER_EMAIL, CHAPTER_CONTACT_EMAIL);

/** Partnerships address, e.g. "partners@eo-chapter.example". */
export const CHAPTER_PARTNERS_EMAIL = env(process.env.NEXT_PUBLIC_CHAPTER_PARTNERS_EMAIL, CHAPTER_CONTACT_EMAIL);

/** Board address, e.g. "board@eo-chapter.example". */
export const CHAPTER_BOARD_EMAIL = env(process.env.NEXT_PUBLIC_CHAPTER_BOARD_EMAIL, CHAPTER_CONTACT_EMAIL);

/** Privacy enquiries address, e.g. "privacy@eo-chapter.example". */
export const CHAPTER_PRIVACY_EMAIL = env(process.env.NEXT_PUBLIC_CHAPTER_PRIVACY_EMAIL, CHAPTER_CONTACT_EMAIL);

/** Marketing address for photo opt-outs and consent withdrawals, e.g. "marketing@eo-chapter.example". */
export const CHAPTER_MARKETING_EMAIL = env(process.env.NEXT_PUBLIC_CHAPTER_MARKETING_EMAIL, CHAPTER_CONTACT_EMAIL);

/** Name of the chapter's staff manager, shown in cancellation policies. Empty leaves the name out. */
export const CHAPTER_MANAGER_NAME = env(process.env.NEXT_PUBLIC_CHAPTER_MANAGER_NAME, "");

/** Staff manager's WhatsApp number, e.g. "+15550100". Empty leaves it out. */
export const CHAPTER_MANAGER_WHATSAPP = env(process.env.NEXT_PUBLIC_CHAPTER_MANAGER_WHATSAPP, "");

/** ISO 3166-1 alpha-2 country code for structured data, e.g. "SG". Empty omits it. */
export const CHAPTER_COUNTRY_CODE = env(process.env.NEXT_PUBLIC_CHAPTER_COUNTRY_CODE, "").toUpperCase();

/** The messaging app members prefer locally, e.g. "WhatsApp". Empty hides the mention. */
export const CHAPTER_CHAT_APP = env(process.env.NEXT_PUBLIC_CHAPTER_CHAT_APP, "");

/** Public link to reach the chapter on that app. Empty hides the footer link. */
export const CHAPTER_CHAT_URL = env(process.env.NEXT_PUBLIC_CHAPTER_CHAT_URL, "");

/** Cities offered on the membership application, comma separated. Empty shows a free-text field. */
export const CHAPTER_CITIES = env(process.env.NEXT_PUBLIC_CHAPTER_CITIES, "")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);

/** Short placeholder for phone inputs, e.g. "+65 ...". */
export const CHAPTER_PHONE_PLACEHOLDER = env(process.env.NEXT_PUBLIC_CHAPTER_PHONE_PLACEHOLDER, "+1 555 0100");

/** Full example number for phone inputs on the profile page. */
export const CHAPTER_PHONE_EXAMPLE = env(process.env.NEXT_PUBLIC_CHAPTER_PHONE_EXAMPLE, CHAPTER_PHONE_PLACEHOLDER);
