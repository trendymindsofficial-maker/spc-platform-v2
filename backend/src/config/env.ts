import dotenv from "dotenv";

/*
|--------------------------------------------------------------------------
| ENVIRONMENT
|--------------------------------------------------------------------------
|
| Locally the values come from backend/.env.
| On Render they come from the dashboard environment variables.
|
*/

dotenv.config();

function readString(name: string, fallback = ""): string {
  const value = process.env[name];

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

export const NODE_ENV = readString("NODE_ENV", "development");

export const IS_PRODUCTION = NODE_ENV === "production";

/*
 * Render injects PORT. Default is for local development.
 */
export const PORT = Number(readString("PORT", "8080"));

/*
 * Comma-separated CORS allowlist.
 */
export const FRONTEND_ORIGINS = readString(
  "FRONTEND_ORIGIN",
  "http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter((origin) => origin.length > 0);

/*
|--------------------------------------------------------------------------
| Firebase Admin
|--------------------------------------------------------------------------
*/

export const FIREBASE_ADMIN_PROJECT_ID = readString(
  "FIREBASE_ADMIN_PROJECT_ID"
);

export const FIREBASE_ADMIN_CLIENT_EMAIL = readString(
  "FIREBASE_ADMIN_CLIENT_EMAIL"
);

export const FIREBASE_ADMIN_PRIVATE_KEY_BASE64 = readString(
  "FIREBASE_ADMIN_PRIVATE_KEY_BASE64"
);

/*
|--------------------------------------------------------------------------
| Razorpay legacy configuration
|--------------------------------------------------------------------------
|
| Kept for compatibility with existing legacy code.
| PhonePe is used by the current membership payment flow.
|
*/

export const RAZORPAY_KEY_ID = readString("RAZORPAY_KEY_ID");

export const RAZORPAY_KEY_SECRET = readString("RAZORPAY_KEY_SECRET");

export const CHECKOUT_API_ENABLED = Boolean(
  RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
);

export const RAZORPAY_WEBHOOK_SECRET = readString(
  "RAZORPAY_WEBHOOK_SECRET"
);

export const RAZORPAY_PAYMENT_BUTTON_ID = readString(
  "RAZORPAY_PAYMENT_BUTTON_ID"
);

/*
|--------------------------------------------------------------------------
| PhonePe Payment Gateway
|--------------------------------------------------------------------------
*/

export const PHONEPE_CLIENT_ID = readString("PHONEPE_CLIENT_ID");

export const PHONEPE_CLIENT_SECRET = readString("PHONEPE_CLIENT_SECRET");

export const PHONEPE_CLIENT_VERSION = Number(
  readString("PHONEPE_CLIENT_VERSION", "1")
);

export const PHONEPE_ENV = readString("PHONEPE_ENV", "SANDBOX");

/*
|--------------------------------------------------------------------------
| Application URLs and notifications
|--------------------------------------------------------------------------
*/

export const APP_PUBLIC_URL = readString(
  "APP_PUBLIC_URL",
  "https://www.studentbenefitcard.com"
).replace(/\/+$/, "");

export const NOTIFICATION_ICON_URL = readString(
  "NOTIFICATION_ICON_URL",
  `${APP_PUBLIC_URL}/sbc-notification-icon.png`
);

export const STUDENT_DASHBOARD_URL =
  `${APP_PUBLIC_URL}/student/dashboard`;

/*
|--------------------------------------------------------------------------
| STARTUP VALIDATION
|--------------------------------------------------------------------------
|
| Secret values are never printed, only variable names.
|
*/

export function assertEnvironment(): void {
  const missing: string[] = [];

  // Firebase
  if (!FIREBASE_ADMIN_PROJECT_ID) {
    missing.push("FIREBASE_ADMIN_PROJECT_ID");
  }

  if (!FIREBASE_ADMIN_CLIENT_EMAIL) {
    missing.push("FIREBASE_ADMIN_CLIENT_EMAIL");
  }

  if (!FIREBASE_ADMIN_PRIVATE_KEY_BASE64) {
    missing.push("FIREBASE_ADMIN_PRIVATE_KEY_BASE64");
  }

  // PhonePe
  if (!PHONEPE_CLIENT_ID) {
    missing.push("PHONEPE_CLIENT_ID");
  }

  if (!PHONEPE_CLIENT_SECRET) {
    missing.push("PHONEPE_CLIENT_SECRET");
  }

  if (
    !Number.isInteger(PHONEPE_CLIENT_VERSION) ||
    PHONEPE_CLIENT_VERSION <= 0
  ) {
    missing.push("PHONEPE_CLIENT_VERSION");
  }

  if (!["SANDBOX", "PRODUCTION"].includes(PHONEPE_ENV)) {
    missing.push("PHONEPE_ENV must be SANDBOX or PRODUCTION");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  if (!Number.isFinite(PORT) || PORT <= 0) {
    throw new Error("PORT must be a positive number.");
  }

  if (FRONTEND_ORIGINS.length === 0) {
    throw new Error(
      "FRONTEND_ORIGIN must list at least one allowed origin."
    );
  }
}