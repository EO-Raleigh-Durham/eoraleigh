// Shared currency-formatting helpers. No server-only dependency (unlike
// src/lib/stripe.ts), so both server and "use client" files can import this.
//
// Every price_amount in this codebase is stored the way Stripe expects
// unit_amount: for a normal currency (USD) that is cents, amount/100 for
// display. A zero-decimal currency (JPY, KRW and the like) stores the literal amount
// in both Stripe and ISO 4217, never divided by 100. Getting this wrong
// silently understates such a price by 100x wherever it is displayed.

import { CHAPTER_LOCAL_CURRENCY, CHAPTER_LOCAL_PER_USD } from "../kernel/config/chapter.ts";

const ZERO_DECIMAL_CURRENCIES = new Set(["VND", "JPY", "KRW"]);

export function isZeroDecimalCurrency(currency: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase());
}

// Converts a stored price_amount into the value Intl.NumberFormat expects
// (the currency's major unit).
export function toMajorUnits(amount: number, currency: string): number {
  return isZeroDecimalCurrency(currency) ? amount : amount / 100;
}

export function formatMoney(amount: number, currency: string = "USD"): string {
  if (amount <= 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(toMajorUnits(amount, currency));
}

// Board dashboards report money in US dollars only. The chapter's local
// currency converts at one fixed planning rate (chapter config) so totals stay
// comparable month to month.
export const VND_PER_USD = CHAPTER_LOCAL_PER_USD;

// A stored amount (see toMajorUnits) in US dollars, or null for a currency
// the dashboards do not convert.
export function toUsd(amount: number, currency: string): number | null {
  const code = currency.toUpperCase();
  if (code === "USD") return amount / 100;
  if (CHAPTER_LOCAL_CURRENCY && code === CHAPTER_LOCAL_CURRENCY && VND_PER_USD > 0) {
    return toMajorUnits(amount, code) / VND_PER_USD;
  }
  return null;
}
