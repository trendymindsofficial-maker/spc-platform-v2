import Razorpay from "razorpay";

import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from "../config/env";
import { ApiError } from "./http";

/*
|--------------------------------------------------------------------------
| RAZORPAY CLIENT
|--------------------------------------------------------------------------
|
| Created lazily so a missing secret surfaces as a clean 500 from the
| payment endpoints rather than crashing at module import time.
|
*/

let client: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (client) return client;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.error("Razorpay environment variables are missing.");

    throw new ApiError(500, "Razorpay payment is not configured on the server.");
  }

  client = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });

  return client;
}

/**
 * The publishable key id the browser checkout needs.
 */
export function getRazorpayKeyId(): string {
  if (!RAZORPAY_KEY_ID) {
    throw new ApiError(500, "Razorpay payment is not configured on the server.");
  }

  return RAZORPAY_KEY_ID;
}
