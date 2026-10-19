
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { Router } from "express";

import {
  MEMBERSHIP_AMOUNT,
  MEMBERSHIP_AMOUNT_PAISE,
  MEMBERSHIP_PLAN,
} from "../config/constants";
import { APP_PUBLIC_URL } from "../config/env";
import { toDate } from "../lib/dates";
import { getDb } from "../lib/firebase-admin";
import {
  ApiError,
  asyncHandler,
  badRequest,
  notFound,
  readString,
} from "../lib/http";
import { grantMembership } from "../lib/membership";
import { getPhonePeClient } from "../lib/phonepe";
import { currentUser, requireUser } from "../middleware/auth";

export const paymentRouter = Router();

paymentRouter.get("/config", (_req, res) => {
  res.json({
    success: true,
    amount: MEMBERSHIP_AMOUNT,
    currency: "INR",
    plan: MEMBERSHIP_PLAN,
    provider: "PhonePe",
  });
});

paymentRouter.get(
  "/membership-status",
  requireUser,
  asyncHandler(async (req, res) => {
    const uid = currentUser(req).uid;
    const snap = await getDb().collection("students").doc(uid).get();

    if (!snap.exists) {
      throw notFound("Student account was not found.");
    }

    const student = snap.data() || {};
    const expiry = toDate(student.membershipExpiryDate);
    const start = toDate(student.membershipStartDate);

    res.json({
      success: true,
      paid: String(student.paymentStatus || "").toLowerCase() === "paid",
      status: String(student.status || ""),
      membershipStatus: String(student.membershipStatus || ""),
      membershipActive: !!expiry && expiry.getTime() > Date.now(),
      membershipStartDate: start?.toISOString() || null,
      membershipExpiryDate: expiry?.toISOString() || null,
      cardNumber: String(student.cardNumber || ""),
    });
  })
);

paymentRouter.post(
  "/create-order",
  requireUser,
  asyncHandler(async (req, res) => {
    const uid = currentUser(req).uid;
    const mode = readString(req.body?.mode).toLowerCase();

    if (mode !== "registration" && mode !== "renewal") {
      throw badRequest("Invalid membership payment mode.");
    }

    const db = getDb();
    const studentRef = db.collection("students").doc(uid);
    const studentSnap = await studentRef.get();

    if (!studentSnap.exists) {
      throw notFound("Student account was not found. Please complete registration first.");
    }

    const merchantOrderId = `SBC${Date.now()}${crypto
      .randomBytes(8)
      .toString("hex")}`;

    const returnUrl = new URL("/student/payment-return", APP_PUBLIC_URL);
    returnUrl.searchParams.set("merchantOrderId", merchantOrderId);
    returnUrl.searchParams.set("mode", mode);

    const orderRef = db.collection("phonepeOrders").doc(merchantOrderId);

    await orderRef.set({
      uid,
      merchantOrderId,
      amount: MEMBERSHIP_AMOUNT,
      amountPaise: MEMBERSHIP_AMOUNT_PAISE,
      currency: "INR",
      purpose: mode,
      plan: MEMBERSHIP_PLAN,
      status: "initiated",
      provider: "PhonePe",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    try {
      const payRequest = (
        await import("@phonepe-pg/pg-sdk-node")
      ).StandardCheckoutPayRequest.builder()
        .merchantOrderId(merchantOrderId)
        .amount(MEMBERSHIP_AMOUNT_PAISE)
        .redirectUrl(returnUrl.toString())
        .message("SBC one-year student membership")
        .expireAfter(900)
        .build();

      const phonePeResponse = await getPhonePeClient().pay(payRequest);

      if (!phonePeResponse.redirectUrl) {
        throw new Error("PhonePe did not return a checkout URL.");
      }

      await orderRef.set(
        {
          status: "pending",
          phonepeOrderId: phonePeResponse.orderId,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      res.json({
        success: true,
        merchantOrderId,
        redirectUrl: phonePeResponse.redirectUrl,
      });
    } catch (error) {
      await orderRef.set(
        {
          status: "initiation_failed",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      throw error;
    }
  })
);

paymentRouter.post(
  "/verify",
  requireUser,
  asyncHandler(async (req, res) => {
    const uid = currentUser(req).uid;
    const merchantOrderId = readString(req.body?.merchantOrderId);

    if (!merchantOrderId || !/^SBC[A-Za-z0-9]+$/.test(merchantOrderId)) {
      throw badRequest("Invalid PhonePe order reference.");
    }

    const db = getDb();
    const orderRef = db.collection("phonepeOrders").doc(merchantOrderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      throw notFound("PhonePe membership order was not found.");
    }

    const order = orderSnap.data() || {};

    if (String(order.uid || "") !== uid) {
      throw new ApiError(403, "This payment order does not belong to your account.");
    }

    if (
      Number(order.amountPaise) !== MEMBERSHIP_AMOUNT_PAISE ||
      String(order.currency || "").toUpperCase() !== "INR"
    ) {
      throw badRequest("Invalid SBC membership order amount.");
    }

    const phonePeStatus = await getPhonePeClient().getOrderStatus(
      merchantOrderId,
      true
    );

    const orderState = String(phonePeStatus.state || "").toUpperCase();
    const responseAmount = Number(phonePeStatus.amount);

    if (orderState !== "COMPLETED") {
      res.status(200).json({
        success: false,
        pending: orderState !== "FAILED" && orderState !== "DECLINED",
        message:
          orderState === "FAILED" || orderState === "DECLINED"
            ? "PhonePe reports that this payment failed. You can try again."
            : "Payment is not confirmed yet. Please wait and check again.",
      });
      return;
    }

    if (responseAmount !== MEMBERSHIP_AMOUNT_PAISE) {
      throw badRequest("PhonePe payment amount does not match the SBC membership fee.");
    }

    const completedPayment = Array.isArray(phonePeStatus.paymentDetails)
      ? phonePeStatus.paymentDetails.find(
          (payment) =>
            String(payment.state || "").toUpperCase() === "COMPLETED" &&
            Number(payment.amount) === MEMBERSHIP_AMOUNT_PAISE &&
            Boolean(payment.transactionId)
        )
      : undefined;

    if (!completedPayment) {
      throw badRequest(
        "A completed PhonePe transaction could not be confirmed for this order."
      );
    }

    const studentSnap = await db.collection("students").doc(uid).get();

    if (!studentSnap.exists) {
      throw notFound("Student account was not found.");
    }

    const result = await grantMembership({
      uid,
      paymentProvider: "PhonePe",
      paymentId: completedPayment.transactionId,
      orderId: merchantOrderId,
      amount: MEMBERSHIP_AMOUNT,
      currency: "INR",
      source: "phonepe_status_verify",
    });

    await orderRef.set(
      {
        status: "paid",
        phonepeOrderId: phonePeStatus.orderId,
        phonepeTransactionId: completedPayment.transactionId,
        verifiedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    res.json({
      success: true,
      verified: true,
      paymentId: completedPayment.transactionId,
      merchantOrderId,
      membershipStartDate: result.membershipStartDate,
      membershipExpiryDate: result.membershipExpiryDate,
      membershipUpdated: !result.alreadyProcessed,
      alreadyProcessed: result.alreadyProcessed,
    });
  })
);
