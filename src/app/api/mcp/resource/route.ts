// The connector's OAuth protected-resource metadata (RFC 9728), served at
// /.well-known/oauth-protected-resource/api/mcp through a rewrite in
// next.config.ts: it tells an MCP client which authorization server signs
// people in for /api/mcp. Public, as the standard requires; it names no person.
import { resourceMetadata } from "@/lib/mcp/oauth-metadata";

export async function GET(request: Request): Promise<Response> {
  try {
    return Response.json(await resourceMetadata(new URL(request.url).origin), {
      headers: { "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("[mcp] resource metadata:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Sign-in is not available right now." }, { status: 503 });
  }
}
