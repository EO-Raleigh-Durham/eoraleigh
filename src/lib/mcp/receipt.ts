// Server-only. Preview receipts for the connector's writes (MCP.0, from Edge8 OC.0).
//
// The review of MCP.2 to MCP.4 found that `confirm: true` was a field the app
// set itself, so an app could file a leave request, send a claim or post a
// spark without ever asking for the preview. Now a preview hands back a
// receipt: an HMAC over who asked (the token's person), through which app,
// which tool, and the exact fields previewed, with a ten-minute expiry. The
// write runs only with a receipt that matches all of them, so the app cannot
// skip the preview, change a field after it, or reuse another person's or
// another app's receipt.
//
// A receipt proves the preview was asked for, not that the person read it:
// the connector cannot see the chat. That is why each preview leads with its
// warning in plain words, and the server instructions tell the app to show it.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** How long a preview's receipt stays good: long enough to read and say yes. */
export const RECEIPT_TTL_MS = 10 * 60 * 1000;

export type ReceiptSubject = { personId: string; clientId: string; tool: string };

/** The previewed fields in one stable spelling: keys sorted, unset fields and the receipt itself left out. */
function canonical(fields: Record<string, unknown>): string {
  const keys = Object.keys(fields).filter((k) => k !== "receipt" && fields[k] !== undefined).sort();
  return JSON.stringify(keys.map((k) => [k, fields[k]]));
}

function receiptSecret(): string {
  const secret = process.env.MCP_RECEIPT_SECRET;
  if (!secret) throw new Error("MCP_RECEIPT_SECRET is not set");
  return secret;
}

function sign(body: string): string {
  return createHmac("sha256", receiptSecret()).update(body).digest("base64url");
}

function bodyOf(s: ReceiptSubject, fields: Record<string, unknown>, expires: number): string {
  const fieldsHash = createHash("sha256").update(canonical(fields)).digest("base64url");
  return JSON.stringify([s.personId, s.clientId, s.tool, fieldsHash, expires]);
}

/** The receipt a preview returns, good for these exact fields until it expires. */
export function issueReceipt(s: ReceiptSubject, fields: Record<string, unknown>, now = Date.now()): string {
  const expires = now + RECEIPT_TTL_MS;
  return `${expires}.${sign(bodyOf(s, fields, expires))}`;
}

/** Why a write may not run, or null when its receipt matches what was previewed. */
export function receiptProblem(s: ReceiptSubject, fields: Record<string, unknown>, receipt: unknown, now = Date.now()): string | null {
  const missing = "This needs the receipt from its preview. Call again without receipt to preview, show it to the person, then pass the receipt it returns.";
  if (typeof receipt !== "string") return missing;
  const [exp, mac, extra] = receipt.split(".");
  const expires = Number(exp);
  if (!mac || extra !== undefined || !Number.isSafeInteger(expires)) return missing;
  if (expires < now) return "That preview has expired. Preview it again and show the person.";
  const want = Buffer.from(sign(bodyOf(s, fields, expires)));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) {
    return "This receipt does not match: the request changed after its preview, or it belongs to another request. Preview it again.";
  }
  return null;
}

