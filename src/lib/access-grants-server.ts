// Server-only area guard. NEVER import from a client component.
// Policy lives in access-grants.ts; this file only loads the grant.

import { redirect } from "next/navigation";
import { supabase } from "./supabase";
import { getSessionUser, type SessionUser } from "./auth";
import {
  areaAllows,
  CONTRACTOR_ACCESS_PATH,
  CONTRACTOR_NDA_PATH,
  grantState,
  type AccessArea,
  type AccessGrant,
} from "./access-grants";

// The caller's live (unrevoked) grant for an area, or null.
export async function getLiveGrant(
  profileId: string,
  area: AccessArea,
): Promise<AccessGrant | null> {
  const { data, error } = await supabase
    .from("access_grants")
    .select("area, can_edit, expires_at, revoked_at, nda_version, nda_accepted_at")
    .eq("user_profile_id", profileId)
    .eq("area", area)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new Error(`access grant lookup failed: ${error.message}`);
  return (data as AccessGrant | null) ?? null;
}

/**
 * Redirects unless the current user may use `area`: board or above always,
 * otherwise an active grant (unrevoked, unexpired, current NDA accepted), and
 * an edit grant when `edit` is set. Use inside every page and Server Action
 * of a granted area.
 */
export async function requireArea(
  area: AccessArea,
  opts: { edit?: boolean } = {},
): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (areaAllows(user.role, null, opts)) return user; // board or above
  const grant = await getLiveGrant(user.id, area);
  if (!areaAllows(user.role, grant, opts)) {
    redirect(grant && grantState(grant) === "nda_required" ? CONTRACTOR_NDA_PATH : CONTRACTOR_ACCESS_PATH);
  }
  return user;
}

// The caller's most recent grant for an area, revoked or not, with the
// sponsor's name, so the "access ended" page can say who to ask.
export async function getLatestGrantSponsor(
  profileId: string,
  area: AccessArea,
): Promise<{ sponsorName: string | null; expiresAt: string | null; revoked: boolean } | null> {
  const { data, error } = await supabase
    .from("access_grants")
    .select("sponsor_person_id, expires_at, revoked_at")
    .eq("user_profile_id", profileId)
    .eq("area", area)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  let sponsorName: string | null = null;
  if (data.sponsor_person_id) {
    const { data: p } = await supabase
      .from("people")
      .select("name")
      .eq("id", data.sponsor_person_id)
      .maybeSingle();
    sponsorName = (p?.name as string | undefined) ?? null;
  }
  return { sponsorName, expiresAt: data.expires_at, revoked: Boolean(data.revoked_at) };
}

// Records the contractor's NDA acceptance on their live grant. The caller
// must already have validated the input with ndaAcceptanceError.
export async function recordNdaAcceptance(
  profileId: string,
  area: AccessArea,
  acceptance: { version: string; name: string; ip: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("access_grants")
    .update({
      nda_version: acceptance.version,
      nda_accepted_at: new Date().toISOString(),
      nda_accepted_name: acceptance.name,
      nda_accepted_ip: acceptance.ip,
      updated_at: new Date().toISOString(),
    })
    .eq("user_profile_id", profileId)
    .eq("area", area)
    .is("revoked_at", null);
  if (error) throw new Error(`NDA acceptance failed: ${error.message}`);
}
