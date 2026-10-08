import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";

import {
  REFERRAL_REWARD_STEP,
  referralTotalEarned,
} from "../config/constants";
import { getDb } from "../lib/firebase-admin";
import {
  asyncHandler,
  badRequest,
  forbidden,
  notFound,
  readString,
} from "../lib/http";
import { currentUser, requireUser } from "../middleware/auth";

export const referralRouter = Router();

/*
|--------------------------------------------------------------------------
| REFERRAL CREDITING
|--------------------------------------------------------------------------
|
| A referral only counts once the referred student has actually paid:
|
|     status === "active" AND paymentStatus === "paid"
|
| /process credits a single student (called right after their payment).
| /reconcile sweeps every student who used the caller's code, recovering
| referrals that were never credited at payment time.
|
| Both write referrals/<referredUid> as the idempotency key, so a referral
| can never be counted twice no matter how often either endpoint runs.
|
*/

function isPaidActiveStudent(data: Record<string, unknown>): boolean {
  return (
    String(data.status || "").toLowerCase() === "active" &&
    String(data.paymentStatus || "").toLowerCase() === "paid"
  );
}

/*
|--------------------------------------------------------------------------
| POST /api/referral/process
|--------------------------------------------------------------------------
*/

referralRouter.post(
  "/process",
  requireUser,
  asyncHandler(async (req, res) => {
    const decoded = currentUser(req);

    const referredUid = readString(req.body?.referredUid) || decoded.uid;

    /*
     * A student may only trigger crediting for their own payment.
     */
    if (referredUid !== decoded.uid) {
      throw forbidden("Invalid student.");
    }

    const db = getDb();

    const studentRef = db.collection("students").doc(referredUid);
    const studentSnap = await studentRef.get();

    if (!studentSnap.exists) {
      throw notFound("Student profile not found.");
    }

    const student = studentSnap.data() || {};

    if (!isPaidActiveStudent(student)) {
      throw badRequest(
        "Student payment is not eligible for referral credit."
      );
    }

    if (!student.razorpayPaymentId || !student.razorpayOrderId) {
      throw badRequest("Verified payment details are missing.");
    }

    const referralCode = String(student.referredBy || "").trim();

    /*
     * No code used at registration is a normal outcome, not an error.
     */
    if (!referralCode) {
      res.json({ success: true, counted: false, reason: "no_referral" });
      return;
    }

    const referrerQuery = await db
      .collection("students")
      .where("referralCode", "==", referralCode)
      .limit(2)
      .get();

    if (referrerQuery.empty) {
      throw badRequest("Referrer not found.");
    }

    const referrerDoc = referrerQuery.docs[0];

    if (referrerDoc.id === referredUid) {
      throw badRequest("Self referral is not allowed.");
    }

    const referralRef = db.collection("referrals").doc(referredUid);

    let counted = false;
    let successfulReferrals = 0;

    await db.runTransaction(async (tx) => {
      const [referralSnap, referrerSnap] = await Promise.all([
        tx.get(referralRef),
        tx.get(referrerDoc.ref),
      ]);

      const referrer = referrerSnap.data() || {};

      /*
       * Reset per attempt: a transaction callback can be retried.
       */
      successfulReferrals = Number(referrer.successfulReferrals || 0);
      counted = false;

      if (
        referralSnap.exists &&
        String(referralSnap.data()?.status || "") === "success"
      ) {
        return;
      }

      const next = successfulReferrals + 1;

      successfulReferrals = next;
      counted = true;

      tx.set(
        referralRef,
        {
          referredUid,
          referrerUid: referrerDoc.id,
          referralCode,
          status: "success",
          paymentStatus: "paid",
          razorpayPaymentId: String(student.razorpayPaymentId),
          razorpayOrderId: String(student.razorpayOrderId),
          successfulAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      tx.set(
        studentRef,
        {
          referralStatus: "success",
          referralPaymentStatus: "success",
          referralProcessedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      tx.set(
        referrerDoc.ref,
        {
          successfulReferrals: next,
          pendingReferrals: Math.max(
            Number(referrer.pendingReferrals || 0) - 1,
            0
          ),
          referralRewardUnlocked:
            Math.floor(next / REFERRAL_REWARD_STEP) > 0,
          referralTotalEarned: referralTotalEarned(next),
          referralUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    res.json({
      success: true,
      counted,
      successfulReferrals,
      totalEarned: referralTotalEarned(successfulReferrals),
    });
  })
);

/*
|--------------------------------------------------------------------------
| POST /api/referral/reconcile
|--------------------------------------------------------------------------
|
| Called by the student dashboard before showing the referral wallet.
|
*/

referralRouter.post(
  "/reconcile",
  requireUser,
  asyncHandler(async (req, res) => {
    const uid = currentUser(req).uid;
    const db = getDb();

    const referrerRef = db.collection("students").doc(uid);
    const referrerSnap = await referrerRef.get();

    if (!referrerSnap.exists) {
      throw notFound("Student not found.");
    }

    const referrer = referrerSnap.data() || {};
    const code = String(referrer.referralCode || "").trim();

    if (!code) {
      res.json({ success: true, counted: 0 });
      return;
    }

    const studentsSnap = await db
      .collection("students")
      .where("referredBy", "==", code)
      .get();

    let counted = 0;

    for (const referred of studentsSnap.docs) {
      if (referred.id === uid) continue;

      const data = referred.data() || {};

      if (!isPaidActiveStudent(data)) continue;

      const referralRef = db.collection("referrals").doc(referred.id);

      /*
       * The transaction reports whether it credited anything. Counting
       * outside the callback keeps the total accurate even if Firestore
       * retries the transaction.
       */
      const didCount = await db.runTransaction(async (tx) => {
        const referralSnap = await tx.get(referralRef);

        if (
          referralSnap.exists &&
          String(referralSnap.data()?.status || "") === "success"
        ) {
          return false;
        }

        const freshReferrer = await tx.get(referrerRef);
        const fresh = freshReferrer.data() || {};

        const next = Number(fresh.successfulReferrals || 0) + 1;

        tx.set(
          referralRef,
          {
            referredUid: referred.id,
            referrerUid: uid,
            referralCode: code,
            status: "success",
            paymentStatus: "paid",
            razorpayPaymentId: String(data.razorpayPaymentId || ""),
            razorpayOrderId: String(data.razorpayOrderId || ""),
            successfulAt: FieldValue.serverTimestamp(),
            reconciled: true,
          },
          { merge: true }
        );

        tx.set(
          referred.ref,
          {
            referralStatus: "success",
            referralPaymentStatus: "success",
            referralProcessedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        tx.set(
          referrerRef,
          {
            successfulReferrals: next,
            referralTotalEarned: referralTotalEarned(next),
            referralRewardUnlocked:
              Math.floor(next / REFERRAL_REWARD_STEP) > 0,
            referralUpdatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return true;
      });

      if (didCount) counted += 1;
    }

    const finalSnap = await referrerRef.get();
    const finalData = finalSnap.data() || {};

    const successful = Number(finalData.successfulReferrals || 0);

    res.json({
      success: true,
      counted,
      successfulReferrals: successful,
      totalEarned: referralTotalEarned(successful),
    });
  })
);
