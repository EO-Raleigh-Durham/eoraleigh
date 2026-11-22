// Server-only auth helpers. NEVER import from a client component.
// All mutations use the service-role client (supabase.ts) to bypass RLS.

import { CHAPTER_NAME } from "../kernel/config/chapter.ts";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSessionClient } from "./supabase-server";
import { firstPartyUser } from "./oauth-client-token";
import { supabase } from "./supabase";
import {
  roleAtLeast,
  roleRank,
  TIER_RANK,
  type PageTier,
  type UserRole,
} from "./access";
import { hasCurrentBoardAppointment, type BoardAccessClient } from "./board-access";
import { postgrestLikeLiteral } from "./postgrest-like";
import {
  profileLookupError,
  resolvedProfilePersonId,
  resolvedProfileRole,
} from "./member-profile";

export type { UserRole } from "./access";

export type SessionUser = {
  id: string;        // user_profiles.id
  userId: string;    // auth.users.id
  email: string;
  fullName: string | null;
  role: UserRole;
  active: boolean;
  personId: string | null;
};

type VerifiedAuthUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: { full_name?: unknown };
};

type ProvisionedProfile =
  | { ok: true; role: UserRole; personId: string | null }
  | { ok: false; error: string };

async function lookupCurrentMembership(
  personId: string,
): Promise<{ active: boolean; error: string | null }> {
  const chapterResult = await supabase
    .from("chapters")
    .select("id")
    .eq("chapter_name", CHAPTER_NAME)
    .maybeSingle();
  const chapterLookupError = profileLookupError(chapterResult);
  if (chapterLookupError) return { active: false, error: chapterLookupError };
  if (!chapterResult.data) {
    return { active: false, error: `${CHAPTER_NAME} chapter not found` };
  }

  const membershipResult = await supabase
    .from("chapter_memberships")
    .select("id")
    .eq("person_id", personId)
    .eq("chapter_id", chapterResult.data.id)
    .in("status", ["active", "on_leave"])
    .limit(1)
    .maybeSingle();
  const membershipLookupError = profileLookupError(membershipResult);
  return {
    active: Boolean(membershipResult.data),
    error: membershipLookupError,
  };
}

/**
 * Creates or refreshes the application profile for an Auth user whose email
 * has already been verified by Supabase. Email ownership identifies the
 * person; chapter_memberships remains the authority for member access.
 */
export async function provisionVerifiedUserProfile(
  authUser: VerifiedAuthUser,
): Promise<ProvisionedProfile> {
  const email = authUser.email?.trim().toLowerCase();
  if (!email) return { ok: false, error: "Authenticated user has no email" };
  if (!authUser.email_confirmed_at) {
    return { ok: false, error: "Email confirmation required" };
  }

  const { data: existing, error: existingError } = await supabase
    .from("user_profiles")
    .select("id, role, full_name, person_id, active")
    .eq("user_id", authUser.id)
    .maybeSingle();
  if (existingError) return { ok: false, error: existingError.message };
  if (existing && !existing.active) {
    return { ok: false, error: "This account is inactive" };
  }

  const [aliasResult, primaryResult] = await Promise.all([
    supabase
      .from("person_emails")
      .select("person_id")
      .ilike("email", postgrestLikeLiteral(email))
      .maybeSingle(),
    supabase
      .from("people")
      .select("id, name")
      .ilike("email", postgrestLikeLiteral(email))
      .maybeSingle(),
  ]);
  const identityLookupError = profileLookupError(aliasResult, primaryResult);
  if (identityLookupError) return { ok: false, error: identityLookupError };
  const alias = aliasResult.data;
  const primary = primaryResult.data;

  const personId = resolvedProfilePersonId(
    existing?.person_id ?? null,
    alias?.person_id ?? null,
    primary?.id ?? null,
  );
  let hasCurrentMembership = false;
  if (personId) {
    const membership = await lookupCurrentMembership(personId);
    if (membership.error) return { ok: false, error: membership.error };
    hasCurrentMembership = membership.active;
  }

  const existingRole = (existing?.role as UserRole | undefined) ?? null;
  const role = resolvedProfileRole(existingRole, hasCurrentMembership);
  const metadataName = authUser.user_metadata?.full_name;
  const fullName =
    existing?.full_name ??
    (typeof metadataName === "string" && metadataName.trim() ? metadataName.trim() : null) ??
    primary?.name ??
    null;
  const profile = {
    user_id: authUser.id,
    email,
    full_name: fullName,
    role,
    active: existing?.active ?? true,
    person_id: personId,
    updated_at: new Date().toISOString(),
  };
  const { error } = existing
    ? await supabase.from("user_profiles").update(profile).eq("id", existing.id)
    : await supabase.from("user_profiles").insert(profile);
  if (error) return { ok: false, error: error.message };

  return { ok: true, role, personId };
}

/**
 * Returns the authenticated user's profile, or null if not signed in
 * or if their profile row is missing / inactive.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const client = await createSessionClient();
  // A connector (OAuth client) token is never a website sign-in.
  const user = await firstPartyUser(client);
  if (!user) return null;
  return sessionUserForAuthUser(user.id);
});

/**
 * The profile, role and person of an auth user id: the one rule both a cookie
 * sign-in (getSessionUser) and a connector token (src/lib/mcp/caller.ts) use,
 * so a connected app is judged exactly as the person's own pages are.
 */
export async function sessionUserForAuthUser(authUserId: string): Promise<SessionUser | null> {
  const user = { id: authUserId };

  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("id, user_id, email, full_name, role, active, person_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  if (profileErr || !profile) return null;

  // Staff roles remain explicit. Ordinary roles are re-derived from the live
  // membership record on every request so revoked memberships cannot retain
  // access through a long-lived session or stale user_profiles role.
  let role = profile.role as UserRole;
  if (profile.person_id && roleRank(role) < TIER_RANK.board) {
    if (await hasCurrentBoardAppointment(supabase as unknown as BoardAccessClient, profile.person_id)) {
      role = "board";
    } else {
      const membership = await lookupCurrentMembership(profile.person_id);
      if (membership.error) return null;
      role = resolvedProfileRole(role, membership.active);
    }
  } else if (roleRank(role) < TIER_RANK.board) {
    role = resolvedProfileRole(role, false);
  }

  return {
    id: profile.id,
    userId: profile.user_id,
    email: profile.email,
    fullName: profile.full_name,
    role,
    active: profile.active,
    personId: profile.person_id,
  };
}

/**
 * Contact details for prefilling public forms for a signed-in member.
 * Returns null when logged out. Phone comes from the linked people row.
 */
export async function getSessionContact(): Promise<
  { name: string | null; email: string; phone: string | null } | null
> {
  const user = await getSessionUser();
  if (!user) return null;
  let phone: string | null = null;
  if (user.personId) {
    const { data } = await supabase
      .from("people")
      .select("phone")
      .eq("id", user.personId)
      .maybeSingle();
    phone = (data?.phone as string | null) ?? null;
  }
  return { name: user.fullName, email: user.email, phone };
}

/**
 * The single role-gate primitive. Redirects unless the current user's role
 * meets `minTier` on the access ladder (see src/lib/access.ts). All the named
 * guards below are defined in terms of this. Admin/board tiers bounce to the
 * admin login by default; lower tiers to the member login.
 */
export async function requireAtLeast(
  minTier: PageTier,
  redirectTo?: string,
): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || !roleAtLeast(user.role, minTier)) {
    const fallback =
      minTier === "admin" || minTier === "board" ? "/admin/login" : "/login";
    redirect(redirectTo ?? fallback);
  }
  return user;
}

/**
 * Throws a redirect to /admin/login if the current user is not super_admin.
 */
export async function requireSuperAdmin(redirectTo = "/admin/login"): Promise<SessionUser> {
  return requireAtLeast("admin", redirectTo);
}

/**
 * Throws a redirect to /admin/login if the current user is not board or above.
 */
export async function requireBoardOrAbove(redirectTo = "/admin/login"): Promise<SessionUser> {
  return requireAtLeast("board", redirectTo);
}

/**
 * Throws a redirect to /login if the current user is not member or above.
 */
export async function requireMemberOrAbove(redirectTo = "/login"): Promise<SessionUser> {
  return requireAtLeast("member", redirectTo);
}

/**
 * Throws a redirect to /login if the current user is not authenticated
 * (any active role — guest or above).
 */
export async function requireAuth(redirectTo = "/login"): Promise<SessionUser> {
  return requireAtLeast("guest", redirectTo);
}

/**
 * Creates a Supabase Auth user and a user_profiles row.
 * Supabase sends an invite email prompting the user to set their password.
 */
export async function createUser(
  email: string,
  fullName: string,
  role: UserRole,
  invitedByProfileId?: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const { data: created, error: authErr } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { full_name: fullName },
  });

  if (authErr || !created.user) {
    return { ok: false, error: authErr?.message ?? "Failed to create auth user" };
  }

  const userId = created.user.id;

  const { error: profileErr } = await supabase.from("user_profiles").insert({
    user_id: userId,
    email,
    full_name: fullName,
    role,
    active: true,
    invited_by: invitedByProfileId ?? null,
  });

  if (profileErr) {
    return { ok: false, error: profileErr.message };
  }

  return { ok: true, userId };
}

/**
 * Deactivates a user — sets active=false. Preserves all data.
 */
export async function deactivateUser(
  profileId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from("user_profiles")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", profileId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Reactivates a previously deactivated user.
 */
export async function reactivateUser(
  profileId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from("user_profiles")
    .update({ active: true, updated_at: new Date().toISOString() })
    .eq("id", profileId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Updates a user's role.
 */
export async function updateUserRole(
  profileId: string,
  role: UserRole,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from("user_profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", profileId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Creates a guest auth user linked to a person_id.
 * Used by the RSVP flow. Sends "set your password" email.
 * Returns early if a user_profiles row already exists for this email.
 */
export async function provisionGuestUser(
  email: string,
  name: string,
  personId: string,
): Promise<{ ok: true; alreadyExisted: boolean } | { ok: false; error: string }> {
  // Check if a profile already exists for this email
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id, person_id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    // If person_id is not linked yet, link it now
    if (!existing.person_id && personId) {
      await supabase
        .from("user_profiles")
        .update({ person_id: personId, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    return { ok: true, alreadyExisted: true };
  }

  // Create the auth user
  const { data: created, error: authErr } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { full_name: name },
  });

  if (authErr || !created.user) {
    return { ok: false, error: authErr?.message ?? "Failed to create guest auth user" };
  }

  const { error: profileErr } = await supabase.from("user_profiles").insert({
    user_id: created.user.id,
    email,
    full_name: name,
    role: "guest",
    active: true,
    person_id: personId,
  });

  if (profileErr) {
    return { ok: false, error: profileErr.message };
  }

  return { ok: true, alreadyExisted: false };
}
