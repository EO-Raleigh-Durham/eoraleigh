// The chapter app's version of edge8-web's kernel/identity/access-of-person.ts (EO-owned).
// What someone other than the signed-in person may do: a notice's recipient, a
// digest's reader. In the chapter app that is decided by the same ladder as
// access-request.ts: the role on the person's active user_profiles row, with a
// current Chair or Co-Chair appointment counting as board (public.team_members
// holds exactly those people).
import { companyOs, supabaseUntyped } from "@/kernel/data/supabase";
import { ReadFailure } from "@/kernel/data/read";
import type { Access } from "@/kernel/identity/access-model";
import { permissionsForRole } from "@/kernel/identity/access-request";
import { personIdForEmail } from "@/kernel/identity/person-by-email";
import { perRender } from "./per-render";

async function roleOf(personId: string): Promise<string | null> {
  const [{ data: profiles, error: profileError }, { data: team, error: teamError }] = await Promise.all([
    supabaseUntyped.from("user_profiles").select("role").eq("person_id", personId).eq("active", true),
    companyOs.from("team_members").select("id").eq("person_id", personId).eq("status", "active").limit(1),
  ]);
  if (profileError) throw new ReadFailure("[access] user_profiles", profileError.message);
  if (teamError) throw new ReadFailure("[access] team_members", teamError.message);
  const roles = ((profiles ?? []) as { role: string }[]).map((p) => p.role);
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("board") || (team ?? []).length > 0) return "board";
  return roles[0] ?? null;
}

/** What `personId` may do; null when they hold nothing. */
export async function accessOf(personId: string): Promise<Access | null> {
  const held = new Set(permissionsForRole(await roleOf(personId)));
  if (held.size === 0) return null;
  return {
    roles: [{ role: "eo", because: "user_profiles.role" }],
    permissions: () => [...held].sort(),
    may: (permission: string) => held.has(permission),
  };
}

/** Whether the person with this email may open the /board workspace. */
export const holdsSurfaceAdmin = perRender(async (email: string | null | undefined): Promise<boolean> => {
  const personId = await personIdForEmail(email);
  if (!personId) return false;
  return Boolean((await accessOf(personId))?.may("surface.admin"));
});
