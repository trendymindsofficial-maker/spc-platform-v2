
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import {
  MEMBERSHIP_PLAN,
} from "../config/constants";
import { addOneYear, toDate } from "./dates";
import { getDb } from "./firebase-admin";

/*
|--------------------------------------------------------------------------
| MEMBERSHIP GRANTING
|--------------------------------------------------------------------------
|
| Single membership grant function for PhonePe.
|
| Each successful new payment creates one membership cycle.
| membershipCycleId = paymentId (stable and deterministic).
|
| Duplicate payment callbacks return the original cycle.
| Payment record and membership update are atomic.
|
| IMPORTANT:
| Existing legacy paid payments without membershipCycleId
| are rejected for safe manual review. Never invent a new cycle
| for a duplicate payment.
|
*/

export type PaymentSource =
  | "payment_button_webhook"
  | "checkout_verify"
  | "phonepe_status_verify";

export interface GrantMembershipInput {
  uid: string;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  source: PaymentSource;
  paymentProvider: "PhonePe";
  payerContact?: string;
  payerEmail?: string;
}

export interface GrantMembershipResult {
  alreadyProcessed: boolean;
  isRenewal: boolean;
  membershipStartDate: string | null;
  membershipExpiryDate: string | null;
  membershipCycleId: string;
}

export async function grantMembership(
  input: GrantMembershipInput
): Promise<GrantMembershipResult> {
  if (!input.uid || !input.paymentId || !input.orderId) {
    throw new Error("INVALID_MEMBERSHIP_PAYMENT_INPUT");
  }

  const db = getDb();

  const studentRef = db.collection("students").doc(input.uid);

  const paymentRef = db
    .collection("membershipPayments")
    .doc(input.paymentId);

  return db.runTransaction<GrantMembershipResult>(
    async (transaction) => {
      const existingPaymentSnap = await transaction.get(paymentRef);

      /*
       * Existing payment:
       * Return the original grant only when it is already paid
       * and belongs to the same student.
       */
      if (existingPaymentSnap.exists) {
        const existing = existingPaymentSnap.data() || {};

        if (
          existing.status !== "paid" ||
          String(existing.uid || "") !== input.uid
        ) {
          throw new Error("PAYMENT_RECORD_CONFLICT");
        }

        const storedStart = toDate(existing.membershipStartDate);
        const storedExpiry = toDate(existing.membershipExpiryDate);

        const membershipCycleId = String(
          existing.membershipCycleId || ""
        );

        if (!membershipCycleId) {
          throw new Error("MEMBERSHIP_CYCLE_ID_MISSING");
        }

        return {
          alreadyProcessed: true,
          isRenewal: existing.type === "renewal",
          membershipStartDate: storedStart?.toISOString() || null,
          membershipExpiryDate: storedExpiry?.toISOString() || null,
          membershipCycleId,
        };
      }

      const studentSnap = await transaction.get(studentRef);

      if (!studentSnap.exists) {
        throw new Error(`STUDENT_NOT_FOUND:${input.uid}`);
      }

      const student = studentSnap.data() || {};

      /*
       * Option C:
       * Every successful NEW payment starts a fresh one-year
       * membership from the payment grant date.
       */
      const paymentDate = new Date();

      const membershipStartDate = paymentDate;
      const membershipExpiryDate = addOneYear(paymentDate);

      /*
       * Stable cycle identifier for this payment.
       * A retry uses the already-created payment record above.
       */
      const membershipCycleId = input.paymentId;

      /*
       * Preserve existing registration/renewal classification.
       */
      const currentExpiry = toDate(student.membershipExpiryDate);
      const isRenewal = !!currentExpiry;


      transaction.set(
        studentRef,
        {
          status: "active",
          paymentStatus: "paid",
          membershipStatus: "active",

          membershipStartDate: Timestamp.fromDate(membershipStartDate),
          membershipExpiryDate: Timestamp.fromDate(membershipExpiryDate),
          membershipPlan: MEMBERSHIP_PLAN,
          membershipCycleId,

          paymentAmount: input.amount,
          paymentCurrency: input.currency,

          phonepeTransactionId: input.paymentId,
          phonepeMerchantOrderId: input.orderId,
          paymentProvider: "PhonePe",

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

        membershipCycleId,

        phonepeTransactionId: input.paymentId,
        phonepeMerchantOrderId: input.orderId,
        paymentProvider: "PhonePe",

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
        membershipCycleId,
      };
    }
  );
}
