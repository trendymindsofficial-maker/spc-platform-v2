import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";

import { MAX_REDEMPTIONS_PER_BUSINESS } from "../config/constants";
import { toDate } from "../lib/dates";
import { getDb } from "../lib/firebase-admin";
import { ApiError, asyncHandler, badRequest, notFound, readString } from "../lib/http";
import { currentUser, requireUser } from "../middleware/auth";

export const redemptionRouter = Router();

/*
|--------------------------------------------------------------------------
| POST /api/redemption/create
|--------------------------------------------------------------------------
|
| Creates a pending redemption request that the business then approves on
| its own dashboard.
|
| Everything the browser sends is re-checked here:
|
|   - membership must be unexpired (and the status field is corrected
|     either way, so an expired card cannot linger as "active")
|   - the student must be under the per-business redemption cap
|   - the offer must exist, be active, and actually belong to the business
|
| The cap is deliberately keyed on businessId + studentId rather than
| offerId: deleting an offer and creating a new one must not reset a
| student's usage for that business.
|
*/

redemptionRouter.post(
  "/create",
  requireUser,
  asyncHandler(async (req, res) => {
    const uid = currentUser(req).uid;

    const businessId = readString(req.body?.businessId);
    const businessName = readString(req.body?.businessName);
    const businessVerificationId = readString(req.body?.businessVerificationId);
    const offerId = readString(req.body?.offerId);
    const offerTitle = readString(req.body?.offerTitle);
    const offerDiscount = readString(req.body?.offerDiscount);

    if (!businessId || !offerId) {
      throw badRequest("Business and offer are required.");
    }

    const db = getDb();

    /*
     * Membership gate.
     */
    const studentRef = db.collection("students").doc(uid);
    const studentSnap = await studentRef.get();

    if (!studentSnap.exists) {
      throw notFound("Student account was not found.");
    }

    const student = studentSnap.data() || {};
    const expiryDate = toDate(student.membershipExpiryDate);
    const now = new Date();

    if (!expiryDate || expiryDate.getTime() <= now.getTime()) {
      if (student.membershipStatus !== "expired") {
        await studentRef.update({
          membershipStatus: "expired",
          membershipUpdatedAt: FieldValue.serverTimestamp(),
        });
      }

      throw new ApiError(
        403,
        "Your SBC membership has expired. Please renew your membership before redeeming offers.",
        "MEMBERSHIP_EXPIRED"
      );
    }

    if (student.membershipStatus === "expired") {
      await studentRef.update({
        membershipStatus: "active",
        membershipUpdatedAt: FieldValue.serverTimestamp(),
      });
    }

    /*
     * Per-business redemption cap.
     */
    const usageRef = db
      .collection("businessStudentUsage")
      .doc(`${businessId}_${uid}`);

    const usageSnap = await usageRef.get();

    const currentUsage = usageSnap.exists
      ? Math.max(0, Number(usageSnap.data()?.count || 0))
      : 0;

    if (currentUsage >= MAX_REDEMPTIONS_PER_BUSINESS) {
      throw new ApiError(
        403,
        `Redemption limit reached. You can redeem from this business only ${MAX_REDEMPTIONS_PER_BUSINESS} times in total.`,
        "REDEMPTION_LIMIT_REACHED"
      );
    }

    /*
     * Offer must be real, active, and owned by this business.
     */
    const offerSnap = await db.collection("offers").doc(offerId).get();

    if (!offerSnap.exists) {
      throw notFound("Offer not found.");
    }

    const offerData = offerSnap.data() || {};

    if (
      String(offerData.status || "").toLowerCase() !== "active" ||
      String(offerData.businessId || "") !== businessId
    ) {
      throw new ApiError(409, "This offer is no longer available.");
    }

    const requestRef = db.collection("redemptionRequests").doc();

    await requestRef.set({
      studentId: uid,

      studentName:
        student.name ||
        student.fullName ||
        student.studentName ||
        "SBC Student",

      studentCardNumber:
        student.cardNumber || student.studentCardNumber || "",

      businessId,

      businessName:
        businessName || offerData.businessName || "SBC Partner Business",

      businessVerificationId,

      offerId,

      offerTitle: offerTitle || offerData.title || "SBC Offer",

      offerDiscount: offerDiscount || offerData.discount || "",

      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });

    res.json({ success: true, requestId: requestRef.id });
  })
);
