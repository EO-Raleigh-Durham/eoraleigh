import { CHAPTER_LOCAL_CURRENCY } from "../kernel/config/chapter.ts";
import { isZeroDecimalCurrency } from "./currency.ts";

// USD plus the chapter's local currency, when one is configured.
export const SUPPORTED_EVENT_PAYMENT_CURRENCIES: readonly string[] =
  CHAPTER_LOCAL_CURRENCY && CHAPTER_LOCAL_CURRENCY !== "USD"
    ? ["USD", CHAPTER_LOCAL_CURRENCY]
    : ["USD"];

const SUPPORTED_CURRENCIES_LABEL = SUPPORTED_EVENT_PAYMENT_CURRENCIES.join(" or ");

const supportedEventPaymentCurrencies = new Set<string>(
  SUPPORTED_EVENT_PAYMENT_CURRENCIES,
);

export type EventTicketPriceResult =
  | { ok: true; currency: string; priceAmount: number }
  | { ok: false; error: string };

export type EventCheckoutCurrencyResult =
  | { ok: true; currency: string }
  | { ok: false; error: string };

function normalizeSupportedCurrency(currencyRaw: string): string | null {
  const currency = currencyRaw.trim().toUpperCase();
  return supportedEventPaymentCurrencies.has(currency) ? currency : null;
}

export function parseEventTicketPrice(
  priceMajorUnitsRaw: string,
  currencyRaw: string,
): EventTicketPriceResult {
  const currency = normalizeSupportedCurrency(currencyRaw);
  if (!currency) {
    return { ok: false, error: `Currency must be ${SUPPORTED_CURRENCIES_LABEL}` };
  }

  const majorUnits = Number(priceMajorUnitsRaw.trim() || "0");
  if (!Number.isFinite(majorUnits) || majorUnits < 0) {
    return { ok: false, error: "Price must be a non-negative number" };
  }
  if (isZeroDecimalCurrency(currency) && !Number.isInteger(majorUnits)) {
    return { ok: false, error: `Price must be a whole number for ${currency}` };
  }

  const priceAmount = isZeroDecimalCurrency(currency)
    ? majorUnits
    : Math.round(majorUnits * 100);
  if (!Number.isSafeInteger(priceAmount)) {
    return { ok: false, error: "Price is too large" };
  }

  return { ok: true, currency, priceAmount };
}

export function resolveEventCheckoutCurrency(
  lineItems: Array<{ amount: number; currency: string }>,
): EventCheckoutCurrencyResult {
  const paidCurrencies = new Set<string>();

  for (const lineItem of lineItems) {
    if (lineItem.amount <= 0) continue;
    const currency = normalizeSupportedCurrency(lineItem.currency);
    if (!currency) {
      return { ok: false, error: `Paid event currency must be ${SUPPORTED_CURRENCIES_LABEL}` };
    }
    paidCurrencies.add(currency);
  }

  if (paidCurrencies.size !== 1) {
    return { ok: false, error: "All paid checkout items must use one currency" };
  }

  return { ok: true, currency: [...paidCurrencies][0] };
}
