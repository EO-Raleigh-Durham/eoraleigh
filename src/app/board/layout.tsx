import type { Metadata } from "next";
import { ChatWidget } from "@/components/internal/ChatWidget";
import { SideNav } from "@/components/internal/SideNav";
import { getSessionUser } from "@/lib/auth";
import { roleAtLeast } from "@/lib/access";
import { requireArea } from "@/lib/access-grants-server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  boardRouteAllows,
  CONTRACTOR_ACCESS_PATH,
  CONTRACTOR_HOME,
  PATHNAME_HEADER,
} from "@/lib/access-grants";
import { canViewRevenue } from "@/lib/revenue-access";
import { countNewBoardInquiries } from "@/lib/inquiries";
import { robotsFor } from "@/lib/access-map";
import { loadMyRoleKeys } from "@/lib/board-home";
import "../admin/admin.css";
import "./board-shell.css";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata: Metadata = {
  title: {
    default: `${CHAPTER_NAME} Board`,
    template: `%s · ${CHAPTER_NAME} Board`,
  },
  robots: robotsFor("board"),
};

// The board governance area. Shares the admin shell + sidebar (the sidebar
// filters items by role, so board users see only board-tier entries and
// super_admins see everything). Auth guard is the coarse board+ backstop; the
// proxy is the precise per-page gate.
export default async function BoardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getSessionUser();
  if (!viewer) redirect("/admin/login");

  // Contractors: the proxy admits them only to grantable area routes, so the
  // only area reachable here is the SAP pipeline. Verify the grant, then render
  // a minimal shell: no inbox, no revenue access, no board chatbot.
  if (!roleAtLeast(viewer.role, "board")) {
    if (viewer.role !== "contractor") redirect("/admin/login");
    // Repeat the proxy's route check here so a contractor never depends on the
    // proxy alone. No path header means we cannot tell, so refuse.
    const pathname = (await headers()).get(PATHNAME_HEADER);
    if (!boardRouteAllows(viewer.role, pathname)) {
      redirect(pathname ? CONTRACTOR_HOME : CONTRACTOR_ACCESS_PATH);
    }
    await requireArea("sap_pipeline");
    return (
      <div className="admin-shell">
        <SideNav
          area="board"
          user={{ fullName: viewer.fullName, email: viewer.email, role: viewer.role }}
        />
        <div className="admin-main">{children}</div>
      </div>
    );
  }

  const sessionUser = viewer;
  const [inboxCount, revenueAccess, myRoleKeys] = await Promise.all([
    countNewBoardInquiries(),
    canViewRevenue(sessionUser),
    loadMyRoleKeys(sessionUser.personId),
  ]);

  return (
    <div className="admin-shell">
      <SideNav
        area="board"
        inboxCount={inboxCount}
        revenueAccess={revenueAccess}
        myRoleKeys={myRoleKeys}
        user={{
          fullName: sessionUser.fullName,
          email: sessionUser.email,
          role: sessionUser.role,
        }}
      />
      <div className="admin-main">{children}</div>
      <ChatWidget />
    </div>
  );
}
