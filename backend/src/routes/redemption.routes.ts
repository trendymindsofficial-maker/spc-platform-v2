import { Router } from "express";
import { createHash } from "node:crypto";
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
    const idempotencyKey = readString(req.body?.idempotencyKey);

    if (!businessId || !offerId) {
      throw badRequest("Business and offer are required.");
    }

    if (!idempotencyKey || idempotencyKey.length > 200) {
      throw badRequest("A valid redemption attempt key is required.");
    }

    const db = getDb();
    const authStudentRef = db.collection("students").doc(uid);
    const authStudentSnap = await authStudentRef.get();

    if (!authStudentSnap.exists) {
      throw notFound("Student account was not found.");
    }

    const authStudent = authStudentSnap.data() || {};
    const expiryDate = toDate(authStudent.membershipExpiryDate);
    const now = new Date();

    if (!expiryDate || expiryDate.getTime() <= now.getTime()) {
      if (authStudent.membershipStatus !== "expired") {
        await authStudentRef.update({
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

    if (authStudent.membershipStatus === "expired") {
      await authStudentRef.update({
        membershipStatus: "active",
        membershipUpdatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Stable request ID: retries of the same attempt reuse the same document.
    const requestDocumentId = createHash("sha256")
      .update(`${uid}:${businessId}:${idempotencyKey}`)
      .digest("hex");

    const requestRef = db.collection("redemptionRequests").doc(requestDocumentId);
    const redemptionRef = db.collection("redemptions").doc();
    const usageRef = db
      .collection("businessStudentUsage")
      .doc(`${businessId}_${uid}`);

    const result = await db.runTransaction(async (transaction) => {
      // Return the previous result on a retry; never award points twice.
      const existingRequestSnap = await transaction.get(requestRef);

      if (existingRequestSnap.exists) {
        const existing = existingRequestSnap.data() || {};

        if (
          String(existing.studentId || "") !== uid ||
          String(existing.businessId || "") !== businessId ||
          String(existing.offerId || "") !== offerId
        ) {
          throw badRequest("This redemption attempt key is already in use.");
        }

        if (existing.status === "approved") {
          return {
            redemptionId: String(existing.redemptionId || ""),
            usageNumber: Number(existing.usageCount || 0),
            pointsAwarded: Number(existing.pointsAwarded || 0),
            totalPoints: Number(existing.totalPoints || 0),
            alreadyProcessed: true,
          };
        }

        throw badRequest("This redemption attempt has already been processed.");
      }

      // Read and validate all records before writing anything.
      const offerRef = db.collection("offers").doc(offerId);
      const studentQuery = db
        .collection("students")
        .where("uid", "==", uid);

      const offerSnap = await transaction.get(offerRef);
      const usageSnap = await transaction.get(usageRef);
      const redemptionsQuery = db
        .collection("redemptions")
        .where("studentId", "==", uid)
        .where("businessId", "==", businessId);
      const redemptionsSnap = await transaction.get(redemptionsQuery);
      const studentQuerySnap = await transaction.get(studentQuery);

      const studentDoc =
        studentQuerySnap.docs.find((item) => {
          const data = item.data();
          return Boolean(data.fullName && data.cardNumber);
        }) || studentQuerySnap.docs[0];

      let studentRef = studentDoc?.ref;

      if (!studentRef) {
        const fallbackSnap = await transaction.get(authStudentRef);
        if (fallbackSnap.exists) {
          studentRef = authStudentRef;
        }
      }

      if (!offerSnap.exists) {
        throw notFound("Offer not found.");
      }

      const offer = offerSnap.data() || {};

      if (
        String(offer.status || "").toLowerCase() !== "active" ||
        String(offer.businessId || "") !== businessId
      ) {
        throw new ApiError(409, "This offer is no longer available.");
      }

      if (!studentRef) {
        throw notFound("Student profile not found.");
      }

      const studentSnap = await transaction.get(studentRef);

      if (!studentSnap.exists) {
        throw notFound("Student profile not found.");
      }

      // Preserve the existing business-wide cap, including legacy history.
      const storedCount = usageSnap.exists
        ? Math.max(0, Number(usageSnap.data()?.count || 0))
        : 0;
      const currentCount = Math.max(storedCount, redemptionsSnap.size);

      if (currentCount >= MAX_REDEMPTIONS_PER_BUSINESS) {
        throw new ApiError(
          403,
          `Redemption limit reached. You can redeem from this business only ${MAX_REDEMPTIONS_PER_BUSINESS} times in total.`,
          "REDEMPTION_LIMIT_REACHED"
        );
      }

      const usageNumber = currentCount + 1;
      const pointsAwarded =
        usageNumber === 1 ? 20 : usageNumber === 2 ? 10 : 5;

      const pointsRef = db.collection("studentPoints").doc(studentRef.id);
      const pointsSnap = await transaction.get(pointsRef);

      const studentData = studentSnap.data() || {};
      const pointsData = pointsSnap.exists ? pointsSnap.data() || {} : {};
      const totalPoints = Number(pointsData.totalPoints || 0) + pointsAwarded;
      const timestamp = FieldValue.serverTimestamp();

      const finalBusinessName =
        businessName || offer.businessName || "SBC Partner Business";
      const finalOfferTitle = offerTitle || offer.title || "SBC Offer";
      const finalDiscount = offerDiscount || offer.discount || "";

      // All writes happen atomically in this transaction.
      transaction.set(
        usageRef,
        {
          studentId: uid,
          businessId,
          count: usageNumber,
          maxAllowed: MAX_REDEMPTIONS_PER_BUSINESS,
          updatedAt: timestamp,
        },
        { merge: true }
      );

      transaction.set(
        pointsRef,
        {
          studentId: studentRef.id,
          uid,
          totalPoints,
          lastPointsAwarded: pointsAwarded,
          lastPointsBusinessId: businessId,
          lastPointsRedemptionId: redemptionRef.id,
          updatedAt: timestamp,
        },
        { merge: true }
      );

      transaction.set(
        studentRef,
        {
          points: totalPoints,
          pointsUpdatedAt: timestamp,
          lastPointsAwarded: pointsAwarded,
          lastPointsBusinessId: businessId,
          lastPointsRedemptionId: redemptionRef.id,
        },
        { merge: true }
      );

      transaction.set(redemptionRef, {
        studentId: uid,
        studentProfileId: studentRef.id,
        studentName:
          studentData.fullName ||
          studentData.name ||
          studentData.studentName ||
          authStudent.name ||
          authStudent.fullName ||
          "SBC Student",
        studentMobile: studentData.mobile || studentData.phone || "",
        studentCardNumber:
          studentData.cardNumber ||
          studentData.studentCardNumber ||
          authStudent.cardNumber ||
          authStudent.studentCardNumber ||
          "",
        businessId,
        businessName: finalBusinessName,
        offerId,
        offerTitle: finalOfferTitle,
        discount: finalDiscount,
        requestId: requestRef.id,
        pointsAwarded,
        usageNumber,
        redeemedAt: timestamp,
        status: "redeemed",
      });

      transaction.set(requestRef, {
        studentId: uid,
        studentName:
          studentData.fullName ||
          studentData.name ||
          studentData.studentName ||
          authStudent.name ||
          authStudent.fullName ||
          "SBC Student",
        studentCardNumber:
          studentData.cardNumber ||
          studentData.studentCardNumber ||
          authStudent.cardNumber ||
          authStudent.studentCardNumber ||
          "",
        businessId,
        businessName: finalBusinessName,
        businessVerificationId,
        offerId,
        offerTitle: finalOfferTitle,
        offerDiscount: finalDiscount,
        status: "approved",
        createdAt: timestamp,
        approvedAt: timestamp,
        approvedBy: "system:auto-approval",
        updatedAt: timestamp,
        redemptionId: redemptionRef.id,
        usageCount: usageNumber,
        pointsAwarded,
        totalPoints,
      });

      return {
        redemptionId: redemptionRef.id,
        usageNumber,
        pointsAwarded,
        totalPoints,
      };
    });

    res.json({
      success: true,
      message: "Redemption approved successfully.",
      status: "approved",
      requestId: requestRef.id,
      ...result,
    });
  })
);
