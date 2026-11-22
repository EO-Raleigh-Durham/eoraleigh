// RISE 4 is not open to SLPs (Chapter Manager, 6 Nov 2026), so this role is no
// longer offered or accepted at registration. The constant stays because
// registrations recorded before the removal still carry this value.
export const RISE4_SLP_ROLE = "Chapter SLP";

// Events that qualify a "Guest" registrant with the RISE 4 questions (role,
// company, revenue range, how they are connected to us): the RISE 4 slugs and
// any title containing "rise 4". The MyEO dinner after RISE 4 used to be here
// too; its guests now register with name, email, phone and an optional dietary
// note, like everyone else (Chapter Manager, 9 Nov 2026).
const GUEST_VETTING_SLUGS: readonly string[] = [
  "eo-rise-4",
  "eo-rise-4-zero-to-200m",
  "eo-rise-4-building-brands-that-become-lifestyles",
];

export function usesRise4GuestVetting(event: {
  slug?: string | null;
  title?: string | null;
}): boolean {
  if (typeof event.slug === "string" && GUEST_VETTING_SLUGS.includes(event.slug)) {
    return true;
  }
  return (
    typeof event.title === "string" &&
    event.title.toLowerCase().includes("rise 4")
  );
}

export const RISE4_ROLE_OPTIONS = [
  "Founder / Co-founder / Owner / Shareholder",
  "Key Executive",
  "Strategic Alliance Partner (Sponsor)",
  "Company Staff",
  "EO Visiting Member",
] as const;

export const RISE4_REVENUE_SCALE_OPTIONS = [
  "Below $2,500",
  "$2,500 to $1 million",
  "Above $1 million",
] as const;

export type Rise4Role = (typeof RISE4_ROLE_OPTIONS)[number];
export type Rise4RevenueScale = (typeof RISE4_REVENUE_SCALE_OPTIONS)[number];

export function isRise4Role(value: string): value is Rise4Role {
  return (RISE4_ROLE_OPTIONS as readonly string[]).includes(value);
}

export function isRise4RevenueScale(value: string): value is Rise4RevenueScale {
  return (RISE4_REVENUE_SCALE_OPTIONS as readonly string[]).includes(value);
}

export function roleRequiresRevenueScale(role: string): boolean {
  return (
    role === "Founder / Co-founder / Owner / Shareholder" ||
    role === "Key Executive"
  );
}

export function roleRequiresCompany(role: string): boolean {
  return role !== RISE4_SLP_ROLE && role !== "EO Visiting Member";
}
