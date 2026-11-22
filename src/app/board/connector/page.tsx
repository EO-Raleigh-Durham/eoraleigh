import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { reachForUser } from "@/lib/mcp/caller";
import { toolsFor } from "@/lib/mcp/tools";
import { CHAPTER_NAME, CHAPTER_SITE_URL } from "@/kernel/config/chapter";

// "Connect Claude to the chapter" (MCP.0): the one URL, how to add it, and
// what this person's level and portfolio would let a connected app do.

export const metadata = {
  title: "Connect Claude",
  description: `Add the ${CHAPTER_NAME} connector to Claude, ChatGPT or Grok and work your portfolio from chat.`,
};
export const dynamic = "force-dynamic";

export default async function ConnectorGuidePage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login?next=/board/connector");
  const access = await reachForUser(user);
  const tools = access ? toolsFor({ user, clientId: "", reach: access.reach, portfolio: access.portfolio }, "") : [];
  const url = `${CHAPTER_SITE_URL}/api/mcp`;

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">Connector</div>
        <h1 className="admin-page-title">Connect Claude to {CHAPTER_NAME}</h1>
        <p className="admin-page-sub">
          Ask about your portfolio and update it from Claude, ChatGPT or Grok. The app works as you, with the same access you
          have here, and shows you every change before it happens.
        </p>
      </div>
      <section className="sap-panel" style={{ marginBottom: 20 }}>
        <h2 className="sap-panel-title">Add it once</h2>
        <ol>
          <li>
            In Claude, open <b>Settings → Connectors → Add custom connector</b>.
          </li>
          <li>
            Name it <b>{CHAPTER_NAME}</b> and paste <code>{url}</code>.
          </li>
          <li>Sign in with your {CHAPTER_NAME} login and click Allow.</li>
        </ol>
        <p style={{ fontSize: 13, color: "#6B7280" }}>
          To keep a focused set of tools, add <code>?portfolio=sap</code> (or membership, events, surveys, comms, chapter) to
          the URL.
        </p>
      </section>
      <section className="sap-panel">
        <h2 className="sap-panel-title">What it can do for you</h2>
        {tools.length === 0 ? (
          <p>The connector is for board members, super admins and approved contractors.</p>
        ) : (
          <ul>
            {tools.map((t) => (
              <li key={t.name}>
                <b>{t.title}</b> {t.readOnly ? "(read)" : "(change, previewed first)"}
              </li>
            ))}
          </ul>
        )}
        <p style={{ fontSize: 13, color: "#6B7280" }}>
          More tools arrive portfolio by portfolio: SAP and meeting notes first, then Membership, then events, surveys and
          member emails. <Link href="/board/chapter-dashboard">Back to the dashboard</Link>
        </p>
      </section>
    </div>
  );
}
