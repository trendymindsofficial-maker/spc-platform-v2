
import { Request, Response, NextFunction } from "express";
import { FIREBASE_ADMIN_PROJECT_ID } from "../config/env";
import { getDb } from "../lib/firebase-admin";
import {
  asyncHandler,
  forbidden,
} from "../lib/http";
import { verifyBearerToken } from "./auth";

export const requireRedeemApproval = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const decoded = await verifyBearerToken(req);

    const approvalRef = getDb()
      .collection("redeemApprovalAdmins")
      .doc(decoded.uid);

    const approvalSnap = await approvalRef.get();
    const approvalData = approvalSnap.data();

    console.info(
  `[RedeemApprovalAuth] uid=${decoded.uid} projectId=${FIREBASE_ADMIN_PROJECT_ID} documentExists=${approvalSnap.exists} active=${approvalData?.active === true}`
);

    if (
      !approvalSnap.exists ||
      approvalData?.active !== true
    ) {
      throw forbidden("Redeem Approval access denied.");
    }

    req.user = decoded;
    next();
  }
);
