import { requireSuperAdmin } from "@/lib/auth";
import { inviteUserAction } from "../actions";
import Link from "next/link";
import { InviteUserForm } from "./InviteUserForm";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Invite User",
  description: `Invite a new user to the ${CHAPTER_NAME} internal site with a set-password email.`,
};

export default async function InviteUserPage() {
  await requireSuperAdmin();
  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">Users</div>
        <h1 className="admin-page-title">Invite a user</h1>
        <p className="admin-page-sub">
          Creates a Supabase Auth account and sends a set-password email. Role can be changed later.
        </p>
      </div>

      <div style={{ maxWidth: 480, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: 28 }}>
        <InviteUserForm action={inviteUserAction} />
      </div>

      <div style={{ marginTop: 16 }}>
        <Link href="/admin/users" style={{ color: "#6B7280", fontSize: 14, textDecoration: "none" }}>
          Back to Users
        </Link>
      </div>
    </div>
  );
}
