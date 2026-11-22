import {
  isRise4Role,
  isRise4RevenueScale,
  roleRequiresCompany,
  roleRequiresRevenueScale,
} from "./rise4-guest-vetting.ts";

export type InterestMembership = "member" | "not_yet";

export type InterestInput = {
  name?: string;
  email?: string;
  membership?: string;
  company?: string;
  role_in_company?: string;
  revenue_scale?: string;
};

export type InterestDetails = {
  name: string;
  email: string;
  membership: InterestMembership;
  company: string | null;
  role_in_company: string | null;
  revenue_scale: string | null;
};

export type InterestResult =
  | { ok: true; details: InterestDetails }
  | { ok: false; error: string };

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// Members give name, email and the membership answer. People who are not
// members yet also give role, company and, for founders and key executives,
// revenue scale: the same questions RISE 4 registration asks.
export function validateInterest(input: InterestInput): InterestResult {
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const membership = input.membership?.trim() ?? "";

  if (membership !== "member" && membership !== "not_yet") {
    return { ok: false, error: "Please tell us if you are already a member." };
  }
  if (!name || !email) {
    return { ok: false, error: "Please add your name and email." };
  }
  if (!isEmail(email)) {
    return { ok: false, error: "Invalid email" };
  }

  if (membership === "member") {
    return {
      ok: true,
      details: {
        name,
        email,
        membership,
        company: null,
        role_in_company: null,
        revenue_scale: null,
      },
    };
  }

  const role = input.role_in_company?.trim() ?? "";
  const company = input.company?.trim() ?? "";
  const revenue = input.revenue_scale?.trim() ?? "";

  if (!isRise4Role(role)) {
    return { ok: false, error: "Please choose your role." };
  }
  if (roleRequiresRevenueScale(role) && !isRise4RevenueScale(revenue)) {
    return { ok: false, error: "Please choose your revenue scale." };
  }
  if (roleRequiresCompany(role) && !company) {
    return { ok: false, error: "Please add your company." };
  }

  return {
    ok: true,
    details: {
      name,
      email,
      membership,
      company: company || null,
      role_in_company: role,
      revenue_scale: roleRequiresRevenueScale(role) ? revenue : null,
    },
  };
}
