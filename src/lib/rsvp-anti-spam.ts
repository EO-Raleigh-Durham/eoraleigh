import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const RSVP_MIN_COMPLETION_MS = 2_000;
export const RSVP_TOKEN_MAX_AGE_MS = 2 * 60 * 60 * 1_000;
export const RSVP_BURST_WINDOW_MS = 10 * 60 * 1_000;
export const RSVP_BURST_LIMIT = 3;

const TOKEN_VERSION = "v1";
const RSVP_TOKEN_MAX_LENGTH = 256;

function signingSecret(): string {
  const secret = process.env.RSVP_ANTISPAM_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error("RSVP anti-spam signing secret is not configured");
  }
  return secret;
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createRsvpFormToken(
  eventId: string,
  now = Date.now(),
  secret = signingSecret(),
): string {
  const payload = `${TOKEN_VERSION}.${now}.${randomBytes(12).toString("base64url")}.${eventId}`;
  return `${payload}.${signature(payload, secret)}`;
}

type TokenCheck =
  | { ok: true }
  | { ok: false; reason: "invalid" | "too_fast" | "expired" };

export function verifyRsvpFormToken(
  token: string,
  eventId: string,
  now = Date.now(),
  secret = signingSecret(),
): TokenCheck {
  if (token.length > RSVP_TOKEN_MAX_LENGTH) return { ok: false, reason: "invalid" };
  const parts = token.split(".");
  if (parts.length !== 5) return { ok: false, reason: "invalid" };

  const [version, issuedRaw, nonce, tokenEventId, suppliedSignature] = parts;
  const issuedAt = Number(issuedRaw);
  if (
    version !== TOKEN_VERSION ||
    !Number.isSafeInteger(issuedAt) ||
    !nonce ||
    tokenEventId !== eventId ||
    !suppliedSignature
  ) {
    return { ok: false, reason: "invalid" };
  }

  const payload = `${version}.${issuedRaw}.${nonce}.${tokenEventId}`;
  const expected = Buffer.from(signature(payload, secret));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return { ok: false, reason: "invalid" };
  }

  const age = now - issuedAt;
  if (age < RSVP_MIN_COMPLETION_MS) return { ok: false, reason: "too_fast" };
  if (age > RSVP_TOKEN_MAX_AGE_MS) return { ok: false, reason: "expired" };
  return { ok: true };
}

export function checkRsvpSubmission(
  honeypot: string,
  token: string,
  eventId: string,
  now = Date.now(),
  secret = signingSecret(),
): TokenCheck | { ok: false; reason: "honeypot" } {
  if (honeypot.trim()) return { ok: false, reason: "honeypot" };
  return verifyRsvpFormToken(token, eventId, now, secret);
}

export function isRsvpBurstLimited(recentRegistrationCount: number): boolean {
  return recentRegistrationCount >= RSVP_BURST_LIMIT;
}
