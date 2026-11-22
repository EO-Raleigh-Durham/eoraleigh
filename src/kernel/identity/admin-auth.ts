// The chapter app's version of edge8-web's kernel/identity/admin-auth.ts (EO-owned).
// Edge8's Admin view is the chapter app's /board workspace, so "admin" here means
// board tier or above, the same rule as requireBoardOrAbove().
import { redirect } from "next/navigation";
import { perRender } from "./per-render";
import { getAccess } from "./access-request";
import type { SessionUser } from "./session-user";

export type AdminUser = SessionUser;

/** The signed-in staff member, or null when not signed in or below board tier. */
export const getAdminUser = perRender(async (): Promise<AdminUser | null> => {
  const access = await getAccess();
  return access?.may("surface.admin") ? access.user : null;
});

export async function requireAdmin(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return user;
}
