import crypto from "crypto";
import { Router } from "express";

import {
  MEMBERSHIP_AMOUNT,
  MEMBERSHIP_AMOUNT_PAISE,
  MEMBERSHIP_PLAN,
} from "../config/constants";
import {
  CHECKOUT_API_ENABLED,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_PAYMENT_BUTTON_ID,
} from "../config/env";
import { toDate } from "../lib/dates";
import { getDb } from "../lib/firebase-admin";
import {
  ApiError,
  asyncHandler,
  badRequest,
  notFound,
  readString,
} from "../lib/http";
import { grantMembership } from "../lib/membership";
import { getRazorpay, getRazorpayKeyId } from "../lib/razorpay";
import { currentUser, requireUser } from "../middleware/auth";
import { webhookRouter } from "./webhook.routes";

export const paymentRouter = Router();

/*
 * POST /api/payment/webhook — mounted first and deliberately before any
 * auth middleware. Razorpay is the caller and authenticates with a
 * signature, not a Firebase token.
 */
paymentRouter.use("/", webhookRouter);

/*
|--------------------------------------------------------------------------
| GET /api/payment/config
|--------------------------------------------------------------------------
|
| Public. Tells the frontend which payment button to render and what the
| membership costs, so neither value is hardcoded in the UI.
|
*/

paymentRouter.get("/config", (_req, res) => {
  res.json({
    success: true,
    paymentButtonId: RAZORPAY_PAYMENT_BUTTON_ID,
    amount: MEMBERSHIP_AMOUNT,
    currency: "INR",
    plan: MEMBERSHIP_PLAN,
    checkoutApiEnabled: CHECKOUT_API_ENABLED,
  });
});

/*
|--------------------------------------------------------------------------
| GET /api/payment/membership-status
|--------------------------------------------------------------------------
|
| The payment button hands control to Razorpay's hosted page, so the
| browser never learns the outcome directly. The frontend watches the
| student document in Firestore and can fall back to polling this.
|
*/

paymentRouter.get(
  "/membership-status",
  requireUser,
  asyncHandler(async (req, res) => {
    const uid = currentUser(req).uid;

    const snap = await getDb().collection("students").doc(uid).get();

    if (!snap.exists) {
      throw notFound("Student account was not found.");
    }

    const student = snap.data() || {};

    const expiry = toDate(student.membershipExpiryDate);
    const start = toDate(student.membershipStartDate);

    const active = !!expiry && expiry.getTime() > Date.now();

    res.json({
      success: true,
      paid: String(student.paymentStatus || "").toLowerCase() === "paid",
      status: String(student.status || ""),
      membershipStatus: String(student.membershipStatus || ""),
      membershipActive: active,
      membershipStartDate: start?.toISOString() || null,
      membershipExpiryDate: expiry?.toISOString() || null,
      cardNumber: String(student.cardNumber || ""),
    });
  })
);

/*
|--------------------------------------------------------------------------
| POST /api/payment/claim
|--------------------------------------------------------------------------
|
| Safety net for the one weakness of a static payment button: the webhook
| matches a payment to a student by the phone number entered on Razorpay's
| checkout. If a student pays with a different number, the payment lands
| as "unmatched".
|
| This lets them claim it with the Razorpay payment id from their receipt.
| The claim is only honoured for a payment that
|
|   - we actually received and verified by webhook signature,
|   - is captured for the correct amount,
|   - is still unmatched (never already credited to anyone).
|
| So this cannot invent a payment or steal one that is already assigned.
|
*/

paymentRouter.post(
  "/claim",
  requireUser,
  asyncHandler(async (req, res) => {
    const uid = currentUser(req).uid;

    const paymentId = readString(req.body?.paymentId);

    if (!paymentId || !/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
      throw badRequest(
        "Enter the Razorpay Payment ID from your receipt (it starts with pay_)."
      );
    }

    const db = getDb();

    const paymentRef = db.collection("membershipPayments").doc(paymentId);
    const paymentSnap = await paymentRef.get();

    /*
     * Only payments this server received over a signature-verified
     * webhook exist here, so an invented id cannot be claimed.
     */
    if (!paymentSnap.exists) {
      throw notFound(
        "We have not received this payment yet. Please wait a minute and try again, or contact SBC support."
      );
    }

    const payment = paymentSnap.data() || {};
    const paymentState = String(payment.status || "").toLowerCase();

    if (paymentState === "paid") {
      /*
       * Already credited. If it was this student, treat as success so a
       * double tap is harmless.
       */
      if (String(payment.uid || "") === uid) {
        res.json({ success: true, alreadyCredited: true });
        return;
      }

      throw new ApiError(
        409,
        "This payment is already linked to another SBC account. Please contact support."
      );
    }

    if (paymentState !== "unmatched") {
      throw badRequest("This payment cannot be claimed.");
    }

    if (
      Number(payment.amount) !== MEMBERSHIP_AMOUNT ||
      String(payment.currency || "").toUpperCase() !== "INR"
    ) {
      throw badRequest(
        `Only a ₹${MEMBERSHIP_AMOUNT} SBC membership payment can be claimed.`
      );
    }

    const result = await grantMembership({
      uid,
      paymentId,
      orderId: String(payment.razorpayOrderId || ""),
      amount: Number(payment.amount),
      currency: String(payment.currency || "INR").toUpperCase(),
      source: "payment_button_webhook",
      payerContact: String(payment.payerContact || ""),
      payerEmail: String(payment.payerEmail || ""),
    });

    await paymentRef.set(
      {
        claimedByUid: uid,
        claimedAt: new Date(),
        unmatchedReason: "",
      },
      { merge: true }
    );

    console.log("Unmatched payment claimed:", { uid, paymentId });

    res.json({
      success: true,
      membershipStartDate: result.membershipStartDate,
      membershipExpiryDate: result.membershipExpiryDate,
    });
  })
);

/*
|--------------------------------------------------------------------------
| LEGACY CHECKOUT (Orders API)
|--------------------------------------------------------------------------
|
| Kept for accounts that are approved for the Orders API. Both endpoints
| below refuse to run when the API keys are absent, which is the case
| while only the no-code Payment Button is available.
|
*/

function assertCheckoutEnabled(): void {
  if (!CHECKOUT_API_ENABLED) {
    throw new ApiError(
      503,
      "Card checkout is unavailable. Please use the SBC payment button to pay."
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST /api/payment/create-order
|--------------------------------------------------------------------------
|
| Creates the Razorpay order for a new membership or a renewal.
|
| The amount is fixed server-side at MEMBERSHIP_AMOUNT. body.amount is
| ignored entirely, so a tampered browser cannot buy a membership for ₹1.
|
*/

paymentRouter.post(
  "/create-order",
  requireUser,
  asyncHandler(async (req, res) => {
    assertCheckoutEnabled();

    const uid = currentUser(req).uid;

    /*
     * Purpose only affects bookkeeping and the renewal pre-check.
     */
    const requestedPurpose =
      typeof req.body?.purpose === "string"
        ? req.body.purpose.trim().toLowerCase()
        : "";

    const isRenewal = requestedPurpose === "sbc membership renewal";

    const purpose = isRenewal
      ? "SBC membership renewal"
      : "SBC student membership";

    /*
     * A renewal only makes sense for an existing student. Registration
     * has no student document yet at this point.
     */
    if (isRenewal) {
      const studentSnap = await getDb().collection("students").doc(uid).get();

      if (!studentSnap.exists) {
        throw notFound(
          "Student membership account was not found. Please complete registration first."
        );
      }
    }

    const order = await getRazorpay().orders.create({
      amount: MEMBERSHIP_AMOUNT_PAISE,
      currency: "INR",
      receipt: `sbc_${uid.slice(0, 8)}_${Date.now()}`,
      notes: {
        purpose,
        uid,
        membershipPlan: MEMBERSHIP_PLAN,
        amount: String(MEMBERSHIP_AMOUNT),
      },
    });

    res.json({
      success: true,
      order,
      keyId: getRazorpayKeyId(),
    });
  })
);

/*
|--------------------------------------------------------------------------
| POST /api/payment/verify
|--------------------------------------------------------------------------
|
| Four independent checks before any membership is granted:
|
|   1. HMAC signature over "<orderId>|<paymentId>" using the key secret.
|   2. The order really is a ₹199 INR order (fetched from Razorpay).
|   3. A payment with this id really belongs to that order and is captured
|      for the same amount and currency.
|   4. The membershipPayments/<paymentId> document acts as an idempotency
|      key, so a retried verification never extends membership twice.
|
*/

paymentRouter.post(
  "/verify",
  requireUser,
  asyncHandler(async (req, res) => {
    assertCheckoutEnabled();

    const uid = currentUser(req).uid;

    const orderId = String(req.body?.razorpay_order_id || "").trim();
    const paymentId = String(req.body?.razorpay_payment_id || "").trim();
    const signature = String(req.body?.razorpay_signature || "").trim();

    if (!orderId || !paymentId || !signature) {
      throw badRequest("Missing Razorpay payment verification fields.");
    }

    if (!RAZORPAY_KEY_SECRET) {
      console.error("Razorpay environment variables are missing.");

      throw new ApiError(500, "Payment verification is not configured.");
    }

    /*
     * 1. Signature.
     */
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    const signatureValid =
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

    if (!signatureValid) {
      throw badRequest("Invalid payment signature.");
    }

    const razorpay = getRazorpay();

    /*
     * 2. The order itself.
     */
    const razorpayOrder = await razorpay.orders.fetch(orderId);

    const orderAmount = Number(razorpayOrder.amount);
    const orderCurrency = String(razorpayOrder.currency || "").toUpperCase();

    if (orderAmount !== MEMBERSHIP_AMOUNT_PAISE || orderCurrency !== "INR") {
      console.error("Invalid SBC membership order:", {
        orderId,
        orderAmount,
        orderCurrency,
      });

      throw badRequest("Invalid SBC membership payment amount.");
    }

    /*
     * 3. The payment belongs to that order and was captured.
     */
    const payments = await razorpay.orders.fetchPayments(orderId);

    const matchingPayment = Array.isArray(payments?.items)
      ? payments.items.find(
          (payment: { id?: string }) => payment?.id === paymentId
        )
      : undefined;

    if (!matchingPayment) {
      throw badRequest(
        "Payment could not be confirmed for this Razorpay order."
      );
    }

    if (String(matchingPayment.status || "").toLowerCase() !== "captured") {
      throw badRequest("Payment has not been captured successfully.");
    }

    if (
      Number(matchingPayment.amount) !== MEMBERSHIP_AMOUNT_PAISE ||
      String(matchingPayment.currency || "").toUpperCase() !== "INR"
    ) {
      throw badRequest("Invalid captured payment amount.");
    }

    /*
     * 4. Idempotent membership write, shared with the webhook path.
     */
    const result = await grantMembership({
      uid,
      paymentId,
      orderId,
      amount: MEMBERSHIP_AMOUNT,
      currency: "INR",
      source: "checkout_verify",
    });

    res.json({
      success: true,
      verified: true,
      paymentId,
      orderId,
      membershipStartDate: result.membershipStartDate,
      membershipExpiryDate: result.membershipExpiryDate,
      membershipUpdated: result.isRenewal && !result.alreadyProcessed,
      alreadyProcessed: result.alreadyProcessed,
    });
  })
);
