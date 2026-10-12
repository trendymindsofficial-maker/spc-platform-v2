import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";

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

async function verifyApprovalAccess(uid: string) {
  const snap = await getDb()
    .collection("redeemApprovalAdmins")
    .doc(uid)
    .get();

  if (!snap.exists || snap.data()?.active !== true) {
    throw forbidden("Redeem Approval access denied.");
  }

  if (snap.data()?.accessAllBusinesses !== true) {
    throw forbidden(
      "All-business access is not enabled for this account."
    );
  }
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

    const requests = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));

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
    const requestRef = db
      .collection("redemptionRequests")
      .doc(requestId);

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(requestRef);

      if (!snap.exists) {
        throw notFound("Redemption request not found.");
      }

      const request = snap.data() || {};

      if (request.status !== "pending") {
        throw badRequest(
          "This request has already been processed."
        );
      }

      transaction.update(requestRef, {
        status: "approved",
        approvedAt: FieldValue.serverTimestamp(),
        approvedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    res.json({
      success: true,
      message: "Redemption request approved.",
      requestId,
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
    const requestRef = db
      .collection("redemptionRequests")
      .doc(requestId);

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(requestRef);

      if (!snap.exists) {
        throw notFound("Redemption request not found.");
      }

      const request = snap.data() || {};

      if (request.status !== "pending") {
        throw badRequest(
          "This request has already been processed."
        );
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