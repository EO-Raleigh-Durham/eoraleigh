export type VoucherCheckoutSessionStatus = "open" | "complete" | "expired";

/**
 * An unattached Stripe session is safe to release only when Stripe has
 * positively confirmed that it can no longer accept payment.
 */
export function canReleaseUnattachedVoucherCheckout(
  status: VoucherCheckoutSessionStatus | null,
  expirationConfirmed: boolean,
): boolean {
  return status === "expired" || (status === "open" && expirationConfirmed);
}

type StandardCheckoutPersistence = {
  attach: () => Promise<boolean>;
  expire: () => Promise<VoucherCheckoutSessionStatus | null>;
  release: () => Promise<void>;
  onExpireError?: (error: unknown) => void;
};

/**
 * A standard checkout is safe to return to the browser only after its Stripe
 * session id is persisted. If persistence fails, revoke the checkout and
 * release its registration only after Stripe confirms it cannot be paid.
 */
export async function secureStandardCheckoutSession(
  status: VoucherCheckoutSessionStatus | null,
  persistence: StandardCheckoutPersistence,
): Promise<boolean> {
  if (await persistence.attach()) return true;

  let expirationConfirmed = status === "expired";
  try {
    if (status === "open") {
      expirationConfirmed = (await persistence.expire()) === "expired";
    }
  } catch (error) {
    persistence.onExpireError?.(error);
  }

  if (canReleaseUnattachedVoucherCheckout(status, expirationConfirmed)) {
    await persistence.release();
  }
  return false;
}
