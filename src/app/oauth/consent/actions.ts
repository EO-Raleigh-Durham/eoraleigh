"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase-server";
import { reachForUser } from "@/lib/mcp/caller";
import { checkRedirect } from "@/lib/mcp/clients";
import { recordToolCall } from "@/lib/mcp/call-log";

const Decision = z.object({
  authorizationId: z.string().min(1).max(200),
  decision: z.enum(["approve", "deny"]),
});

/**
 * The person's answer to "may this app use the chapter site as you?" (MCP.0, as on
 * Edge8). Externally callable, so it re-checks the session and that the
 * person is someone the connector is for. Supabase's OAuth server records the
 * decision against the signed-in session and hands back the client's redirect
 * URL; the browser goes straight there. An approval is logged in
 * mcp_tool_calls as tool "oauth_consent", with the app's id.
 */
export async function decideAuthorization(formData: FormData): Promise<void> {
  const parsed = Decision.safeParse({
    authorizationId: formData.get("authorization_id"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) redirect("/oauth/consent?failed=1");
  const { authorizationId, decision } = parsed.data;
  const back = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;

  const user = await getSessionUser();
  if (!user) redirect(`/admin/login?next=${encodeURIComponent(back)}`);
  if (decision === "approve" && !(await reachForUser(user))) redirect(back);

  const supabase = await createSessionClient();
  // The page refused an address that is not https; a posted form is asked
  // again, so the refusal cannot be skipped by submitting the form directly.
  const details = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (details.error || !details.data) redirect(`${back}&failed=1`);
  // Already approved: the page shows where the code goes and the person clicks.
  if (!("authorization_id" in details.data)) redirect(back);
  const { client, redirect_uri: redirectUri } = details.data;
  if (!checkRedirect(redirectUri).allowed) redirect(back);

  const { data, error } =
    decision === "approve"
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
  if (error || !data?.redirect_url) {
    console.error("[mcp] consent decision failed:", error?.message ?? "no redirect url");
    redirect(`${back}&failed=1`);
  }
  if (decision === "approve") {
    await recordToolCall({
      userProfileId: user.id,
      clientId: client.id,
      portfolio: null,
      tool: "oauth_consent",
      input: null,
      output: null,
      outcome: "ok",
      latencyMs: 0,
    });
  }
  redirect(data.redirect_url);
}
