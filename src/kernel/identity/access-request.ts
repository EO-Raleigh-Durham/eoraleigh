// The chapter app's version of edge8-web's kernel/identity/access-request.ts (EO-owned;
// see scripts/edge8-sync/eo-owned.json).
//
// Edge8 resolves permissions from roles granted in its access tables. The chapter app
// keeps its own ladder (src/lib/access.ts: guest, member, board, super admin),
// so this maps edge8's permission atoms onto it:
//
//   board tier and up    campaigns.marketing, boards.open, boards.plan,
//                        org.company (strategy and goals), ideas.manage (the
//                        radar), surface.team, surface.admin, access.explain
//   super admin only     boards.manage, boards.admin
//
// Anything else is refused. `requirePermission(atom)` stays the first statement
// of every ported page and server action, so code copied from edge8 ports
// unchanged and every action authorises before it reads or writes.
import { notFound, redirect } from "next/navigation";
import { getSessionUser as getEoSessionUser } from "@/lib/auth";
import { roleAtLeast } from "@/lib/access";
import { perRender } from "@/kernel/identity/per-render";
import type { Access, RoleHolding, Target } from "@/kernel/identity/access-model";
import type { SessionUser } from "@/kernel/identity/session-user";
import type { TeamImpersonation } from "@/kernel/identity/team-assume";

const BOARD_PERMISSIONS = [
  "access.explain",
  "boards.open",
  "boards.plan",
  "campaigns.marketing",
  "ideas.manage",
  "org.company",
  "surface.admin",
  "surface.team",
] as const;

const SUPER_ADMIN_PERMISSIONS = ["boards.admin", "boards.manage"] as const;

/** The edge8 permissions an EO role holds. Exported for tests. */
export function permissionsForRole(role: string | null | undefined): string[] {
  if (role === "super_admin") return [...BOARD_PERMISSIONS, ...SUPER_ADMIN_PERMISSIONS].sort();
  if (role && roleAtLeast(role as Parameters<typeof roleAtLeast>[0], "board")) return [...BOARD_PERMISSIONS].sort();
  return [];
}

export type RequestAccess = Access & {
  readonly user: SessionUser;
  /** The signed-in person's people.id; null when their profile has no person. */
  readonly personId: string | null;
  /** The chapter app has no "view as someone else"; always null. */
  readonly impersonation: TeamImpersonation | null;
};

/** What the signed-in person may do, once per render; null when nobody is signed in. */
export const getAccess = perRender(async (): Promise<RequestAccess | null> => {
  const eo = await getEoSessionUser();
  if (!eo) return null;
  const held = new Set(permissionsForRole(eo.role));
  const roles: RoleHolding[] = held.size ? [{ role: eo.role, because: "user_profiles.role" }] : [];
  return {
    roles,
    permissions: () => [...held].sort(),
    // EO's tiers carry no per-person or per-company reach: holding is enough.
    may: (permission: string, _target?: Target) => held.has(permission),
    user: { id: eo.userId, email: eo.email.toLowerCase() },
    personId: eo.personId,
    impersonation: null,
  };
});

/**
 * The first statement of every ported page and server action. Nobody signed in
 * goes to the staff sign-in; someone signed in without the permission gets a 404.
 */
export async function requirePermission(
  permission: string,
  target?: Target,
  _options?: { asSignedIn?: boolean },
): Promise<RequestAccess> {
  const access = await getAccess();
  if (!access) redirect("/admin/login");
  if (!access.may(permission, target)) notFound();
  return access;
}
