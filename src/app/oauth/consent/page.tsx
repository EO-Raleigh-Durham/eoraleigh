import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase-server";
import { reachForUser } from "@/lib/mcp/caller";
import { checkRedirect } from "@/lib/mcp/clients";
import { toolsFor } from "@/lib/mcp/tools";
import { decideAuthorization } from "./actions";
import "../../admin/admin.css";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

// Where Supabase's OAuth server sends a person when Claude, ChatGPT or Grok asks
// to connect to the chapter site (MCP.0; the project's oauth_server_authorization_path).
// Public in the route map because it must keep its authorization_id through
// sign-in: it checks the session itself and sends a signed-out person to the
// login with a way back. The decision is the guarded Server Action beside it.

export const metadata: Metadata = { title: "Connect an app", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ authorization_id?: string; failed?: string }> };

const LEVEL_LABEL = { super_admin: "Super admin", board: "Board", contractor: "Contractor" } as const;

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-brand">{CHAPTER_NAME}</div>
        {children}
      </div>
    </div>
  );
}

function stopped(app: string, host: string | null) {
  return (
    <Card>
      <p>
        This request, from an app calling itself <b>{app}</b>, would send your sign-in to{" "}
        <b>{host ?? "an unknown address"}</b> without encryption, so it has been stopped.
      </p>
    </Card>
  );
}

export default async function OAuthConsentPage({ searchParams }: Props) {
  const { authorization_id: authorizationId, failed } = await searchParams;
  if (!authorizationId) {
    return (
      <Card>
        <p>This sign-in request is incomplete. Go back to the app you were connecting and try again.</p>
      </Card>
    );
  }

  const here = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
  const user = await getSessionUser();
  if (!user) redirect(`/admin/login?next=${encodeURIComponent(here)}`);

  const access = await reachForUser(user);
  if (!access) {
    return (
      <Card>
        <p>
          The {CHAPTER_NAME} connector is for board members, super admins and approved contractors. Your account
          ({user.email}) isn&apos;t one of those, so there&apos;s nothing to connect.
        </p>
      </Card>
    );
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !data) {
    return (
      <Card>
        <p>This sign-in request has expired or was already used. Go back to the app you were connecting and try again.</p>
      </Card>
    );
  }
  // Already approved for this app: never followed on its own, because an app
  // may register several addresses. The person sees where it goes and clicks.
  if ("redirect_url" in data) {
    const again = checkRedirect(data.redirect_url);
    if (!again.allowed) return stopped("An app", again.host);
    return (
      <Card>
        <p>
          You allowed this app before. Continue only if you started this connection yourself just now. Your sign-in goes to{" "}
          <b>{again.host}</b>.
        </p>
        <a href={data.redirect_url} className="admin-btn admin-btn--primary">
          Continue to {again.host}
        </a>
      </Card>
    );
  }

  const app = data.client.name || "An app";
  const target = checkRedirect(data.redirect_uri);
  if (!target.allowed) return stopped(app, target.host);

  // What this person's level and portfolio would hand the app, by the same
  // rule the connector applies on every call. Listing builds the tools; nothing runs.
  const tools = toolsFor({ user, clientId: "", reach: access.reach, portfolio: access.portfolio }, "");
  const reads = tools.filter((t) => t.readOnly).map((t) => t.title);
  const writes = tools.filter((t) => !t.readOnly).map((t) => t.title);
  const role = [LEVEL_LABEL[access.reach.level], ...access.portfolio].join(" · ");

  return (
    <Card>
      <h1 style={{ fontSize: 20, margin: "16px 0 8px" }}>Connect {app} to {CHAPTER_NAME}</h1>
      <p>
        <b>{app}</b> wants to use {CHAPTER_NAME} as you, {user.fullName ?? user.email} ({role}). Your sign-in will go to{" "}
        <b>{target.host}</b>. <b>Only allow this if you started it yourself just now.</b>
      </p>
      {reads.length > 0 && (
        <p>
          <b>Read:</b> {reads.join(", ")}.
        </p>
      )}
      {writes.length > 0 && (
        <p>
          <b>Change:</b> {writes.join(", ")}.
        </p>
      )}
      <p style={{ fontSize: 13, color: "#6B7280" }}>
        The app can&apos;t open the {CHAPTER_NAME} website as you. Every change shows you a preview first, with a warning when
        it can&apos;t be taken back or reaches many people, and runs only after you say yes. Deleting isn&apos;t possible from
        the app. {CHAPTER_NAME} keeps a log of every request the app makes. Connect only apps you trust.
      </p>
      {failed && <div className="admin-banner admin-banner--err">That didn&apos;t go through. Try again.</div>}
      <form action={decideAuthorization} style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <input type="hidden" name="authorization_id" value={data.authorization_id} />
        <button type="submit" name="decision" value="approve" className="admin-btn admin-btn--primary">
          Allow
        </button>
        <button type="submit" name="decision" value="deny" className="admin-btn admin-btn--ghost">
          Deny
        </button>
      </form>
    </Card>
  );
}
