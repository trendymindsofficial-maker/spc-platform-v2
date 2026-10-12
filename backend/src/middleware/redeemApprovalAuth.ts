import { Request, Response, NextFunction } from "express";

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

    if (
      !approvalSnap.exists ||
      approvalSnap.data()?.active !== true
    ) {
      throw forbidden("Redeem Approval access denied.");
    }

    req.user = decoded;
    next();
  }
);
