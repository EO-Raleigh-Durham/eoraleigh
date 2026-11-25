// Pre-launch access code for the whole site. While SITE_ACCESS_CODE is set,
// every page asks for the code first; leave it unset (the default) and the
// site is open as usual. For a chapter trying the app with real data before
// launch, or keeping a staging copy private.
//
// Same approach as the /plans gate (plans-gate.ts): the code lives only in the
// environment, entering it sets an HttpOnly cookie holding a salted hash of it,
// and changing the code signs everyone out. API routes are not matched by the
// proxy at all (cron jobs, Stripe, the MCP endpoint carry their own auth), and
// OAuth discovery under /.well-known stays open so a connector can find the
// sign-in server. Edge-safe: Web Crypto and chapter config only.

import { CHAPTER_NAME } from "../kernel/config/chapter.ts";

export const SITE_GATE_COOKIE = "site_access";
export const SITE_GATE_FIELD = "site_access_code";
export const SITE_GATE_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

/** Paths that stay reachable without the code. */
export function isSiteGateExempt(pathname: string): boolean {
  return pathname.startsWith("/.well-known/") || pathname === "/robots.txt";
}

/** Hex SHA-256 of the code, salted with the cookie name. */
export async function siteGateToken(code: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${SITE_GATE_COOKIE}:${code}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export type SiteGateDecision =
  | { kind: "off" }
  | { kind: "pass" }
  | { kind: "form"; wrong: boolean }
  | { kind: "unlock"; token: string };

/**
 * What to do with a request: let it through (gate off, or a valid cookie), ask
 * for the code, or unlock (a submitted code that matches). `submitted` is the
 * code from the gate's own form, or null for any other request.
 */
export async function decideSiteGate(
  expected: string | undefined,
  cookie: string | undefined,
  submitted: string | null,
): Promise<SiteGateDecision> {
  if (!expected) return { kind: "off" };
  const token = await siteGateToken(expected);
  if (cookie && sameText(cookie, token)) return { kind: "pass" };
  if (submitted !== null) {
    return sameText(await siteGateToken(submitted.trim()), token) ? { kind: "unlock", token } : { kind: "form", wrong: true };
  }
  return { kind: "form", wrong: false };
}

/** The code form, on the site's tokens (EO Blue, Base Blue, Roboto). */
export function siteGateFormHtml(wrong: boolean): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${CHAPTER_NAME}</title>
<style>:root{--eo-blue:#3D46F2;--base-blue:#0C0C31;--ink-600:#5E617D;--ink-200:#D8D9E2;--eo-pink:#FF346E;--paper:#FFFFFF}
body{margin:0;background:var(--paper);color:var(--base-blue);font-family:Roboto,-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}
form{width:100%;max-width:360px}h1{font-size:22px;margin:0 0 8px}p{color:var(--ink-600);font-size:14px;margin:0 0 16px}
input{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:12px;border:1px solid var(--ink-200);margin-bottom:12px}
button{width:100%;font:inherit;font-size:16px;font-weight:500;padding:12px;border:0;background:var(--eo-blue);color:var(--paper);cursor:pointer}
.err{color:var(--eo-pink)}</style></head><body><form method="post">
<h1>${CHAPTER_NAME}</h1><p${wrong ? ' class="err"' : ""}>${wrong ? "That code is not right. Try again." : "This site is not open yet. Enter the access code to continue."}</p>
<input name="${SITE_GATE_FIELD}" type="password" autocomplete="current-password" aria-label="Access code" required autofocus>
<button type="submit">Continue</button></form></body></html>`;
}
