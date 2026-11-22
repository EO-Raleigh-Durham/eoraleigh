// Short tracked links: <site>/l/<code> redirects to a page on the
// site with UTM tags attached, so the link posted in a WhatsApp message or
// a social comment stays ~26 characters instead of ~137 (Tam, 17 Nov 2026)
// while tracking exactly the same.
//
// Pure helpers only (no DB, no Next imports), shared by the public redirect
// route, the board management page, and the tests.

export type ShortLinkTarget = {
  target_path: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
};

// Lowercase letters, digits and hyphens, 2 to 40 characters, starting with
// a letter or digit. Mirrors the CHECK constraint in migration 112.
export const SHORT_CODE_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;

// Normalize a raw code from the URL or the board form: trim, lowercase,
// and validate. Returns null when the result is not a valid code.
export function normalizeShortCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toLowerCase();
  return SHORT_CODE_RE.test(code) ? code : null;
}

// True when a stored target is a page on this site. It must start with a
// single "/", and must not contain a backslash or a control character:
// browsers read "/\host" the same as "//host" (protocol-relative, off-site)
// and drop tabs and newlines before reading the address. The resolved
// address is then checked against the site's own origin as a second guard.
export function isInternalPath(
  path: string,
  origin = "https://example.com",
): boolean {
  if (!/^\/($|[^/])/.test(path)) return false;
  if (/[\\\p{Cc}]/u.test(path)) return false;
  try {
    return new URL(path, origin).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}

// The absolute URL a short link redirects to: the stored site-relative
// target with the stored UTM tags appended. A target that is not a page on
// this site falls back to /events, so this can never produce an off-site
// redirect even on bad data.
export function buildShortLinkDestination(
  origin: string,
  link: ShortLinkTarget,
): string {
  const path = isInternalPath(link.target_path, origin) ? link.target_path : "/events";
  const url = new URL(path, origin);
  const tags: Array<[string, string | null]> = [
    ["utm_source", link.utm_source],
    ["utm_medium", link.utm_medium],
    ["utm_campaign", link.utm_campaign],
    ["utm_content", link.utm_content],
    ["utm_term", link.utm_term],
  ];
  for (const [key, value] of tags) {
    if (value && value.trim()) url.searchParams.set(key, value.trim());
  }
  return url.toString();
}

// ---------------------------------------------------------------------------
// Placements: the fixed list of places a link gets posted. Picking a
// placement fills in the platform, the kind of post and the post name, and
// supplies the short code suffix, so nobody types a code or a tag by hand
// (Ngan, 17 Nov 2026: "i cannot freestyle a code"). The board reads these
// back through describePlacement() so the links table says "WhatsApp,
// Official group" rather than raw tag values.
// ---------------------------------------------------------------------------

export type Placement = {
  key: string;
  // Plain-English name shown in the board.
  label: string;
  utm_source: string;
  utm_medium: string;
  // The post name tag. Ads append the ad's own name.
  utm_content: string;
  // Where to paste the link, in plain words, shown beside it on the board.
  hint: string;
  // The end of the short code, e.g. "wa-of" in decisionlab-wa-of.
  codeSuffix: string;
  // Created by the one-click "all links for this event" button.
  standard: boolean;
  // Ads need a name so two ads for one event stay separate.
  needsLabel: boolean;
};

export const PLACEMENTS: readonly Placement[] = [
  {
    key: "wa-official",
    label: "WhatsApp, Official group",
    hint: "Paste in the Official group announcement",
    utm_source: "whatsapp",
    utm_medium: "social",
    utm_content: "official-group",
    codeSuffix: "wa-of",
    standard: true,
    needsLabel: false,
  },
  {
    key: "wa-social",
    label: "WhatsApp, Social group",
    hint: "Paste in the Social group message",
    utm_source: "whatsapp",
    utm_medium: "social",
    utm_content: "social-group",
    codeSuffix: "wa-so",
    standard: true,
    needsLabel: false,
  },
  {
    key: "facebook",
    label: "Facebook post",
    hint: "Paste in the first comment of the post",
    utm_source: "facebook",
    utm_medium: "social",
    utm_content: "post",
    codeSuffix: "fb",
    standard: true,
    needsLabel: false,
  },
  {
    key: "linkedin",
    label: "LinkedIn post",
    hint: "Paste in the first comment of the post",
    utm_source: "linkedin",
    utm_medium: "social",
    utm_content: "post",
    codeSuffix: "li",
    standard: true,
    needsLabel: false,
  },
  {
    key: "instagram",
    label: "Instagram bio link",
    hint: "Put in the Instagram bio link",
    utm_source: "instagram",
    utm_medium: "social",
    utm_content: "bio",
    codeSuffix: "ig",
    standard: true,
    needsLabel: false,
  },
  {
    key: "wa-visitors",
    label: "WhatsApp, visitors channel",
    hint: "Paste in the visitors channel message",
    utm_source: "whatsapp",
    utm_medium: "social",
    utm_content: "visitors-channel",
    codeSuffix: "wa-vi",
    standard: false,
    needsLabel: false,
  },
  {
    key: "facebook-ad",
    label: "Facebook ad",
    hint: "Use as the ad's destination link",
    utm_source: "facebook",
    utm_medium: "paid_social",
    utm_content: "ad",
    codeSuffix: "fb-ad",
    standard: false,
    needsLabel: true,
  },
  {
    key: "linkedin-ad",
    label: "LinkedIn ad",
    hint: "Use as the ad's destination link",
    utm_source: "linkedin",
    utm_medium: "paid_social",
    utm_content: "ad",
    codeSuffix: "li-ad",
    standard: false,
    needsLabel: true,
  },
  {
    key: "instagram-ad",
    label: "Instagram ad",
    hint: "Use as the ad's destination link",
    utm_source: "instagram",
    utm_medium: "paid_social",
    utm_content: "ad",
    codeSuffix: "ig-ad",
    standard: false,
    needsLabel: true,
  },
];

export function placementByKey(key: string): Placement | null {
  return PLACEMENTS.find((p) => p.key === key) ?? null;
}

// Lowercase, accents removed, anything that is not a letter or digit becomes
// a single hyphen, no hyphen at either end.
export function slugPart(text: string | null | undefined): string {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Cut to the 40-character code limit without leaving a hyphen at the end.
function clampCode(code: string): string {
  return code.slice(0, 40).replace(/-+$/g, "");
}

// The last piece of a page address, without any query or fragment:
// "/events/decisionlab-december-2026?x=1" gives "decisionlab-december-2026".
function lastSegment(path: string): string {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/g, "");
  const segment = clean.slice(clean.lastIndexOf("/") + 1);
  return slugPart(segment) || "site";
}

// First part of every code for a page: the page name, cut at a hyphen so a
// long event slug still leaves room for the rest, e.g. "decisionlab".
function codePrefix(campaign: string): string {
  if (campaign.length <= 14) return campaign;
  const cut = campaign.slice(0, 14);
  const lastHyphen = cut.lastIndexOf("-");
  return lastHyphen >= 4 ? cut.slice(0, lastHyphen) : cut.replace(/-+$/g, "");
}

export type PlacementSpec = ShortLinkTarget & {
  // The code to try first; the server adds -2, -3 if another link has it.
  codeBase: string;
};

// Everything a link needs, worked out from the page and the placement:
// utm_campaign is the page's own name, so registrations group per event.
// `label` is optional for posts (a second Facebook post for the same event)
// and required for ads (the ad's name).
export function buildPlacementSpec(
  pagePath: string,
  placement: Placement,
  label?: string | null,
): PlacementSpec | { error: string } {
  const campaign = lastSegment(pagePath);
  const labelSlug = slugPart(label).slice(0, 20);
  if (placement.needsLabel && !labelSlug) {
    return { error: "Give the ad a short name, for example founder-quote" };
  }
  const content = placement.needsLabel
    ? `ad-${labelSlug}`
    : labelSlug
      ? `${placement.utm_content}-${labelSlug}`
      : placement.utm_content;
  const codeBase = clampCode(
    [codePrefix(campaign), placement.codeSuffix, labelSlug]
      .filter(Boolean)
      .join("-"),
  );
  return {
    target_path: pagePath,
    utm_source: placement.utm_source,
    utm_medium: placement.utm_medium,
    utm_campaign: campaign,
    utm_content: content,
    utm_term: null,
    codeBase,
  };
}

// Short codes for platforms people name by hand ("Something else" in the
// board's "Where will it be posted?" list).
const SOURCE_ABBREVIATIONS: Record<string, string> = {
  whatsapp: "wa",
  facebook: "fb",
  linkedin: "li",
  instagram: "ig",
  zalo: "zl",
  email: "em",
  youtube: "yt",
  tiktok: "tt",
};

// A link for a place that is not in PLACEMENTS: the board member names the
// platform or place (and optionally the post) and everything else follows the
// same rules as a listed place.
export function buildCustomSpec(
  pagePath: string,
  source: string,
  post?: string | null,
): PlacementSpec | { error: string } {
  const sourceSlug = slugPart(source).slice(0, 30);
  if (!sourceSlug) return { error: "Name the platform or place the link will be posted" };
  const postSlug = slugPart(post).slice(0, 20);
  const campaign = lastSegment(pagePath);
  const abbreviation = SOURCE_ABBREVIATIONS[sourceSlug] ?? codePrefix(sourceSlug);
  return {
    target_path: pagePath,
    utm_source: sourceSlug,
    utm_medium: "social",
    utm_campaign: campaign,
    utm_content: postSlug || "post",
    utm_term: null,
    codeBase: clampCode(
      [codePrefix(campaign), abbreviation, postSlug].filter(Boolean).join("-"),
    ),
  };
}

// The placement a stored link was made from, or null for a custom link. A
// link made with a post or ad name (content "post-reminder-1", "ad-a")
// belongs to the same placement as its plain version.
export function placementForLink(link: {
  utm_source: string | null;
  utm_medium: string | null;
  utm_content: string | null;
}): Placement | null {
  const source = link.utm_source ?? "";
  const medium = link.utm_medium ?? "";
  const content = link.utm_content ?? "";
  for (const p of PLACEMENTS) {
    if (p.utm_source !== source || p.utm_medium !== medium) continue;
    if (p.utm_content === content || content.startsWith(`${p.utm_content}-`)) {
      return p;
    }
  }
  return null;
}

// What a link is for, in plain English, from its stored tags.
export function describePlacement(link: {
  utm_source: string | null;
  utm_medium: string | null;
  utm_content: string | null;
}): string {
  const content = link.utm_content ?? "";
  const placement = placementForLink(link);
  if (placement) {
    return placement.utm_content === content
      ? placement.label
      : `${placement.label}: ${content.slice(placement.utm_content.length + 1)}`;
  }
  const platform = [
    link.utm_source ?? "",
    link.utm_medium === "paid_social" ? "ad" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return [platform, content].filter(Boolean).join(", ") || "No tags";
}

// A readable name for a page address when its title is not known:
// "/events/tenured-new-members-dinner-november-2026" gives
// "Tenured new members dinner november 2026".
export function humanizePath(path: string): string {
  const words = lastSegment(path).replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// The pages the board form offers: events from the database plus any pinned
// page that is not guaranteed to be there, de-duplicated by address (the
// first entry for an address wins).
export type LinkablePage = {
  path: string;
  title: string;
  // When the event starts, if it has a date (the join page does not).
  startsAt?: string | null;
};

// Blog posts live at /post/<slug>. Newest first, a post listed twice (once
// from the database, once pinned) appears once, and a post with no slug is
// skipped. `startsAt` carries the publish date.
export function blogPostPages(
  posts: Array<{ slug: string; title: string; published_at: string | null }>,
): LinkablePage[] {
  const pages = posts
    .filter((post) => post.slug.trim() !== "")
    .map(
      (post): LinkablePage => ({
        path: `/post/${post.slug.trim()}`,
        title: post.title,
        startsAt: post.published_at,
      }),
    )
    .sort(
      (a, b) =>
        (Date.parse(b.startsAt ?? "") || 0) - (Date.parse(a.startsAt ?? "") || 0),
    );
  return dedupeLinkablePages(pages);
}

export function dedupeLinkablePages(pages: LinkablePage[]): LinkablePage[] {
  const seen = new Set<string>();
  const out: LinkablePage[] = [];
  for (const page of pages) {
    if (seen.has(page.path)) continue;
    seen.add(page.path);
    out.push(page);
  }
  return out;
}
