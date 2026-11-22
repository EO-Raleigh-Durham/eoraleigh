// Server-only. Where an MCP client signs a person in (MCP.0, RFC 9728, as on
// Edge8). Supabase Auth's OAuth 2.1 server is the authorization server. Its
// issuer is the project's own supabase.co address, and a client checks that
// the issuer it is told matches the metadata it fetches, so the issuer is read
// from Supabase's metadata rather than built by hand.

import { CHAPTER_NAME } from "../../kernel/config/chapter.ts";

/** Where the protected-resource metadata is served (rewritten from /.well-known in next.config.ts). */
export const RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource/api/mcp";

/** The authorization server's issuer, from Supabase's own metadata document. */
export async function authorizationServerIssuer(): Promise<string> {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  const res = await fetch(`${base}/.well-known/oauth-authorization-server/auth/v1`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Supabase OAuth metadata answered ${res.status}; is the OAuth server enabled?`);
  const body = (await res.json()) as { issuer?: unknown };
  if (typeof body.issuer !== "string" || !body.issuer) throw new Error("Supabase OAuth metadata has no issuer");
  return body.issuer;
}

/** The protected-resource metadata document for the connector at `origin`. */
export async function resourceMetadata(origin: string) {
  return {
    resource: `${origin}/api/mcp`,
    authorization_servers: [await authorizationServerIssuer()],
    bearer_methods_supported: ["header"],
    // No "openid": the connector needs only the access token, and asking for an
    // OpenID ID token failed at Supabase's token exchange on Edge8 (HS256
    // projects cannot sign ID tokens).
    scopes_supported: ["email", "profile"],
    resource_name: CHAPTER_NAME,
    resource_documentation: `${origin}/board/connector`,
  };
}

/** The 401 that tells an MCP client where to sign the person in. */
export function unauthorized(origin: string): Response {
  return new Response(JSON.stringify({ error: `Sign in to ${CHAPTER_NAME} to use this connector.` }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer resource_metadata="${origin}${RESOURCE_METADATA_PATH}"`,
    },
  });
}
