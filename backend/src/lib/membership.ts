import { FieldValue, Timestamp } from "firebase-admin/firestore";

import {
  MEMBERSHIP_AMOUNT,
  MEMBERSHIP_PLAN,
} from "../config/constants";
import { addOneYear, toDate } from "./dates";
import { getDb } from "./firebase-admin";

/*
|--------------------------------------------------------------------------
| MEMBERSHIP GRANTING
|--------------------------------------------------------------------------
|
| One place where a successful payment turns into membership. Both the
| Razorpay webhook (payment button flow) and the legacy checkout verify
| endpoint call this, so membership dates and idempotency can never drift
| between the two.
|
| Idempotency key: membershipPayments/<razorpayPaymentId>
|
| Razorpay retries webhooks until it gets a 2xx, so the same payment will
| very likely arrive more than once. The payment document is created
| inside the same transaction that extends the membership, so a repeat
| delivery is detected and ignored rather than granting a second year.
|
*/

export type PaymentSource = "payment_button_webhook" | "checkout_verify";

export interface GrantMembershipInput {
  uid: string;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  source: PaymentSource;
  /** Razorpay contact/email as received, for the audit trail. */
  payerContact?: string;
  payerEmail?: string;
  /** Razorpay event id, when the grant came from a webhook. */
  eventId?: string;
}

export interface GrantMembershipResult {
  alreadyProcessed: boolean;
  isRenewal: boolean;
  membershipStartDate: string | null;
  membershipExpiryDate: string | null;
}

export async function grantMembership(
  input: GrantMembershipInput
): Promise<GrantMembershipResult> {
  const db = getDb();

  const studentRef = db.collection("students").doc(input.uid);
  const paymentRef = db
    .collection("membershipPayments")
    .doc(input.paymentId);

  return db.runTransaction<GrantMembershipResult>(async (transaction) => {
    const existingPayment = await transaction.get(paymentRef);

    /*
     * Already handled. Return the stored dates so a retried webhook or a
     * double-submitted verification gets a consistent answer.
     */
    if (existingPayment.exists) {
      const existing = existingPayment.data() || {};

      const storedStart = toDate(existing.membershipStartDate);
      const storedExpiry = toDate(existing.membershipExpiryDate);

      return {
        alreadyProcessed: true,
        isRenewal: existing.type === "renewal",
        membershipStartDate: storedStart?.toISOString() || null,
        membershipExpiryDate: storedExpiry?.toISOString() || null,
      };
    }

    const studentSnap = await transaction.get(studentRef);

    if (!studentSnap.exists) {
      throw new Error(`STUDENT_NOT_FOUND:${input.uid}`);
    }

    const student = studentSnap.data() || {};
    const paymentDate = new Date();

    /*
     * A student registering for the first time already has a document at
     * this point (created as pending_payment before the payment button is
     * shown), so "renewal" is decided by whether they currently hold an
     * unexpired membership — not by whether the document exists.
     */
    const currentExpiry = toDate(student.membershipExpiryDate);
    const currentStart = toDate(student.membershipStartDate);

    const stillActive =
      !!currentExpiry && currentExpiry.getTime() > paymentDate.getTime();

    /*
     * Paying early must never cost the student days: an active membership
     * is extended from its existing expiry.
     */
    const membershipStartDate = stillActive
      ? currentStart || paymentDate
      : paymentDate;

    const membershipExpiryDate =
      stillActive && currentExpiry
        ? addOneYear(currentExpiry)
        : addOneYear(paymentDate);

    const isRenewal = stillActive || !!currentExpiry;

    transaction.set(
      studentRef,
      {
        /*
         * Activation happens here and only here. Referral crediting and
         * offer redemption both gate on status/paymentStatus, so they stay
         * closed until money has actually arrived.
         */
        status: "active",
        paymentStatus: "paid",
        membershipStatus: "active",

        membershipStartDate: Timestamp.fromDate(membershipStartDate),
        membershipExpiryDate: Timestamp.fromDate(membershipExpiryDate),
        membershipPlan: MEMBERSHIP_PLAN,

        paymentAmount: input.amount,
        paymentCurrency: input.currency,

        razorpayPaymentId: input.paymentId,
        razorpayOrderId: input.orderId,

        lastMembershipPaymentId: input.paymentId,
        lastMembershipOrderId: input.orderId,
        lastMembershipPaymentAt: FieldValue.serverTimestamp(),

        paidAt: FieldValue.serverTimestamp(),
        membershipUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(paymentRef, {
      uid: input.uid,
      type: isRenewal ? "renewal" : "registration",
      source: input.source,

      amount: input.amount,
      currency: input.currency,

      razorpayPaymentId: input.paymentId,
      razorpayOrderId: input.orderId,

      ...(input.eventId ? { razorpayEventId: input.eventId } : {}),
      ...(input.payerContact ? { payerContact: input.payerContact } : {}),
      ...(input.payerEmail ? { payerEmail: input.payerEmail } : {}),

      membershipStartDate: Timestamp.fromDate(membershipStartDate),
      membershipExpiryDate: Timestamp.fromDate(membershipExpiryDate),

      status: "paid",
      paidAt: FieldValue.serverTimestamp(),
      verifiedAt: FieldValue.serverTimestamp(),
    });

    return {
      alreadyProcessed: false,
      isRenewal,
      membershipStartDate: membershipStartDate.toISOString(),
      membershipExpiryDate: membershipExpiryDate.toISOString(),
    };
  });
}

/**
 * Records a captured payment that could not be tied to a student.
 *
 * The money has already left the customer's account, so it must never be
 * dropped silently. Admins can see these, and a student can claim one
 * from the app with their payment id.
 */
export async function recordUnmatchedPayment(input: {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  payerContact?: string;
  payerEmail?: string;
  payerName?: string;
  eventId?: string;
  reason: string;
}): Promise<void> {
  const db = getDb();

  await db
    .collection("membershipPayments")
    .doc(input.paymentId)
    .set(
      {
        status: "unmatched",
        source: "payment_button_webhook",

        amount: input.amount,
        currency: input.currency,
        expectedAmount: MEMBERSHIP_AMOUNT,

        razorpayPaymentId: input.paymentId,
        razorpayOrderId: input.orderId,

        payerContact: input.payerContact || "",
        payerEmail: input.payerEmail || "",
        payerName: input.payerName || "",

        ...(input.eventId ? { razorpayEventId: input.eventId } : {}),

        unmatchedReason: input.reason,
        receivedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}
