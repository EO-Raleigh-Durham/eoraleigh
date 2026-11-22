// Server-only contractor management for super admins. NEVER import from a
// client component. Callers (Server Actions, the admin page) must run
// requireSuperAdmin() first: this module uses the secret client.

import { supabase } from "./supabase";
import { createUser, type UserRole } from "./auth";
import type { AccessArea, AccessGrant } from "./access-grants";
import { contractorRoleBlock, type ContractorInput } from "./contractor-admin";

type Result = { ok: true } | { ok: false; error: string };

export type ContractorGrantRow = AccessGrant & {
  id: string;
  created_at: string;
  profile: { id: string; email: string; full_name: string | null; active: boolean } | null;
  sponsor: { id: string; name: string | null } | null;
};

/** Every contractor grant, live first, newest first within each group. */
export async function listContractorGrants(): Promise<ContractorGrantRow[]> {
  const { data, error } = await supabase
    .from("access_grants")
    .select(
      "id, area, can_edit, expires_at, revoked_at, nda_version, nda_accepted_at, created_at, " +
        "profile:user_profiles!access_grants_user_profile_id_fkey(id, email, full_name, active), " +
        "sponsor:people!access_grants_sponsor_person_id_fkey(id, name)",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(`contractor grants: ${error.message}`);
  const rows = (data ?? []) as unknown as ContractorGrantRow[];
  return [...rows.filter((r) => !r.revoked_at), ...rows.filter((r) => r.revoked_at)];
}

/** Who may sponsor a contractor: this term's Chairs and Co-Chairs. */
export async function listSponsorOptions(): Promise<{ id: string; name: string }[]> {
  const { data: latest, error: fyError } = await supabase
    .from("board_appointments")
    .select("fiscal_year_start")
    .order("fiscal_year_start", { ascending: false })
    .limit(1);
  if (fyError) throw new Error(`sponsor term: ${fyError.message}`);
  const fy = (latest?.[0] as { fiscal_year_start: number } | undefined)?.fiscal_year_start;
  if (fy == null) return [];
  const { data, error } = await supabase
    .from("board_appointments")
    .select("person:people(id, name)")
    .eq("fiscal_year_start", fy)
    .in("position", ["Chair", "Co-Chair"]);
  if (error) throw new Error(`sponsors: ${error.message}`);
  const byId = new Map<string, string>();
  for (const row of (data ?? []) as unknown as { person: { id: string; name: string | null } | null }[]) {
    if (row.person?.name) byId.set(row.person.id, row.person.name);
  }
  return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Gives a person contractor access to one area: reuses their account when one
 * exists (a guest or contractor only), otherwise creates it, sets the role to
 * contractor and adds one grant. Refuses when a live grant for the area exists.
 */
export async function grantContractorAccess(
  input: ContractorInput,
  grantedByProfileId: string,
): Promise<Result> {
  const sponsors = await listSponsorOptions();
  if (!sponsors.some((s) => s.id === input.sponsorPersonId)) {
    return { ok: false, error: "The sponsor must be a current Chair or Co-Chair." };
  }

  const { data: existing, error: lookupError } = await supabase
    .from("user_profiles")
    .select("id, role, active")
    .ilike("email", input.email)
    .maybeSingle();
  if (lookupError) return { ok: false, error: lookupError.message };

  let profileId: string;
  if (existing) {
    const block = contractorRoleBlock(existing.role as UserRole);
    if (block) return { ok: false, error: block };
    if (!existing.active) {
      return { ok: false, error: "This account is deactivated. Reactivate it in Users first." };
    }
    profileId = existing.id as string;
  } else {
    const created = await createUser(input.email, input.fullName, "contractor", grantedByProfileId);
    if (!created.ok) return created;
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", created.userId)
      .single();
    if (error || !profile) return { ok: false, error: error?.message ?? "Account was not created." };
    profileId = profile.id as string;
  }

  const { data: live, error: liveError } = await supabase
    .from("access_grants")
    .select("id")
    .eq("user_profile_id", profileId)
    .eq("area", input.area)
    .is("revoked_at", null)
    .maybeSingle();
  if (liveError) return { ok: false, error: liveError.message };
  if (live) return { ok: false, error: "They already have access to this area. Renew it in the list below." };

  const { error: roleError } = await supabase
    .from("user_profiles")
    .update({ role: "contractor", updated_at: new Date().toISOString() })
    .eq("id", profileId);
  if (roleError) return { ok: false, error: roleError.message };

  const { error: grantError } = await supabase.from("access_grants").insert({
    user_profile_id: profileId,
    area: input.area satisfies AccessArea,
    can_edit: input.canEdit,
    sponsor_person_id: input.sponsorPersonId,
    expires_at: input.expiresAt,
    granted_by: grantedByProfileId,
  });
  if (grantError) return { ok: false, error: grantError.message };
  return { ok: true };
}

// Changes one live grant. A revoked grant is history and is never edited.
async function updateLiveGrant(grantId: string, patch: Record<string, unknown>): Promise<Result> {
  const { data, error } = await supabase
    .from("access_grants")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", grantId)
    .is("revoked_at", null)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "That grant was already revoked." };
  return { ok: true };
}

/** Sets a live grant's last day of access. The NDA acceptance carries over. */
export function renewGrant(grantId: string, expiresAt: string): Promise<Result> {
  return updateLiveGrant(grantId, { expires_at: expiresAt });
}

/** Switches a live grant between edit and view only. */
export function setGrantEdit(grantId: string, canEdit: boolean): Promise<Result> {
  return updateLiveGrant(grantId, { can_edit: canEdit });
}

/** Ends a grant now. The row stays as history; access ends on the next request. */
export function revokeGrant(grantId: string): Promise<Result> {
  return updateLiveGrant(grantId, { revoked_at: new Date().toISOString() });
}
