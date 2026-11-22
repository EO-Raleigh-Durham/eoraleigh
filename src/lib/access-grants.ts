// Area access grants: the only way a contractor reaches anything beyond the
// guest tier. Pure policy, no runtime imports, so it is safe to unit test and
// to use from server code. The guard that loads grants lives in
// access-grants-server.ts. Plan: docs/plans/10-contractor-access.html

import { roleAtLeast, type UserRole } from "./access.ts";
import { CONTRACTOR_NDA_VERSION } from "../content/legal/contractor-nda.ts";

export type AccessArea = "sap_pipeline";

// Routes that belong to a grantable area. A contractor may enter only these;
// the page, layout and Server Actions then verify the grant itself.
const AREA_ROUTES: { prefix: string; area: AccessArea }[] = [
  { prefix: "/board/strategic-alliance-partners", area: "sap_pipeline" },
];

// Where a contractor lands, and where the proxy sends them from any route
// outside their areas.
export const CONTRACTOR_HOME = "/board/strategic-alliance-partners";

// Shown to a signed-in contractor whose grant is missing, expired or revoked.
// Lives outside /board so it can never loop.
export const CONTRACTOR_ACCESS_PATH = "/contractor/access";

// Where a contractor accepts the NDA. Every area route sends them here until
// they accept the current version.
export const CONTRACTOR_NDA_PATH = "/contractor/nda";

export function grantAreaForPath(pathname: string): AccessArea | null {
  for (const r of AREA_ROUTES) {
    if (pathname === r.prefix || pathname.startsWith(r.prefix + "/")) return r.area;
  }
  return null;
}

// Request header the proxy sets to the path being served, so the board layout
// can repeat the route check (a layout cannot read the pathname itself). The
// proxy always overwrites it, so a browser cannot supply its own value.
export const PATHNAME_HEADER = "x-eo-pathname";

// Whether a role may be served a /board route: board and above everywhere, a
// contractor only inside a grantable area (the grant itself is checked
// separately), nobody else. An unknown path fails closed for contractors.
export function boardRouteAllows(
  role: UserRole | null | undefined,
  pathname: string | null | undefined,
): boolean {
  if (roleAtLeast(role, "board")) return true;
  return role === "contractor" && !!pathname && grantAreaForPath(pathname) !== null;
}

export type AccessGrant = {
  area: AccessArea;
  can_edit: boolean;
  expires_at: string; // YYYY-MM-DD, last day of access (inclusive)
  revoked_at: string | null;
  nda_version: string | null;
  nda_accepted_at: string | null;
};

export type GrantState = "active" | "nda_required" | "expired" | "revoked";

// Today's date in the chapter's time zone (UTC+7), as YYYY-MM-DD, so a grant ending on a
// given day stays valid through that whole local day.
export function vnToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function grantState(grant: AccessGrant, now: Date = new Date()): GrantState {
  if (grant.revoked_at) return "revoked";
  if (grant.expires_at < vnToday(now)) return "expired";
  if (!grant.nda_accepted_at || grant.nda_version !== CONTRACTOR_NDA_VERSION) {
    return "nda_required";
  }
  return "active";
}

// Board and above reach every area through their role. Anyone else needs an
// active grant for that area, and an edit grant to change anything.
export function areaAllows(
  role: UserRole | null | undefined,
  grant: AccessGrant | null,
  opts: { edit?: boolean } = {},
  now: Date = new Date(),
): boolean {
  if (roleAtLeast(role, "board")) return true;
  if (!role || !grant) return false;
  if (grantState(grant, now) !== "active") return false;
  return opts.edit ? grant.can_edit : true;
}

// Why an NDA acceptance must be refused, or null when it may be recorded.
// The grant must still be live (not revoked or expired), the box ticked, a
// real name typed, and the version the contractor saw must be the current one.
export function ndaAcceptanceError(
  input: { agreed: boolean; name: string; version: string },
  grant: AccessGrant | null,
  now: Date = new Date(),
): string | null {
  if (!grant) return "You don't have an access grant to accept.";
  const state = grantState(grant, now);
  if (state === "revoked" || state === "expired") return "Your access has ended.";
  if (input.version !== CONTRACTOR_NDA_VERSION) {
    return "The agreement has been updated. Please read the new version.";
  }
  if (!input.agreed) return "Tick the box to confirm you agree.";
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 3 || name.length > 120) return "Type your full name to sign.";
  return null;
}
