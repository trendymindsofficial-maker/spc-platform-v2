import {
  Env,
  StandardCheckoutClient,
} from "@phonepe-pg/pg-sdk-node";

import {
  PHONEPE_CLIENT_ID,
  PHONEPE_CLIENT_SECRET,
  PHONEPE_CLIENT_VERSION,
  PHONEPE_ENV,
} from "../config/env";

let client: StandardCheckoutClient | null = null;

export function getPhonePeClient(): StandardCheckoutClient {
  if (client) return client;

  if (
    !PHONEPE_CLIENT_ID ||
    !PHONEPE_CLIENT_SECRET ||
    !Number.isInteger(PHONEPE_CLIENT_VERSION) ||
    PHONEPE_CLIENT_VERSION <= 0
  ) {
    throw new Error("PhonePe credentials are not configured correctly.");
  }

  const env =
    PHONEPE_ENV === "PRODUCTION" ? Env.PRODUCTION : Env.SANDBOX;

  client = StandardCheckoutClient.getInstance(
    PHONEPE_CLIENT_ID,
    PHONEPE_CLIENT_SECRET,
    PHONEPE_CLIENT_VERSION,
    env
  );

  return client;
}