import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { CHAPTER_NAME, CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

// Connector activity (MCP.0): every call the chapter connector answered,
// reads, refusals and consents included. Super admins only: it is a record of
// who read what. It holds ids and outcomes, never content.

export const metadata = {
  title: "Connector activity",
  description: `Every request made through the ${CHAPTER_NAME} connector for Claude, ChatGPT and Grok.`,
};
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  created_at: string;
  client_id: string;
  portfolio: string | null;
  tool: string;
  subject_ids: string[];
  result_count: number | null;
  outcome: string;
  latency_ms: number;
  user_profile_id: string;
  person: { full_name: string | null; email: string } | null;
};

type SearchParams = Promise<{ person?: string; app?: string; tool?: string }>;

const OUTCOME_COLOR: Record<string, string> = {
  ok: "#047857",
  refused: "#b91c1c",
  invalid: "#b45309",
  error: "#b91c1c",
};

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: CHAPTER_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ConnectorActivityPage({ searchParams }: { searchParams: SearchParams }) {
  await requireSuperAdmin();
  const sp = await searchParams;
  let q = supabase
    .from("mcp_tool_calls")
    .select(
      "id, created_at, client_id, portfolio, tool, subject_ids, result_count, outcome, latency_ms, user_profile_id, person:user_profiles(full_name, email)",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (sp.person) q = q.eq("user_profile_id", sp.person);
  if (sp.app) q = q.eq("client_id", sp.app);
  if (sp.tool) q = q.eq("tool", sp.tool);
  const { data, error } = await q;
  const rows = (data ?? []) as unknown as Row[];

  const link = (k: "person" | "app" | "tool", v: string) => {
    const p = new URLSearchParams();
    for (const [key, val] of Object.entries(sp)) if (val && key !== k) p.set(key, val);
    p.set(k, v);
    return `/admin/connector?${p.toString()}`;
  };
  const filtered = Boolean(sp.person || sp.app || sp.tool);

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">Admin</div>
        <h1 className="admin-page-title">Connector activity</h1>
        <p className="admin-page-sub">
          Every request made through the {CHAPTER_NAME} connector (Claude, ChatGPT, Grok): who, which app, which tool, the
          record ids it asked about, and how it ended. Never the content. Click a person, app or tool to filter.
        </p>
      </div>
      {error && <div className="admin-banner admin-banner--err">Could not load the log: {error.message}</div>}
      {filtered && (
        <p>
          <Link href="/admin/connector">Clear filters</Link>
        </p>
      )}
      {rows.length === 0 ? (
        <p>No connector activity yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Person</th>
              <th>App</th>
              <th>Tool</th>
              <th>Records</th>
              <th>Outcome</th>
              <th>ms</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{when(r.created_at)}</td>
                <td>
                  <Link href={link("person", r.user_profile_id)}>{r.person?.full_name ?? r.person?.email ?? "Unknown"}</Link>
                </td>
                <td>
                  <Link href={link("app", r.client_id)} title={r.client_id}>
                    {r.client_id.slice(0, 8)}
                  </Link>
                </td>
                <td>
                  <Link href={link("tool", r.tool)}>{r.tool}</Link>
                  {r.portfolio && <span style={{ color: "#6B7280" }}> ({r.portfolio})</span>}
                </td>
                <td>
                  {r.subject_ids.length > 0 ? `${r.subject_ids.length} named` : ""}
                  {r.result_count != null ? `${r.subject_ids.length ? ", " : ""}${r.result_count} returned` : ""}
                </td>
                <td style={{ color: OUTCOME_COLOR[r.outcome] ?? "inherit", fontWeight: 600 }}>{r.outcome}</td>
                <td>{r.latency_ms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
