// The /plans access-code gate (Dave, 2026-11-21). Internal documents under
// public/plans/ (the security access matrix first) are served only to someone
// who has entered the chapter's plans code. The code lives in the PLANS_CODE
// environment variable, never in the repo. Entering it sets an HttpOnly cookie
// holding a hash of the code, so changing PLANS_CODE signs everyone out.
// Edge-safe: Web Crypto and chapter config only. Used by src/proxy.ts.

import { CHAPTER_NAME, CHAPTER_SITE_URL } from "../kernel/config/chapter.ts";

export const PLANS_PREFIX = "/plans";
export const PLANS_COOKIE = "eov_plans";
const COOKIE_DAYS = 30;

export function isPlansPath(pathname: string): boolean {
  return pathname === PLANS_PREFIX || pathname.startsWith(`${PLANS_PREFIX}/`);
}

/** Hex SHA-256 of the code, salted with the cookie name. */
export async function plansToken(code: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${PLANS_COOKIE}:${code}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export type PlansDecision =
  | { kind: "pass" }
  | { kind: "unconfigured" }
  | { kind: "form"; wrong: boolean }
  | { kind: "unlock"; token: string };

/**
 * What to do with a request under /plans: let it through (valid cookie), ask
 * for the code, or unlock (a POSTed code that matches). `submitted` is the
 * POSTed code, or null for any other request.
 */
export async function decidePlans(
  expected: string | undefined,
  cookie: string | undefined,
  submitted: string | null,
): Promise<PlansDecision> {
  if (!expected) return { kind: "unconfigured" };
  const token = await plansToken(expected);
  if (submitted !== null) {
    return sameText(await plansToken(submitted.trim()), token) ? { kind: "unlock", token } : { kind: "form", wrong: true };
  }
  if (cookie && sameText(cookie, token)) return { kind: "pass" };
  return { kind: "form", wrong: false };
}

export const PLANS_COOKIE_MAX_AGE = COOKIE_DAYS * 24 * 60 * 60;

// Link previews for plans shared in chat apps. Preview bots never hold the
// code, so they only ever see the form: it carries the page's share card. The
// image lives outside /plans so bots can fetch it. Keys are clean paths.
const SITE = CHAPTER_SITE_URL;
const PREVIEWS: Record<string, { title: string; description: string; image: string }> = {
  "/plans/membership-campaign-review": {
    title: `${CHAPTER_NAME}: our 30-day membership campaign plan`,
    description: `The plan, ads, motion videos and the math behind ${CHAPTER_NAME}'s membership campaign, built with Claude.`,
    image: "/images/plans/membership-campaign-og.jpg",
  },
  "/plans/30-day-membership-campaign": {
    title: `${CHAPTER_NAME}: our 30-day membership campaign plan`,
    description: `Audience, budget, funnel math and timeline for ${CHAPTER_NAME}'s membership campaign, built with Claude.`,
    image: "/images/plans/membership-campaign-og.jpg",
  },
};

const PREVIEW_BOTS = /facebookexternalhit|facebookcatalog|meta-externalagent|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|SkypeUriPreview|Zalo/i;

/** Chat and social apps that fetch a page only to draw its link preview. */
export function isLinkPreviewBot(userAgent: string | null): boolean {
  return !!userAgent && PREVIEW_BOTS.test(userAgent);
}

function escapeAttr(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Open Graph tags for a plans path, or "" when it has no share card. */
export function plansPreviewTags(pathname: string): string {
  const p = PREVIEWS[pathname.replace(/\.html$/, "").replace(/\/$/, "")];
  if (!p) return "";
  const url = `${SITE}${pathname.replace(/\.html$/, "")}`;
  return [
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escapeAttr(CHAPTER_NAME)}">`,
    `<meta property="og:title" content="${escapeAttr(p.title)}">`,
    `<meta property="og:description" content="${escapeAttr(p.description)}">`,
    `<meta property="og:url" content="${escapeAttr(url)}">`,
    `<meta property="og:image" content="${SITE}${p.image}">`,
    `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ].join("");
}

/** The code form, on the site's tokens (EO Blue, Base Blue, Roboto). */
export function plansFormHtml(wrong: boolean, pathname = ""): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${CHAPTER_NAME} Plans</title><meta name="description" content="Internal ${CHAPTER_NAME} documents. Enter the access code to continue.">${plansPreviewTags(pathname)}
<style>:root{--eo-blue:#3D46F2;--base-blue:#0C0C31;--ink-600:#5E617D;--ink-200:#D8D9E2;--eo-pink:#FF346E;--paper:#FFFFFF}
body{margin:0;background:var(--paper);color:var(--base-blue);font-family:Roboto,-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}
form{width:100%;max-width:360px}h1{font-size:22px;margin:0 0 8px}p{color:var(--ink-600);font-size:14px;margin:0 0 16px}
input{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:12px;border:1px solid var(--ink-200);margin-bottom:12px}
button{width:100%;font:inherit;font-size:16px;font-weight:500;padding:12px;border:0;background:var(--eo-blue);color:var(--paper);cursor:pointer}
.err{color:var(--eo-pink)}</style></head><body><form method="post">
<h1>${CHAPTER_NAME} plans</h1><p${wrong ? ' class="err"' : ""}>${wrong ? "That code is not right. Try again." : "Enter the access code to read this document."}</p>
<input name="code" type="password" autocomplete="current-password" aria-label="Access code" required autofocus>
<button type="submit">Open</button></form></body></html>`;
}
