import { requireSuperAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EditUserForm } from "./EditUserForm";
import { updateUserAction, toggleActiveAction } from "../actions";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Edit User",
  description: `Edit one user's name, role, and access to the ${CHAPTER_NAME} internal site.`,
};

type PageProps = { params: Promise<{ id: string }> };

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  board: "Board",
  member: "Member",
  guest: "Guest",
};

export default async function EditUserPage({ params }: PageProps) {
  await requireSuperAdmin();
  const { id } = await params;

  const { data: user, error } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, role, active, created_at")
    .eq("id", id)
    .single();

  if (error || !user) notFound();

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">Users</div>
        <h1 className="admin-page-title">{user.full_name ?? user.email}</h1>
        <p className="admin-page-sub">{user.email}</p>
      </div>

      <div style={{ maxWidth: 480, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: 28, display: "flex", flexDirection: "column", gap: 24 }}>
        <EditUserForm
          profileId={user.id}
          currentRole={user.role}
          currentActive={user.active}
          roleLabels={ROLE_LABELS}
          updateAction={updateUserAction}
          toggleAction={toggleActiveAction}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <Link href="/admin/users" style={{ color: "#6B7280", fontSize: 14, textDecoration: "none" }}>
          Back to Users
        </Link>
      </div>
    </div>
  );
}
