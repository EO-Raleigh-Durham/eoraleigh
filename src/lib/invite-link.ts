/**
 * The one-time link an invitation carries: our own /auth/confirm route, which
 * verifies the token, signs the person in and sends them to choose a password.
 * Falls back to Supabase's own verify link when no site URL is configured.
 */
export function inviteConfirmLink(
  siteUrl: string,
  tokenHash: string,
  otpType: "invite" | "email",
  fallback: string,
): string {
  if (!siteUrl || !tokenHash) return fallback;
  const q = new URLSearchParams({ token_hash: tokenHash, type: otpType, next: "/reset-password" });
  return `${siteUrl.replace(/\/+$/, "")}/auth/confirm?${q.toString()}`;
}
