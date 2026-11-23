// Central dues year configuration.
//
// The dues year and amounts are set by the board on /board/historical-metrics
// (chapter_metrics.dues_open and the dues columns, migration 132) and read by
// dues-server.ts. The year is NOT derived from the clock: it only advances when
// the board opens the new dues year with its new amounts, so next year's dates
// never show against this year's price.
//
// DUES_FY_START remains only as the default for the one-off, person-specific
// dues pages (grace, vinh). fyStart 2026 => FY2026/27.

export const DUES_FY_START = 2026;

/** The dues year members currently pay for, and its amounts in cents. */
export type OpenDuesYear = { fyStart: number; primaryCents: number; secondaryCents: number | null };

type DuesRow = {
  fiscal_year_start: number;
  dues_open: boolean | null;
  dues_per_member_usd: number | string | null;
  secondary_dues_usd: number | string | null;
};

function toCents(v: number | string | null): number | null {
  const n = v == null || v === "" ? NaN : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/** The newest open year with a local dues amount, or null when none is open. */
export function pickOpenDuesYear(rows: DuesRow[]): OpenDuesYear | null {
  const open = rows
    .filter((r) => r.dues_open && toCents(r.dues_per_member_usd) != null)
    .sort((a, b) => b.fiscal_year_start - a.fiscal_year_start)[0];
  if (!open) return null;
  return {
    fyStart: open.fiscal_year_start,
    primaryCents: toCents(open.dues_per_member_usd) as number,
    secondaryCents: toCents(open.secondary_dues_usd),
  };
}

/** "$2,200" */
export function duesUsd(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", { maximumFractionDigits: Number.isInteger(dollars) ? 0 : 2 })}`;
}

// Card fees are passed to the member: gross up so the chapter nets the dues.
// 3.5% covers 2.9% standard plus a buffer for international cards, plus $0.30,
// rounded up to the nearest dollar.
const STRIPE_RATE = 0.035;
const STRIPE_FIXED_CENTS = 30;
export function grossUpForCard(netCents: number): { grossCents: number; feeCents: number } {
  const grossCents = Math.ceil((netCents + STRIPE_FIXED_CENTS) / (1 - STRIPE_RATE) / 100) * 100;
  return { grossCents, feeCents: grossCents - netCents };
}

/** "2026-2027" (Stripe metadata) back to 2026; null when not a dues year. */
export function fyStartFromDash(value: string | null | undefined): number | null {
  const m = /^(\d{4})-(\d{4})$/.exec(value ?? "");
  return m && Number(m[2]) === Number(m[1]) + 1 ? Number(m[1]) : null;
}

// "2026/2027"
export function duesYearLabel(fyStart: number = DUES_FY_START): string {
  return `${fyStart}/${fyStart + 1}`;
}

// "2026-2027" (used in Stripe metadata / dues_year)
export function duesYearDash(fyStart: number = DUES_FY_START): string {
  return `${fyStart}-${fyStart + 1}`;
}

// "July 1, 2026 to June 30, 2027"
export function duesWindow(fyStart: number = DUES_FY_START): string {
  return `July 1, ${fyStart} to June 30, ${fyStart + 1}`;
}
