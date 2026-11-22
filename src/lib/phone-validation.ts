/**
 * Checks phone-number syntax and plausible digit length.
 * It does not verify that a number is assigned or reachable.
 */
export function isValidPhoneNumber(value: string): boolean {
  const phone = value.trim();

  if (!phone || !/^\+?[\d(][\d\s().-]*\d$/.test(phone)) {
    return false;
  }

  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}
