import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ProfileForm } from "./ProfileForm";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const user = await requireAuth();

  let phone = "";
  let whatsappPhone = "";
  if (user.personId) {
    const { data } = await supabase
      .from("people")
      .select("phone, whatsapp_phone")
      .eq("id", user.personId)
      .single();
    phone = data?.phone ?? "";
    whatsappPhone = data?.whatsapp_phone ?? "";
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="auth-brand">{CHAPTER_NAME}</div>
        <h1 className="auth-title">My profile</h1>
        <ProfileForm
          fullName={user.fullName ?? ""}
          email={user.email}
          phone={phone}
          whatsappPhone={whatsappPhone}
          role={user.role}
        />
      </div>
    </div>
  );
}
