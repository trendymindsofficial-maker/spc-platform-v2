import { Router } from "express";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getDb } from "../lib/firebase-admin";
import {
  asyncHandler,
  badRequest,
  forbidden,
  notFound,
} from "../lib/http";
import { currentUser } from "../middleware/auth";
import { requireRedeemApproval } from "../middleware/redeemApprovalAuth";

export const redeemApprovalRouter = Router();

redeemApprovalRouter.use(requireRedeemApproval);

const MAX_REDEMPTIONS = 4;

function getPointsForUsage(usageNumber: number): number {
  if (usageNumber === 1) return 20;
  if (usageNumber === 2) return 10;
  return 5;
}

async function verifyApprovalAccess(uid: string) {
  const snap = await getDb()
    .collection("redeemApprovalAdmins")
    .doc(uid)
    .get();

  if (!snap.exists || snap.data()?.active !== true) {
    throw forbidden("Redeem Approval access denied.");
  }

  if (snap.data()?.accessAllBusinesses !== true) {
    throw forbidden("All-business access is not enabled for this account.");
  }
}

function serializeTimestamp(value: unknown): string | null {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime())
      ? date.toISOString()
      : null;
  }

  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    const date = new Date(value.seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function serializeRequest(id: string, data: Record<string, unknown>) {
  return {
    ...data,
    id,
    createdAt: serializeTimestamp(data.createdAt),
    approvedAt: serializeTimestamp(data.approvedAt),
    rejectedAt: serializeTimestamp(data.rejectedAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

// GET /api/redeem-approval/requests
redeemApprovalRouter.get(
  "/requests",
  asyncHandler(async (req, res) => {
    const uid = currentUser(req).uid;
    await verifyApprovalAccess(uid);

    const snapshot = await getDb()
      .collection("redemptionRequests")
      .where("status", "==", "pending")
      .get();

    const requests = snapshot.docs.map((item) =>
      serializeRequest(
        item.id,
        item.data() as Record<string, unknown>
      )
    );

    res.json({ success: true, requests });
  })
);

// POST /api/redeem-approval/requests/:id/approve
redeemApprovalRouter.post(
  "/requests/:id/approve",
  asyncHandler(async (req, res) => {
    const uid = currentUser(req).uid;
    await verifyApprovalAccess(uid);

    const requestId = String(req.params.id || "").trim();

    if (!requestId) {
      throw badRequest("Request ID is required.");
    }

    const db = getDb();
    const requestRef = db.collection("redemptionRequests").doc(requestId);

    const result = await db.runTransaction(async (transaction) => {
      // Read the request first.
      const requestSnap = await transaction.get(requestRef);

      if (!requestSnap.exists) {
        throw notFound("Redemption request not found.");
      }

      const request = requestSnap.data() || {};

      if (request.status !== "pending") {
        throw badRequest("This request has already been processed.");
      }

      const studentAuthUid = String(request.studentId || "");
      const businessId = String(request.businessId || "");
      const offerId = String(request.offerId || "");

      if (!studentAuthUid || !businessId || !offerId) {
        throw badRequest("The redemption request is missing required information.");
      }

      const offerRef = db.collection("offers").doc(offerId);
      const usageRef = db
        .collection("businessStudentUsage")
        .doc(`${businessId}_${studentAuthUid}`);

      // Match the same student profile lookup used by the student dashboard.
      const studentQuery = db
        .collection("students")
        .where("uid", "==", studentAuthUid);

      const studentQuerySnap = await transaction.get(studentQuery);

      const studentDoc =
        studentQuerySnap.docs.find((item) => {
          const data = item.data();
          return Boolean(data.fullName && data.cardNumber);
        }) || studentQuerySnap.docs[0];

      let studentRef = studentDoc?.ref;

      // Match the dashboard's fallback when no profile is found by uid query.
      if (!studentRef) {
        const fallbackRef = db.collection("students").doc(studentAuthUid);
        const fallbackSnap = await transaction.get(fallbackRef);

        if (fallbackSnap.exists) {
          studentRef = fallbackRef;
        }
      }

      if (!studentRef) {
        throw notFound("Student profile not found. Approval was not completed.");
      }

      const offerSnap = await transaction.get(offerRef);
      const usageSnap = await transaction.get(usageRef);

      const redemptionsQuery = db
        .collection("redemptions")
        .where("studentId", "==", studentAuthUid)
        .where("businessId", "==", businessId);

      const redemptionsSnap = await transaction.get(redemptionsQuery);

      // Guard against a redemption already created for this same request.
      const sameRequestQuery = db
        .collection("redemptions")
        .where("requestId", "==", requestId);

      const sameRequestSnap = await transaction.get(sameRequestQuery);

      if (!offerSnap.exists) {
        throw notFound("Offer not found.");
      }

      const offer = offerSnap.data() || {};

      if (String(offer.businessId || "") !== businessId) {
        throw badRequest("This offer does not belong to the requesting business.");
      }

      if (String(offer.status || "").toLowerCase() !== "active") {
        throw badRequest("This offer is no longer active.");
      }

      if (!studentDoc && studentRef.id !== studentAuthUid) {
        throw notFound("Student profile could not be verified.");
      }

      if (sameRequestSnap.size > 0) {
        throw badRequest(
          "A redemption record already exists for this request. Please check the redemption history."
        );
      }

      const legacyCount = redemptionsSnap.size;
      const storedCount = usageSnap.exists
        ? Number(usageSnap.data()?.count || 0)
        : 0;

      const currentCount = Math.max(storedCount, legacyCount);

      if (currentCount >= MAX_REDEMPTIONS) {
        throw badRequest(
          "This student has already used the benefit 4/4 times at this business."
        );
      }

      const usageNumber = currentCount + 1;
      const pointsAwarded = getPointsForUsage(usageNumber);

      // Points document ID must match the student's profile document ID.
      const pointsRef = db.collection("studentPoints").doc(studentRef.id);
      const pointsSnap = await transaction.get(pointsRef);
      const studentSnap = await transaction.get(studentRef);

      if (!studentSnap.exists) {
        throw notFound("Student profile not found.");
      }

      const studentData = studentSnap.data() || {};
      const pointsData = pointsSnap.exists ? pointsSnap.data() || {} : {};
      const currentPoints = Number(pointsData.totalPoints || 0);
      const newTotalPoints = currentPoints + pointsAwarded;

      const redemptionRef = db.collection("redemptions").doc();
      const now = FieldValue.serverTimestamp();

      // All reads are complete. Apply all writes atomically.
      transaction.set(
        usageRef,
        {
          studentId: studentAuthUid,
          businessId,
          count: usageNumber,
          maxAllowed: MAX_REDEMPTIONS,
          updatedAt: now,
        },
        { merge: true }
      );

      transaction.set(
        pointsRef,
        {
          studentId: studentRef.id,
          uid: studentAuthUid,
          totalPoints: newTotalPoints,
          lastPointsAwarded: pointsAwarded,
          lastPointsBusinessId: businessId,
          lastPointsRedemptionId: redemptionRef.id,
          updatedAt: now,
        },
        { merge: true }
      );

      // Keep the legacy student profile balance in sync.
      transaction.set(
        studentRef,
        {
          points: newTotalPoints,
          pointsUpdatedAt: now,
          lastPointsAwarded: pointsAwarded,
          lastPointsBusinessId: businessId,
          lastPointsRedemptionId: redemptionRef.id,
        },
        { merge: true }
      );

      transaction.set(redemptionRef, {
        studentId: studentAuthUid,
        studentProfileId: studentRef.id,
        studentName:
          request.studentName ||
          studentData.fullName ||
          studentData.name ||
          "SBC Student",
        studentMobile:
          request.studentMobile ||
          studentData.mobile ||
          studentData.phone ||
          "",
        studentCardNumber:
          request.studentCardNumber ||
          studentData.cardNumber ||
          studentData.studentCardNumber ||
          "",
        businessId,
        businessName:
          request.businessName || offer.businessName || "SBC Partner Business",
        offerId,
        offerTitle: request.offerTitle || offer.title || "SBC Offer",
        discount:
          request.discount ||
          request.offerDiscount ||
          offer.discount ||
          "",
        requestId,
        pointsAwarded,
        usageNumber,
        redeemedAt: now,
        status: "redeemed",
      });

      transaction.update(requestRef, {
        status: "approved",
        approvedAt: now,
        approvedBy: uid,
        updatedAt: now,
        redemptionId: redemptionRef.id,
        usageCount: usageNumber,
        pointsAwarded,
      });

      return {
        redemptionId: redemptionRef.id,
        usageNumber,
        pointsAwarded,
        totalPoints: newTotalPoints,
      };
    });

    res.json({
      success: true,
      message: "Redemption request approved.",
      requestId,
      ...result,
    });
  })
);

// POST /api/redeem-approval/requests/:id/reject
redeemApprovalRouter.post(
  "/requests/:id/reject",
  asyncHandler(async (req, res) => {
    const uid = currentUser(req).uid;
    await verifyApprovalAccess(uid);

    const requestId = String(req.params.id || "").trim();

    if (!requestId) {
      throw badRequest("Request ID is required.");
    }

    const db = getDb();
    const requestRef = db.collection("redemptionRequests").doc(requestId);

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(requestRef);

      if (!snap.exists) {
        throw notFound("Redemption request not found.");
      }

      const request = snap.data() || {};

      if (request.status !== "pending") {
        throw badRequest("This request has already been processed.");
      }

      transaction.update(requestRef, {
        status: "rejected",
        rejectedAt: FieldValue.serverTimestamp(),
        rejectedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    res.json({
      success: true,
      message: "Redemption request rejected.",
      requestId,
    });
  })
);
