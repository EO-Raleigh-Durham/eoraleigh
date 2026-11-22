// First-touch marketing attribution.
//
// Pure, isomorphic helpers (no DB, no browser globals at import time) so
// this can be imported from both the server (the /api/join route, which
// derives + stores channel_source) and the client (which captures it).
// Maps raw UTM / referrer signals onto the funnel's channel_source
// taxonomy from 015_crm_enums — the same enum HubSpot uses — so a
// captured lead joins to conversion-by-channel analysis.

export type ChannelSource =
  | "Organic Search"
  | "Paid Search"
  | "Email Marketing"
  | "Organic Social"
  | "Referrals"
  | "Other Campaigns"
  | "Direct Traffic"
  | "Offline Sources"
  | "Paid Social"
  | "AI Referrals";

export type Attribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  landing_path: string | null;
};

const SOCIAL_HOSTS = [
  "linkedin.", "lnkd.in", "facebook.", "fb.com", "fb.me", "instagram.",
  "t.co", "twitter.", "x.com", "youtube.", "youtu.be", "tiktok.", "zalo.",
];
const SEARCH_HOSTS = [
  "google.", "bing.", "yahoo.", "duckduckgo.", "baidu.", "yandex.", "ecosia.",
];
const AI_HOSTS = [
  "chatgpt.com", "chat.openai.com", "perplexity.", "claude.ai",
  "gemini.google", "copilot.microsoft",
];

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function matches(host: string | null, needles: string[]): boolean {
  return host ? needles.some((n) => host.includes(n)) : false;
}

// Derive the first-touch channel_source from captured attribution.
// Paid signals (explicit UTM medium) win; otherwise infer from the
// referrer host. Falls back to Direct Traffic when there is no signal.
export function deriveChannelSource(a: Attribution): ChannelSource {
  const medium = (a.utm_medium ?? "").toLowerCase();
  const source = (a.utm_source ?? "").toLowerCase();
  const refHost = hostOf(a.referrer);

  if (/(^|[-_ ])(cpc|ppc|paid|paidsearch|sem)([-_ ]|$)/.test(medium)) {
    if (matches(refHost, SOCIAL_HOSTS) || /facebook|instagram|linkedin|tiktok|twitter|^x$/.test(source)) {
      return "Paid Social";
    }
    return "Paid Search";
  }
  if (medium.includes("paid_social") || medium.includes("paidsocial")) return "Paid Social";
  if (medium === "email" || source === "email" || /newsletter|mailchimp|resend|brevo/.test(source)) {
    return "Email Marketing";
  }
  if (medium === "social" || medium === "organic_social" || matches(refHost, SOCIAL_HOSTS)) {
    return "Organic Social";
  }
  if (medium === "referral") return "Referrals";

  // No usable UTM medium — infer from the referrer.
  if (matches(refHost, AI_HOSTS)) return "AI Referrals";
  if (matches(refHost, SEARCH_HOSTS)) return "Organic Search";
  if (refHost) return "Referrals";
  if (a.utm_campaign || a.utm_source) return "Other Campaigns";
  return "Direct Traffic";
}

// Build an Attribution from a query string + referrer + path. Used by the
// client capture; kept here (pure) so it is unit-testable without a DOM.
export function parseAttribution(
  search: string,
  referrer: string,
  path: string,
): Attribution {
  const p = new URLSearchParams(search);
  const get = (k: string) => {
    const v = p.get(k);
    return v && v.trim() ? v.trim() : null;
  };
  return {
    utm_source: get("utm_source"),
    utm_medium: get("utm_medium"),
    utm_campaign: get("utm_campaign"),
    utm_content: get("utm_content"),
    utm_term: get("utm_term"),
    referrer: referrer && referrer.trim() ? referrer.trim() : null,
    landing_path: path && path.trim() ? path.trim() : null,
  };
}

// Whether there is any marketing signal worth attributing (beyond Direct).
export function hasSignal(a: Attribution): boolean {
  return Boolean(
    a.utm_source || a.utm_medium || a.utm_campaign ||
    a.utm_content || a.utm_term || a.referrer,
  );
}

// Whether the visit carries explicit UTM tags (a tagged link was clicked),
// as opposed to only a referrer or nothing at all.
export function hasUtm(a: Attribution): boolean {
  return Boolean(
    a.utm_source || a.utm_medium || a.utm_campaign ||
    a.utm_content || a.utm_term,
  );
}

// First-touch storage policy: the stored touch wins, with one exception. A
// visit that arrives through a UTM-tagged link replaces a stored touch that
// had no UTM tags. Without this, someone who once opened the site directly
// could never be attributed to the tagged post link they clicked later, and
// per-post attribution (the whole point of tagging comment links) would
// silently undercount.
export function replacesFirstTouch(
  existing: Attribution | null,
  next: Attribution,
): boolean {
  if (!existing) return true;
  return hasUtm(next) && !hasUtm(existing);
}

// Coerce an untrusted value (e.g. a field from a JSON request body) into a
// safe Attribution, dropping non-strings and truncating long values.
// Returns null when nothing usable is present.
export function coerceAttribution(raw: unknown): Attribution | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const s = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t ? t.slice(0, 500) : null;
  };
  const a: Attribution = {
    utm_source: s(o.utm_source),
    utm_medium: s(o.utm_medium),
    utm_campaign: s(o.utm_campaign),
    utm_content: s(o.utm_content),
    utm_term: s(o.utm_term),
    referrer: s(o.referrer),
    landing_path: s(o.landing_path),
  };
  const any =
    a.utm_source || a.utm_medium || a.utm_campaign || a.utm_content ||
    a.utm_term || a.referrer || a.landing_path;
  return any ? a : null;
}
