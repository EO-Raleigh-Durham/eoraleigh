"use server";

import { getSessionUser } from "@/lib/auth";
import { roleAtLeast } from "@/lib/access";
import { pageTier, roleHomePath } from "@/lib/access-map";
import { safeNextPath, nextPathname } from "@/lib/safe-next";

// Where to land after signing in. Honors a ?next= destination only if it is a
// same-site path (open-redirect guard) AND the signed-in role can actually
// open it: honoring a destination above the user's tier would have the proxy
// bounce them straight back to the login page in an authenticated loop (e.g.
// a guest with next=/member/requalify). Otherwise falls back by role.
export async function getLoginRedirect(rawNext?: string | null): Promise<string> {
  const user = await getSessionUser();
  if (!user) return "/login";
  const next = safeNextPath(rawNext ?? null);
  if (next && roleAtLeast(user.role, pageTier(nextPathname(next)))) return next;
  return roleHomePath(user.role);
}
