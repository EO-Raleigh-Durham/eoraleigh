/**
 * Pure voucher rules shared by preview, reservation, and payment code.
 *
 * All money values are integer minor units (cents for USD). Database lookup,
 * eligibility, availability, and redemption remain the caller's responsibility.
 */

export const VOUCHER_PERCENTAGE_MIN = 1;
export const VOUCHER_PERCENTAGE_MAX = 100;

export type VoucherPublicError =
  | "invalid_code"
  | "invalid_discount"
  | "invalid_price"
  | "invalid_quantity"
  | "invalid_request"
  | "unavailable"
  | "ineligible_ticket"
  | "limit_reached"
  | "email_limit_reached";

const PUBLIC_ERROR_MESSAGES: Readonly<Record<VoucherPublicError, string>> = {
  invalid_code: "That invitation code is not valid.",
  invalid_discount: "This invitation is not available.",
  invalid_price: "We could not calculate this ticket price.",
  invalid_quantity: "Choose a valid number of attendees.",
  invalid_request: "We could not apply this invitation.",
  unavailable: "This invitation is not available.",
  ineligible_ticket: "This invitation does not apply to the selected ticket.",
  limit_reached: "This invitation has reached its usage limit.",
  email_limit_reached: "This email has reached the invitation usage limit.",
};

export function voucherErrorMessage(error: VoucherPublicError): string {
  return PUBLIC_ERROR_MESSAGES[error];
}

export function normalizeVoucherCode(code: string): string {
  return code.trim().toUpperCase();
}

export function resolveSingleActiveVoucherTicketId(
  eligibleTicketTypeIds: readonly string[],
  activeTicketTypeIds: readonly string[],
): string | null {
  const activeTicketIds = new Set(activeTicketTypeIds);
  const matchingTicketIds = [
    ...new Set(eligibleTicketTypeIds.filter((ticketTypeId) => activeTicketIds.has(ticketTypeId))),
  ];
  return matchingTicketIds.length === 1 ? matchingTicketIds[0] : null;
}

export function requirePaidVoucherPaymentIntent(value: string | null): string {
  const paymentIntentId = value?.trim();
  if (!paymentIntentId) {
    throw new Error("Paid voucher checkout is missing a payment intent");
  }
  return paymentIntentId;
}

export function isVoucherPercentage(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= VOUCHER_PERCENTAGE_MIN &&
    value <= VOUCHER_PERCENTAGE_MAX
  );
}

export type VoucherPriceInput = Readonly<{
  code: string;
  percentOff: number;
  ticketTypeId: string;
  unitPrice: number;
  quantity: number;
  currency: string;
  voucherId?: string | null;
  campaignLabel?: string | null;
}>;

/** Historical financial facts. Never reconstruct them from edited vouchers. */
export type VoucherPricingSnapshot = Readonly<{
  voucherId: string | null;
  code: string;
  campaignLabel: string | null;
  percentOff: number;
  ticketTypeId: string;
  unitPrice: number;
  quantity: number;
  currency: string;
  baseTotal: number;
  discountTotal: number;
  finalTotal: number;
}>;

export type VoucherPriceSuccess = Readonly<{
  ok: true;
  code: string;
  percentOff: number;
  ticketTypeId: string;
  unitPrice: number;
  quantity: number;
  currency: string;
  baseTotal: number;
  discountTotal: number;
  finalTotal: number;
  requiresPayment: boolean;
  snapshot: VoucherPricingSnapshot;
}>;

export type VoucherPriceFailure = Readonly<{
  ok: false;
  error: VoucherPublicError;
}>;

export type VoucherPriceResult = VoucherPriceSuccess | VoucherPriceFailure;

export type VoucherMetricRow = Readonly<{
  state: "reserved" | "redeemed" | "released";
  discountedSeatQuantity: number;
  baseTotal: number;
  discountTotal: number;
  finalTotal: number;
  reviewClassification?: string | null;
}>;

export type VoucherMetrics = Readonly<{
  reservedSeats: number;
  redeemedSeats: number;
  releasedSeats: number;
  baseTotal: number;
  discountTotal: number;
  netTotal: number;
}>;

export function summarizeVoucherRedemptions(rows: VoucherMetricRow[]): VoucherMetrics {
  const operationalRows = rows.filter((row) => row.reviewClassification !== "spam");
  const seats = (state: VoucherMetricRow["state"]) =>
    operationalRows
      .filter((row) => row.state === state)
      .reduce((sum, row) => sum + row.discountedSeatQuantity, 0);
  const redeemedRows = operationalRows.filter((row) => row.state === "redeemed");
  return Object.freeze({
    reservedSeats: seats("reserved"),
    redeemedSeats: seats("redeemed"),
    releasedSeats: seats("released"),
    baseTotal: redeemedRows.reduce((sum, row) => sum + row.baseTotal, 0),
    discountTotal: redeemedRows.reduce((sum, row) => sum + row.discountTotal, 0),
    netTotal: redeemedRows.reduce((sum, row) => sum + row.finalTotal, 0),
  });
}

export function createVoucherPricingSnapshot(
  input: VoucherPricingSnapshot,
): VoucherPricingSnapshot {
  return Object.freeze({ ...input });
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

/**
 * Round half up once on the complete registration base total:
 * floor((baseTotal * percentOff + 50) / 100).
 *
 * Splitting quotient and remainder avoids overflowing Number.MAX_SAFE_INTEGER
 * while producing the exact same integer result.
 */
function percentageOfTotal(baseTotal: number, percentOff: number): number {
  const wholeHundreds = Math.floor(baseTotal / 100);
  const remainder = baseTotal % 100;
  return (
    wholeHundreds * percentOff +
    Math.floor((remainder * percentOff + 50) / 100)
  );
}

export function calculateVoucherPrice(
  input: VoucherPriceInput,
): VoucherPriceResult {
  const code = normalizeVoucherCode(input.code);
  if (!code) return { ok: false, error: "invalid_code" };
  if (!isVoucherPercentage(input.percentOff)) {
    return { ok: false, error: "invalid_discount" };
  }
  if (!input.ticketTypeId.trim() || !input.currency.trim()) {
    return { ok: false, error: "invalid_request" };
  }
  if (!isNonNegativeInteger(input.unitPrice)) {
    return { ok: false, error: "invalid_price" };
  }
  if (!Number.isSafeInteger(input.quantity) || input.quantity < 1) {
    return { ok: false, error: "invalid_quantity" };
  }

  const baseTotal = input.unitPrice * input.quantity;
  if (!Number.isSafeInteger(baseTotal)) {
    return { ok: false, error: "invalid_price" };
  }

  const discountTotal = percentageOfTotal(baseTotal, input.percentOff);
  const finalTotal = baseTotal - discountTotal;
  const currency = input.currency.trim().toUpperCase();
  const ticketTypeId = input.ticketTypeId.trim();
  const snapshot = createVoucherPricingSnapshot({
    voucherId: input.voucherId ?? null,
    code,
    campaignLabel: input.campaignLabel?.trim() || null,
    percentOff: input.percentOff,
    ticketTypeId,
    unitPrice: input.unitPrice,
    quantity: input.quantity,
    currency,
    baseTotal,
    discountTotal,
    finalTotal,
  });

  return Object.freeze({
    ok: true,
    code,
    percentOff: input.percentOff,
    ticketTypeId,
    unitPrice: input.unitPrice,
    quantity: input.quantity,
    currency,
    baseTotal,
    discountTotal,
    finalTotal,
    requiresPayment: finalTotal > 0,
    snapshot,
  });
}
