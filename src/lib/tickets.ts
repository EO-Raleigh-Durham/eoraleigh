import { randomBytes } from "crypto";
import QRCode from "qrcode";

// Server-only ticket helpers. A registration's `ticket_code` is an opaque
// token rendered as a QR on the public ticket page (/t/<code>) and scanned
// at the door for check-in. NEVER import from a client component.

// Crockford base32 (no I, L, O, U) — unambiguous when printed or read aloud.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

// 12 chars of Crockford base32 = 60 bits. 256 % 32 === 0, so a byte mod 32
// is perfectly uniform (no modulo bias).
export function newTicketCode(len = 12): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % 32];
  return out;
}

export function ticketPath(code: string): string {
  return `/t/${code}`;
}

// The QR encodes the absolute ticket URL so any phone camera opens the ticket.
// The door scanner accepts either that URL or a bare code (see normalizeTicketCode).
export function ticketUrl(code: string, origin: string): string {
  return `${origin}${ticketPath(code)}`;
}

// Accept a raw scanned value that may be a full ticket URL ("https://host/t/ABC?x=1")
// or just the bare code, and return the bare code. Returns "" if nothing usable.
export function normalizeTicketCode(scanned: string): string {
  const raw = scanned.trim();
  if (!raw) return "";
  const marker = "/t/";
  const idx = raw.indexOf(marker);
  const tail = idx === -1 ? raw : raw.slice(idx + marker.length);
  // strip any query/hash/trailing slash and uppercase to match stored codes
  return tail.split(/[/?#]/)[0].trim().toUpperCase();
}

export function validTicketCode(code: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{12}$/.test(code);
}

// Render a QR for `data` as an inline SVG string (for dangerouslySetInnerHTML).
export async function qrSvg(data: string): Promise<string> {
  return QRCode.toString(data, {
    type: "svg",
    margin: 1,
    width: 240,
    errorCorrectionLevel: "M",
    color: { dark: "#0C0C31", light: "#FFFFFF" },
  });
}
