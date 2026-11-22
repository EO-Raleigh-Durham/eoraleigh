import { requireSuperAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Users",
  description: `Everyone with a login for the ${CHAPTER_NAME} internal site, with role and account status.`,
};

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  active: boolean;
  created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  board: "Board",
  member: "Member",
  guest: "Guest",
  contractor: "Contractor",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "#287BE8",
  board: "#7C3AED",
  member: "#059669",
  guest: "#6B7280",
  contractor: "#B45309",
};

export default async function UsersPage() {
  await requireSuperAdmin();

  const { data: users, error } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, role, active, created_at")
    .order("created_at", { ascending: false });

  const rows: UserRow[] = error ? [] : (users ?? []);

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">Administration</div>
        <h1 className="admin-page-title">Users</h1>
        <p className="admin-page-sub">
          Manage who can access {CHAPTER_NAME} admin and member areas. Invite users, change roles, or deactivate accounts.
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Link href="/admin/users/new" className="btn btn--primary" style={{ textDecoration: "none", display: "inline-block" }}>
          Invite user
        </Link>
        <Link href="/admin/users/contractors" className="btn" style={{ textDecoration: "none", display: "inline-block", marginLeft: 12 }}>
          Contractors
        </Link>
      </div>

      {error && (
        <div style={{ padding: 16, background: "rgba(220,38,38,0.07)", color: "#991B1B", borderRadius: 8, marginBottom: 24, fontSize: 14 }}>
          Could not load users: {error.message}
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Name</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Role</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Joined</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#374151", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>
                  No users yet. Invite your first admin above.
                </td>
              </tr>
            )}
            {rows.map((user) => (
              <tr key={user.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ padding: "12px 16px", color: "#04102D", fontWeight: 500 }}>
                  {user.full_name || <span style={{ color: "#9CA3AF" }}>—</span>}
                </td>
                <td style={{ padding: "12px 16px", color: "#374151" }}>{user.email}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    background: `${ROLE_COLORS[user.role] ?? "#6B7280"}18`,
                    color: ROLE_COLORS[user.role] ?? "#6B7280",
                  }}>
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    background: user.active ? "#D1FAE5" : "#F3F4F6",
                    color: user.active ? "#065F46" : "#6B7280",
                  }}>
                    {user.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "#6B7280", fontSize: 13 }}>
                  {new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <Link
                    href={`/admin/users/${user.id}`}
                    style={{ color: "#287BE8", fontSize: 13, textDecoration: "none", fontWeight: 500 }}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
