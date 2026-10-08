import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";

import { MIN_PAYOUT_AMOUNT, referralTotalEarned } from "../config/constants";
import { getDb } from "../lib/firebase-admin";
import { asyncHandler, badRequest, notFound, readString } from "../lib/http";
import { currentUser, requireUser } from "../middleware/auth";

export const payoutRouter = Router();

/*
|--------------------------------------------------------------------------
| WALLET MATHS
|--------------------------------------------------------------------------
|
| available = earned - already paid - currently reserved by open requests
|
| "pending" is money reserved by a payout request that an admin has not
| settled yet, which is what stops a student requesting the same ₹250
| twice.
|
*/

interface Wallet {
  successfulReferrals: number;
  totalEarned: number;
  paidAmount: number;
  pendingPayout: number;
  available: number;
}

function buildWallet(data: Record<string, unknown>): Wallet {
  const successfulReferrals = Number(data.successfulReferrals || 0);
  const totalEarned = referralTotalEarned(successfulReferrals);
  const paidAmount = Number(data.referralPaidAmount || 0);
  const pendingPayout = Number(data.referralPendingPayoutAmount || 0);

  return {
    successfulReferrals,
    totalEarned,
    paidAmount,
    pendingPayout,
    available: Math.max(totalEarned - paidAmount - pendingPayout, 0),
  };
}

function requestedAtMillis(value: unknown): number {
  const candidate = value as { toMillis?: () => number } | undefined;

  return typeof candidate?.toMillis === "function" ? candidate.toMillis() : 0;
}

/*
|--------------------------------------------------------------------------
| GET /api/payout/history
|--------------------------------------------------------------------------
|
| Returns the student's referral wallet plus their payout requests,
| newest first.
|
*/

payoutRouter.get(
  "/history",
  requireUser,
  asyncHandler(async (req, res) => {
    const uid = currentUser(req).uid;
    const db = getDb();

    const studentSnap = await db.collection("students").doc(uid).get();

    if (!studentSnap.exists) {
      throw notFound("Student not found.");
    }

    const wallet = buildWallet(studentSnap.data() || {});

    const snap = await db
      .collection("payoutRequests")
      .where("uid", "==", uid)
      .get();

    const history = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort(
        (a, b) =>
          requestedAtMillis((b as { requestedAt?: unknown }).requestedAt) -
          requestedAtMillis((a as { requestedAt?: unknown }).requestedAt)
      );

    res.json({ success: true, wallet, history });
  })
);

/*
|--------------------------------------------------------------------------
| POST /api/payout/request
|--------------------------------------------------------------------------
|
| Creates a pending payout request and reserves the amount on the student
| document in the same transaction, so the available balance is recomputed
| from authoritative data rather than trusted from the browser.
|
*/

payoutRouter.post(
  "/request",
  requireUser,
  asyncHandler(async (req, res) => {
    const uid = currentUser(req).uid;

    const amount = Math.floor(Number(req.body?.amount || 0));
    const method = readString(req.body?.method).toLowerCase();

    const upiId = readString(req.body?.upiId);

    /*
     * The student dashboard sends accountHolderName; older clients sent
     * accountName. Both are accepted.
     */
    const accountName = readString(
      req.body?.accountHolderName || req.body?.accountName
    );

    const accountNumber = readString(req.body?.accountNumber);
    const ifsc = readString(req.body?.ifsc).toUpperCase();

    if (!Number.isFinite(amount) || amount < MIN_PAYOUT_AMOUNT) {
      throw badRequest(`Minimum payout is ₹${MIN_PAYOUT_AMOUNT}.`);
    }

    if (!["upi", "bank"].includes(method)) {
      throw badRequest("Choose UPI or Bank Account.");
    }

    if (method === "upi" && !upiId) {
      throw badRequest("UPI ID is required.");
    }

    if (method === "bank" && (!accountName || !accountNumber || !ifsc)) {
      throw badRequest("Complete bank details are required.");
    }

    const db = getDb();

    const studentRef = db.collection("students").doc(uid);
    const payoutRef = db.collection("payoutRequests").doc();

    let available = 0;

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(studentRef);

      if (!snap.exists) {
        throw notFound("Student not found.");
      }

      const data = snap.data() || {};
      const wallet = buildWallet(data);

      available = wallet.available;

      if (amount > available) {
        throw badRequest(`Available payout balance is ₹${available}.`);
      }

      tx.set(payoutRef, {
        uid,
        studentName: String(data.fullName || ""),
        studentMobile: String(data.mobile || ""),
        amount,
        method,

        upiId: method === "upi" ? upiId : "",

        /*
         * accountName is the field the admin payout screen reads.
         */
        accountName: method === "bank" ? accountName : "",
        accountNumber: method === "bank" ? accountNumber : "",
        ifsc: method === "bank" ? ifsc : "",

        status: "pending",
        requestedAt: FieldValue.serverTimestamp(),
      });

      tx.set(
        studentRef,
        {
          referralPendingPayoutAmount: wallet.pendingPayout + amount,
          referralUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    res.json({
      success: true,
      payoutRequestId: payoutRef.id,
      amount,
      availableAfterRequest: Math.max(available - amount, 0),
    });
  })
);
