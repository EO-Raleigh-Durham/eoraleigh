import type { Metadata } from "next";
import { SideNav } from "@/components/internal/SideNav";
import { requireBoardOrAbove } from "@/lib/auth";
import { canViewRevenue } from "@/lib/revenue-access";
import { countNewBoardInquiries } from "@/lib/inquiries";
import { robotsFor } from "@/lib/access-map";
import "./admin.css";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata: Metadata = {
  title: {
    default: `${CHAPTER_NAME} Admin`,
    template: `%s · ${CHAPTER_NAME} Admin`,
  },
  robots: robotsFor("admin"),
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Require at least a board Supabase session to render the admin shell. The
  // proxy (manifest) is the precise per-page gate — it redirects board users
  // away from super_admin-only pages before they render — so this layout guard
  // is the coarse board+ backstop. The /admin/login page lives in the separate
  // (admin-auth) route group, so this never affects it.
  const sessionUser = await requireBoardOrAbove();
  const [inboxCount, revenueAccess] = await Promise.all([
    countNewBoardInquiries(),
    canViewRevenue(sessionUser),
  ]);

  return (
    <div className="admin-shell">
      <SideNav
        area="admin"
        inboxCount={inboxCount}
        revenueAccess={revenueAccess}
        user={{
          fullName: sessionUser.fullName,
          email: sessionUser.email,
          role: sessionUser.role,
        }}
      />
      <div className="admin-main">{children}</div>
    </div>
  );
}
