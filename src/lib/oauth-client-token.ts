// Which sign-ins are the website's own, and which belong to an OAuth client
// (MCP.0, following Edge8's kernel/identity/oauth-client-token.ts).
//
// Supabase Auth's OAuth server issues ordinary user JWTs to the apps a person
// connects (Claude, ChatGPT, Grok): the same token a browser sign-in holds,
// plus a `client_id` claim naming the app. GoTrue accepts either, so a
// connector token placed in a session cookie would open /board, /admin and
// every Server Action as that person, far past the connector's own tools.
// Every cookie reader therefore asks firstPartyUser, which refuses a session
// whose token names a client, and /api/mcp accepts only a token that does.
// Edge-safe: the proxy imports it.
import type { SupabaseClient, User } from "@supabase/supabase-js";

type Claims = { client_id?: unknown };

/** A JWT's payload, or null when it cannot be read. It does not verify the token. */
function claimsOf(jwt: string): Claims | null {
  const payload = jwt.split(".")[1];
  if (!payload) return null;
  try {
    const json = atob(
      payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "="),
    );
    const claims: unknown = JSON.parse(json);
    return claims && typeof claims === "object" ? (claims as Claims) : null;
  } catch {
    return null;
  }
}

/**
 * The `client_id` claim of a JWT, or null when it has none or cannot be read.
 * It does not verify the token: call it only on a token GoTrue has accepted.
 */
export function oauthClientOf(jwt: string | null | undefined): string | null {
  const claims = typeof jwt === "string" ? claimsOf(jwt) : null;
  return typeof claims?.client_id === "string" && claims.client_id !== "" ? claims.client_id : null;
}

/**
 * The signed-in user of a cookie session, or null when nobody is signed in or
 * the session is not the website's own. The session is read once, and the very
 * token inspected is the one GoTrue then validates, so a crafted cookie can't
 * have one token inspected and another validated. A session with no readable
 * token, or one naming an OAuth client, is refused.
 */
export async function firstPartyUser(client: SupabaseClient): Promise<User | null> {
  const {
    data: { session },
  } = await client.auth.getSession();
  const token = session?.access_token;
  if (typeof token !== "string" || token === "") return null;
  if (!claimsOf(token) || oauthClientOf(token)) return null;
  const {
    data: { user },
  } = await client.auth.getUser(token);
  return user ?? null;
}
