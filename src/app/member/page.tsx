import { redirect } from "next/navigation";
import { requireMemberOrAbove } from "@/lib/auth";

export const dynamic = "force-dynamic";

// The member area lands on "My events" — the featured next event plus the
// member's own registrations. Anyone hitting the bare /member path (login
// redirect, the sidebar logo, the "Switch to Member" link) goes there.
export default async function MemberHomePage() {
  await requireMemberOrAbove();
  redirect("/member/events");
}
