import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { robotsFor } from "@/lib/access-map";
import { SideNav } from "@/components/internal/SideNav";
import "../admin/admin.css";
import { CHAPTER_NAME } from "@/kernel/config/chapter";
import { DemoGuide } from "@/components/DemoGuide";

export const metadata: Metadata = {
  title: {
    default: "Member portal",
    template: `%s · ${CHAPTER_NAME} member portal`,
  },
  robots: robotsFor("guest"),
};

// Authenticated shell shared by the guest My Events route and member content.
// It uses the same navigation shell as /board and /admin; MarketingChrome drops
// the public Topbar/Footer here.
export default async function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sessionUser = await requireAuth();

  return (
    <div className="admin-shell">
      <SideNav
        area="member"
        user={{
          fullName: sessionUser.fullName,
          email: sessionUser.email,
          role: sessionUser.role,
        }}
      />
      <div className="admin-main">
        <DemoGuide area="member" />
        {children}
      </div>
    </div>
  );
}
