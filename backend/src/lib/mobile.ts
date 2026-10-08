/*
|--------------------------------------------------------------------------
| INDIAN MOBILE NUMBER HELPERS
|--------------------------------------------------------------------------
*/

/**
 * Reduces any common Indian mobile format to a bare 10-digit number.
 *
 *   "+91 98765-43210" -> "9876543210"
 *   "919876543210"    -> "9876543210"
 *   "09876543210"     -> "9876543210"
 */
export function normalizeMobile(value: unknown): string {
  let number = String(value ?? "").trim();

  number = number.replace(/[\s\-()]/g, "");

  if (number.startsWith("+91")) {
    number = number.slice(3);
  }

  if (number.startsWith("91") && number.length === 12) {
    number = number.slice(2);
  }

  if (number.startsWith("0") && number.length === 11) {
    number = number.slice(1);
  }

  return number;
}

/**
 * Strips every non-digit. Used where the original student check kept the
 * looser `replace(/\D/g, "")` behaviour.
 */
export function digitsOnly(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "").trim();
}

/**
 * True for a valid 10-digit Indian mobile number.
 */
export function isValidIndianMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile);
}

/**
 * Historical storage formats for the same number, so lookups also match
 * records written before normalisation existed.
 */
export function mobileVariants(mobile: string): string[] {
  return [mobile, `0${mobile}`, `91${mobile}`, `+91${mobile}`];
}

/**
 * E.164 form used by Firebase Auth phone accounts.
 */
export function toE164(mobile: string): string {
  return `+91${mobile}`;
}
