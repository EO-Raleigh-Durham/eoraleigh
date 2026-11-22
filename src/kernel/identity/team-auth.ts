// The chapter app's version of edge8-web's kernel/identity/team-auth.ts (EO-owned).
//
// Edge8's "team" is its employees. The chapter app's team is its staff at board tier
// or above (board directors, the chapter manager, super admins), listed in
// public.team_members by refresh_team_members() (migration 101). The actor is
// found from EO's own sign-in (src/lib/auth.ts) and its person's team_members
// row; EO has no managers, no avatars and no "view as someone else".
import { redirect } from "next/navigation";
import { getSessionUser as getEoSessionUser } from "@/lib/auth";
import { companyOs } from "@/kernel/data/supabase";
import { perRender } from "./per-render";
import type { TeamImpersonation } from "./team-assume";
import { actorDisplayName, GREETING_COLUMNS, greetingName, personName } from "@/kernel/config/people-name";
import { PORTAL_STATUSES } from "./team-statuses";

export type TeamRole = "employee" | "manager";

export type TeamActor = {
  authUserId: string;
  personId: string;
  teamMemberId: string;
  role: TeamRole;
  displayName: string;
  greeting: string | null;
  name: string;
  avatarUrl: string | null;
  email: string;
  teamMemberScope: string[];
  personScope: string[];
  directReportIds: string[];
  isAdmin: boolean;
  employmentType: string | null;
  impersonation: TeamImpersonation | null;
};

export { PORTAL_STATUSES };

type GetActorResult =
  | { actor: TeamActor; redirectTo?: undefined }
  | { actor: null; redirectTo: "/admin" | "/team/login" | "/admin/login" };

export const getTeamActor = perRender(async (): Promise<GetActorResult> => {
  const eo = await getEoSessionUser();
  if (!eo || !eo.personId) return { actor: null, redirectTo: "/admin/login" };

  const [{ data: person, error: personError }, { data: memberships, error: membershipError }] = await Promise.all([
    companyOs.from("people").select(`id, ${GREETING_COLUMNS}`).eq("id", eo.personId).maybeSingle(),
    companyOs.from("team_members").select("id, status, employment_type").eq("person_id", eo.personId).in("status", PORTAL_STATUSES),
  ]);
  if (personError || membershipError) {
    console.error("[team-auth] lookup failed for person", eo.personId, (personError ?? membershipError)?.message);
    return { actor: null, redirectTo: "/admin/login" };
  }
  const membership = (memberships ?? []).find((m) => m.status === "active") ?? memberships?.[0];
  if (!person || !membership) return { actor: null, redirectTo: "/admin/login" };

  return {
    actor: {
      authUserId: eo.userId,
      personId: person.id,
      teamMemberId: membership.id,
      role: "employee",
      displayName: actorDisplayName(person),
      greeting: greetingName(person, null),
      name: personName({ ...person, email: null }, "Team member"),
      avatarUrl: null,
      email: eo.email.toLowerCase(),
      teamMemberScope: [membership.id],
      personScope: [person.id],
      directReportIds: [],
      isAdmin: eo.role === "super_admin",
      employmentType: membership.employment_type ?? null,
      impersonation: null,
    },
  };
});

export async function hasTeamAccess(_authUserId: string): Promise<boolean> {
  return Boolean((await getTeamActor()).actor);
}

export async function requireTeamMember(): Promise<TeamActor> {
  const { actor, redirectTo } = await getTeamActor();
  if (!actor) redirect(redirectTo);
  return actor;
}
