// Central dues year configuration.
//
// The dues AMOUNT is a board decision set per flow (regular vs grace) inside
// each checkout action, so it stays where it is. The fiscal year those dues
// apply to lives here, in one place, so every member-facing label (checkout,
// invoice, bank-transfer page) stays in sync.
//
// DUES_FY_START is an explicit constant, NOT derived from the clock: the dues
// year must only advance when the board opens the new dues year and sets the
// new amounts. Auto-rolling the label off the calendar would risk showing next
// year's dates against this year's price. Bump this (with the amounts) each
// cycle. fyStart 2026 => FY2026/27.

export const DUES_FY_START = 2026;

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
