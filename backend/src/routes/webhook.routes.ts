import crypto from "crypto";
import { Request, Router } from "express";

import { MEMBERSHIP_AMOUNT_PAISE } from "../config/constants";
import { RAZORPAY_WEBHOOK_SECRET } from "../config/env";
import { getDb } from "../lib/firebase-admin";
import { asyncHandler } from "../lib/http";
import { grantMembership, recordUnmatchedPayment } from "../lib/membership";
import { isValidIndianMobile, normalizeMobile } from "../lib/mobile";

export const webhookRouter = Router();

/*
|--------------------------------------------------------------------------
| RAZORPAY WEBHOOK
|--------------------------------------------------------------------------
|
| POST /api/payment/webhook
|
| This is the ONLY way a Razorpay Payment Button payment reaches us. The
| hosted button gives the browser no success callback and no payment
| signature, so there is nothing trustworthy for the client to report.
|
| Two different Razorpay signatures exist and are easy to confuse:
|
|   webhook signature  -> X-Razorpay-Signature header,
|                         HMAC-SHA256(raw body, WEBHOOK secret)
|   payment signature  -> razorpay_signature from Checkout,
|                         HMAC-SHA256("orderId|paymentId", API KEY secret)
|
| This endpoint uses the first one. It must hash the EXACT bytes Razorpay
| sent, which is why req.rawBody is captured in app.ts rather than
| re-serialising the parsed JSON (key order and spacing would differ and
| every signature would fail).
|
| Response contract: Razorpay retries until it receives a 2xx. So we
| return 200 for anything we have definitively dealt with — including
| payments we could not match to a student, which are stored for
| reconciliation instead of being retried forever.
|
*/

/** Razorpay payment entity fields this route relies on. */
interface RazorpayPaymentEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  email?: string;
  contact?: string;
  notes?: Record<string, unknown> | null;
}

interface RazorpayWebhookBody {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    order?: { entity?: { id?: string } };
  };
}

/**
 * Timing-safe comparison of the webhook signature.
 */
function signatureMatches(rawBody: Buffer, received: string): boolean {
  const expected = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

/**
 * Finds the student this payment belongs to.
 *
 * Order of preference:
 *   1. notes.uid / notes.student_uid — exact, if the button is ever
 *      configured to pass it through.
 *   2. the payer's phone number against students.mobile. Razorpay
 *      checkout always collects a contact number, so this is the
 *      dependable path for a static payment button.
 *   3. the payer's email against students.email.
 */
async function resolveStudentUid(
  payment: RazorpayPaymentEntity
): Promise<{ uid: string | null; matchedBy: string }> {
  const db = getDb();

  const notes = payment.notes || {};

  const noteUid =
    typeof notes.uid === "string"
      ? notes.uid.trim()
      : typeof notes.student_uid === "string"
        ? notes.student_uid.trim()
        : "";

  if (noteUid) {
    const snap = await db.collection("students").doc(noteUid).get();

    if (snap.exists) {
      return { uid: noteUid, matchedBy: "notes.uid" };
    }
  }

  /*
   * Razorpay sends contact as "+919876543210" (and occasionally without
   * the country code). normalizeMobile reduces both to 10 digits, which
   * is how SBC stores them.
   */
  const mobile = normalizeMobile(payment.contact || "");

  if (isValidIndianMobile(mobile)) {
    const byMobile = await db
      .collection("students")
      .where("mobile", "==", mobile)
      .limit(2)
      .get();

    if (byMobile.size === 1) {
      return { uid: byMobile.docs[0].id, matchedBy: "mobile" };
    }

    /*
     * Two students on one number should not happen, but guessing between
     * them would be worse than asking an admin.
     */
    if (byMobile.size > 1) {
      console.error(
        "Webhook: multiple students share mobile, refusing to guess:",
        mobile
      );

      return { uid: null, matchedBy: "ambiguous_mobile" };
    }
  }

  const email = String(payment.email || "").trim().toLowerCase();

  if (email) {
    const byEmail = await db
      .collection("students")
      .where("email", "==", email)
      .limit(2)
      .get();

    if (byEmail.size === 1) {
      return { uid: byEmail.docs[0].id, matchedBy: "email" };
    }
  }

  return { uid: null, matchedBy: "none" };
}

webhookRouter.post(
  "/webhook",
  asyncHandler(async (req: Request, res) => {
    /*
     * 1. Signature.
     */
    if (!RAZORPAY_WEBHOOK_SECRET) {
      console.error(
        "Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not set."
      );

      res.status(500).json({
        success: false,
        error: "Webhook is not configured on the server.",
      });

      return;
    }

    const rawBody = req.rawBody;

    if (!rawBody || rawBody.length === 0) {
      res.status(400).json({ success: false, error: "Empty webhook body." });
      return;
    }

    const received = req.header("x-razorpay-signature") || "";

    if (!received || !signatureMatches(rawBody, received)) {
      console.error("Razorpay webhook signature verification failed.");

      /*
       * 400, not 200: an unsigned or tampered request is never accepted.
       */
      res
        .status(400)
        .json({ success: false, error: "Invalid webhook signature." });

      return;
    }

    const body = (req.body || {}) as RazorpayWebhookBody;

    const event = String(body.event || "");
    const eventId = req.header("x-razorpay-event-id") || "";

    const payment = body.payload?.payment?.entity;

    console.log("Razorpay webhook verified:", {
      event,
      eventId,
      paymentId: payment?.id,
    });

    /*
     * 2. Only captured money grants membership.
     *
     * payment.authorized means funds are held but not captured, so it is
     * acknowledged and ignored; payment.captured follows it.
     */
    if (event !== "payment.captured" && event !== "order.paid") {
      res.json({ success: true, ignored: true, event });
      return;
    }

    if (!payment?.id) {
      console.error("Razorpay webhook missing payment entity:", event);

      res.json({ success: true, ignored: true, reason: "no_payment_entity" });
      return;
    }

    const paymentId = String(payment.id);
    const orderId = String(payment.order_id || "");
    const amountPaise = Number(payment.amount || 0);
    const currency = String(payment.currency || "").toUpperCase();
    const payerContact = String(payment.contact || "");
    const payerEmail = String(payment.email || "");

    if (String(payment.status || "").toLowerCase() !== "captured") {
      res.json({ success: true, ignored: true, reason: "not_captured" });
      return;
    }

    /*
     * 3. Amount must be the SBC membership price.
     *
     * Recorded rather than granted when it does not match, so a
     * misconfigured button or a partial payment is visible instead of
     * silently handing out a year of membership.
     */
    if (amountPaise !== MEMBERSHIP_AMOUNT_PAISE || currency !== "INR") {
      console.error("Razorpay webhook amount mismatch:", {
        paymentId,
        amountPaise,
        expected: MEMBERSHIP_AMOUNT_PAISE,
        currency,
      });

      await recordUnmatchedPayment({
        paymentId,
        orderId,
        amount: amountPaise / 100,
        currency,
        payerContact,
        payerEmail,
        eventId,
        reason: "amount_mismatch",
      });

      res.json({ success: true, recorded: true, reason: "amount_mismatch" });
      return;
    }

    /*
     * 4. Who paid?
     */
    const { uid, matchedBy } = await resolveStudentUid(payment);

    if (!uid) {
      console.error("Razorpay webhook could not match a student:", {
        paymentId,
        payerContact,
        payerEmail,
        matchedBy,
      });

      await recordUnmatchedPayment({
        paymentId,
        orderId,
        amount: amountPaise / 100,
        currency,
        payerContact,
        payerEmail,
        eventId,
        reason: `unmatched_${matchedBy}`,
      });

      /*
       * 200 on purpose. The payment is safely stored; retrying would not
       * change the outcome. The student can claim it in the app and an
       * admin can see it in the payments collection.
       */
      res.json({ success: true, recorded: true, matched: false });
      return;
    }

    /*
     * 5. Grant.
     */
    try {
      const result = await grantMembership({
        uid,
        paymentId,
        orderId,
        amount: amountPaise / 100,
        currency,
        source: "payment_button_webhook",
        payerContact,
        payerEmail,
        eventId,
      });

      console.log("Membership granted from webhook:", {
        uid,
        paymentId,
        matchedBy,
        alreadyProcessed: result.alreadyProcessed,
        isRenewal: result.isRenewal,
        expiry: result.membershipExpiryDate,
      });

      res.json({
        success: true,
        matched: true,
        matchedBy,
        alreadyProcessed: result.alreadyProcessed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      /*
       * The student document vanished between matching and granting.
       * Store the payment instead of losing it.
       */
      if (message.startsWith("STUDENT_NOT_FOUND:")) {
        await recordUnmatchedPayment({
          paymentId,
          orderId,
          amount: amountPaise / 100,
          currency,
          payerContact,
          payerEmail,
          eventId,
          reason: "student_document_missing",
        });

        res.json({ success: true, recorded: true, matched: false });
        return;
      }

      /*
       * A genuine failure (Firestore unavailable, contention). Return 500
       * so Razorpay retries and the payment is not lost.
       */
      console.error("Webhook membership grant failed, asking for retry:", error);

      res
        .status(500)
        .json({ success: false, error: "Could not record the payment." });
    }
  })
);
