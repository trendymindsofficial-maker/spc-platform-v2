import { Timestamp } from "firebase-admin/firestore";

/*
|--------------------------------------------------------------------------
| DATE HELPERS
|--------------------------------------------------------------------------
*/

/**
 * Adds exactly one calendar year to a date.
 */
export function addOneYear(date: Date): Date {
  const next = new Date(date.getTime());

  next.setFullYear(next.getFullYear() + 1);

  return next;
}

/**
 * Coerces the many shapes a stored date can take (Firestore Timestamp,
 * Date, ISO string, epoch number) into a Date, or null when unusable.
 */
export function toDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const converted = (value as { toDate: () => unknown }).toDate();

    return converted instanceof Date && !Number.isNaN(converted.getTime())
      ? converted
      : null;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}
