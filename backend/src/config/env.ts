import dotenv from "dotenv";

/*
|--------------------------------------------------------------------------
| ENVIRONMENT
|--------------------------------------------------------------------------
|
| Locally the values come from backend/.env.
| On Render they come from the dashboard environment variables, where no
| .env file exists — dotenv simply finds nothing and that is fine.
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
 * Render injects PORT. Default matches the documented local port.
 */
export const PORT = Number(readString("PORT", "8080"));

/*
 * Comma-separated CORS allowlist, e.g.
 * "http://localhost:3000,https://www.studentbenefitcard.com"
 */
export const FRONTEND_ORIGINS = readString(
  "FRONTEND_ORIGIN",
  "http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter((origin) => origin.length > 0);

/*
 * ---- Firebase Admin ----
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
 * ---- Razorpay ----
 *
 * API keys are OPTIONAL. The Payment Button flow is driven entirely by
 * the webhook, which only needs the webhook secret. Accounts that are not
 * approved for the Orders API can run the whole membership flow without
 * ever setting these.
 *
 * When they are absent, the legacy Checkout endpoints
 * (/payment/create-order and /payment/verify) report that they are
 * disabled instead of failing in a confusing way.
 */
export const RAZORPAY_KEY_ID = readString("RAZORPAY_KEY_ID");

export const RAZORPAY_KEY_SECRET = readString("RAZORPAY_KEY_SECRET");

export const CHECKOUT_API_ENABLED = Boolean(
  RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
);

/*
 * Webhook secret, set by you when creating the webhook in the Razorpay
 * dashboard. This is NOT the API key secret, and signatures computed with
 * the wrong one will never match.
 *
 * Required: without it no payment can ever be captured.
 */
export const RAZORPAY_WEBHOOK_SECRET = readString(
  "RAZORPAY_WEBHOOK_SECRET"
);

/*
 * The hosted Payment Button id (looks like "pl_XXXXXXXXXXXX").
 *
 * The backend does not need it to verify anything — it is exposed so the
 * /api/payment/config endpoint can hand it to the frontend, which keeps
 * the id in one place instead of hardcoded in the markup.
 */
export const RAZORPAY_PAYMENT_BUTTON_ID = readString(
  "RAZORPAY_PAYMENT_BUTTON_ID"
);

/*
 * ---- Push notification links ----
 *
 * These were previously hardcoded inside the notification route.
 */
export const APP_PUBLIC_URL = readString(
  "APP_PUBLIC_URL",
  "https://www.studentbenefitcard.com"
).replace(/\/+$/, "");

export const NOTIFICATION_ICON_URL = readString(
  "NOTIFICATION_ICON_URL",
  `${APP_PUBLIC_URL}/sbc-notification-icon.png`
);

export const STUDENT_DASHBOARD_URL = `${APP_PUBLIC_URL}/student/dashboard`;

/*
|--------------------------------------------------------------------------
| STARTUP VALIDATION
|--------------------------------------------------------------------------
|
| Fail loudly at boot instead of returning confusing 500s on the first
| request. Secret values are never printed, only their variable names.
|
*/

export function assertEnvironment(): void {
  const missing: string[] = [];

  if (!FIREBASE_ADMIN_PROJECT_ID) missing.push("FIREBASE_ADMIN_PROJECT_ID");
  if (!FIREBASE_ADMIN_CLIENT_EMAIL) missing.push("FIREBASE_ADMIN_CLIENT_EMAIL");
  if (!FIREBASE_ADMIN_PRIVATE_KEY_BASE64) {
    missing.push("FIREBASE_ADMIN_PRIVATE_KEY_BASE64");
  }

  /*
   * Payments cannot be captured without this, so it is required even
   * though the Razorpay API keys are not.
   */
  if (!RAZORPAY_WEBHOOK_SECRET) missing.push("RAZORPAY_WEBHOOK_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  if (!RAZORPAY_PAYMENT_BUTTON_ID) {
    console.warn(
      "RAZORPAY_PAYMENT_BUTTON_ID is not set. Students will not see a payment button."
    );
  }

  if (!CHECKOUT_API_ENABLED) {
    console.warn(
      "Razorpay API keys are not set. Payment Button + webhook flow is active; the legacy Checkout endpoints are disabled."
    );
  }

  if (!Number.isFinite(PORT) || PORT <= 0) {
    throw new Error("PORT must be a positive number.");
  }

  if (FRONTEND_ORIGINS.length === 0) {
    throw new Error("FRONTEND_ORIGIN must list at least one allowed origin.");
  }
}
