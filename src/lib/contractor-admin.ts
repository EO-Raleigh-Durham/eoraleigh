// Super-admin contractor management: pure validation, no runtime imports, so
// it is safe to unit test. The database side lives in access-grants-admin.ts.
// Plan: docs/plans/10-contractor-access.html (decided 17 Nov 2026: edit but
// not delete, default expiry 90 days, only a super admin grants or revokes).

import type { UserRole } from "./access.ts";
import { vnToday, type AccessArea } from "./access-grants.ts";

export const DEFAULT_GRANT_DAYS = 90;

export const AREA_LABEL: Record<AccessArea, string> = {
  sap_pipeline: "SAP pipeline",
};

const AREAS = Object.keys(AREA_LABEL) as AccessArea[];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD `days` after a YYYY-MM-DD date. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The default last day of access for a new or renewed grant. */
export function defaultExpiry(now: Date = new Date()): string {
  return addDays(vnToday(now), DEFAULT_GRANT_DAYS);
}

/** Why a date cannot be a grant's last day, or null when it can. */
export function expiryError(value: string, now: Date = new Date()): string | null {
  if (!DATE_RE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    return "Pick an expiry date.";
  }
  if (addDays(value, 0) !== value) return "Pick an expiry date.";
  if (value < vnToday(now)) return "The expiry date can't be in the past.";
  return null;
}

export type ContractorInput = {
  email: string;
  fullName: string;
  area: AccessArea;
  sponsorPersonId: string;
  canEdit: boolean;
  expiresAt: string;
};

/** Parses the add-contractor form. Returns the input or the first error. */
export function parseContractorForm(
  raw: {
    email: string;
    fullName: string;
    area: string;
    sponsorPersonId: string;
    access: string;
    expiresAt: string;
  },
  now: Date = new Date(),
): { ok: true; input: ContractorInput } | { ok: false; error: string } {
  const email = raw.email.trim().toLowerCase();
  const fullName = raw.fullName.trim().replace(/\s+/g, " ");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email." };
  }
  if (!fullName) return { ok: false, error: "Enter their full name." };
  if (!AREAS.includes(raw.area as AccessArea)) return { ok: false, error: "Pick an area." };
  if (!raw.sponsorPersonId.trim()) return { ok: false, error: "Pick a sponsor." };
  if (raw.access !== "edit" && raw.access !== "view") {
    return { ok: false, error: "Pick edit or view only." };
  }
  const expiresAt = raw.expiresAt.trim();
  const dateError = expiryError(expiresAt, now);
  if (dateError) return { ok: false, error: dateError };
  return {
    ok: true,
    input: {
      email,
      fullName,
      area: raw.area as AccessArea,
      sponsorPersonId: raw.sponsorPersonId.trim(),
      canEdit: raw.access === "edit",
      expiresAt,
    },
  };
}

/**
 * Why an existing account cannot be made a contractor, or null when it can.
 * Contractors are non-members: members, board and super admins already reach
 * more through their role, and changing them would cut their access.
 */
export function contractorRoleBlock(existingRole: UserRole | null): string | null {
  if (existingRole === null || existingRole === "guest" || existingRole === "contractor") {
    return null;
  }
  return "This person already has member or staff access, so they don't need a contractor grant.";
}
