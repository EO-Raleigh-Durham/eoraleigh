export type StandardCheckoutPayment = {
  registrationId: string;
  sessionId: string;
  paymentIntentId: string | null;
  amountTotal: number | null;
  currency: string | null;
};

type RpcError = { message: string } | null;

type StandardSnapshotParams = {
  p_registration_id: string;
  p_amount: number;
  p_currency: string;
  p_stripe_session_id: string;
};

type StandardFinalizationParams = {
  p_registration_id: string;
  p_stripe_session_id: string;
  p_stripe_payment_intent_id: string;
  p_amount_paid: number;
  p_currency: string;
};

type StandardCheckoutPersistence = {
  verifySnapshot: (
    params: StandardSnapshotParams,
  ) => Promise<{ data: boolean | null; error: RpcError }>;
  finalize: (
    params: StandardFinalizationParams,
  ) => Promise<{ data: boolean | null; error: RpcError }>;
};

export async function finalizeStandardEventCheckout(
  payment: StandardCheckoutPayment,
  persistence: StandardCheckoutPersistence,
): Promise<void> {
  if (
    payment.amountTotal == null ||
    !Number.isInteger(payment.amountTotal) ||
    payment.amountTotal <= 0 ||
    !payment.currency ||
    !/^[A-Za-z]{3}$/.test(payment.currency)
  ) {
    throw new Error("Standard checkout is missing amount or currency");
  }
  if (!payment.paymentIntentId?.trim()) {
    throw new Error("Standard checkout is missing payment intent");
  }

  const currency = payment.currency.toUpperCase();
  const snapshot = await persistence.verifySnapshot({
    p_registration_id: payment.registrationId,
    p_amount: payment.amountTotal,
    p_currency: currency,
    p_stripe_session_id: payment.sessionId,
  });
  if (snapshot.error || snapshot.data !== true) {
    throw new Error(
      snapshot.error?.message ?? "Standard checkout price could not be verified",
    );
  }

  const finalized = await persistence.finalize({
    p_registration_id: payment.registrationId,
    p_stripe_session_id: payment.sessionId,
    p_stripe_payment_intent_id: payment.paymentIntentId,
    p_amount_paid: payment.amountTotal,
    p_currency: currency,
  });
  if (finalized.error || finalized.data !== true) {
    throw new Error(
      finalized.error?.message ?? "Standard checkout could not be finalized",
    );
  }
}

export function requireRegistrationReload<T>(result: {
  data: T | null;
  error: RpcError;
}): T {
  if (result.error) throw new Error(result.error.message);
  if (!result.data) throw new Error("Finalized registration not found");
  return result.data;
}
