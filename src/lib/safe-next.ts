// Shared by the login pages and the proxy. A post-login "next" destination is
// honored only if it is a same-site path: this blocks open redirects
// (https://evil.com, //evil.com, /\evil.com) and login-page loops.
export function safeNextPath(raw: string | null): string | null {
  if (!raw) return null;
  // URL parsers strip ASCII control characters (tab, CR, LF) BEFORE parsing,
  // so "/\t/evil.com" passes a naive startsWith check yet navigates to
  // //evil.com. Reject anything containing a control character outright.
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  // No login loops: compare the bare path, ignoring query, fragment, and
  // trailing slashes, so /login/, /login#x, /admin/login/?a=b are all caught.
  const path = raw.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  if (path === "/login" || path === "/admin/login") return null;
  return raw;
}

/** The path portion of a (already-safe) next value, for tier lookups. */
export function nextPathname(next: string): string {
  return next.split(/[?#]/, 1)[0];
}
