// Where an app connecting to the chapter sends its sign-in code (MCP.0, as on Edge8).
//
// Any app may connect: Claude, ChatGPT, Grok, Cursor or anything else that
// speaks MCP (Dave, 2026-11-14, for Edge8; the same rule here). Supabase's OAuth server lets any app register
// itself under any name, so a name proves nothing; what identifies an app is
// where its sign-in code is sent. The consent page therefore shows that address
// beside the name, and asks for a click every time, even for an app approved
// before, so a person always sees where their sign-in is going. Only an address
// that is not https (or http on the person's own machine) is refused.
// Client-safe: no import reaches the server.

/** A desktop or command-line client (Claude Code, Cursor) listening on the person's own machine. */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

export type RedirectCheck = { allowed: boolean; host: string | null };

/** Whether a registered redirect URI may receive a sign-in code, and its host to show. */
export function checkRedirect(uri: string | null | undefined): RedirectCheck {
  let url: URL;
  try {
    url = new URL(uri ?? "");
  } catch {
    return { allowed: false, host: null };
  }
  if (LOOPBACK.has(url.hostname.toLowerCase())) return { allowed: url.protocol === "http:" || url.protocol === "https:", host: url.host };
  return { allowed: url.protocol === "https:", host: url.host };
}
