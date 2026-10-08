import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";

import {
  APP_PUBLIC_URL,
  NOTIFICATION_ICON_URL,
  STUDENT_DASHBOARD_URL,
} from "../config/env";
import { getAdminAuth, getAdminMessaging, getDb } from "../lib/firebase-admin";
import { ApiError, asyncHandler, badRequest, readString } from "../lib/http";
import { requireAdmin } from "../middleware/auth";
import { currentUser } from "../middleware/auth";

export const adminRouter = Router();

/*
|--------------------------------------------------------------------------
| POST /api/admin/check-email
|--------------------------------------------------------------------------
|
| Public. Used by the admin login page before sending a password-reset
| email, so a non-admin address never receives one.
|
| Note the response shape: { success, exists } — and on failure it also
| carries `exists: false` plus `message`. The admin login page reads
| `exists`, so this shape is preserved exactly.
|
*/

adminRouter.post(
  "/check-email",
  asyncHandler(async (req, res) => {
    const email = readString(req.body?.email).toLowerCase();

    if (!email) {
      res.status(400).json({
        success: false,
        exists: false,
        message: "Email is required.",
      });

      return;
    }

    try {
      const adminAuth = getAdminAuth();
      const db = getDb();

      let user;

      try {
        user = await adminAuth.getUserByEmail(email);
      } catch (error) {
        if ((error as { code?: string })?.code === "auth/user-not-found") {
          res.json({ success: true, exists: false });
          return;
        }

        throw error;
      }

      const adminSnap = await db.collection("admins").doc(user.uid).get();

      res.json({ success: true, exists: adminSnap.exists });
    } catch (error) {
      console.error("Admin check-email failed:", error);

      res.status(500).json({
        success: false,
        exists: false,
        message: "Unable to verify admin account.",
      });
    }
  })
);

/*
|--------------------------------------------------------------------------
| POST /api/admin/notifications/send
|--------------------------------------------------------------------------
|
| Admin only. Broadcasts a web-push notification to every stored FCM
| token, cleans up tokens Firebase reports as dead, and writes an audit
| log entry.
|
*/

interface StoredToken {
  id: string;
  token: string;
  studentId: string;
}

interface FailedToken {
  tokenId: string;
  studentId: string;
  errorCode: string;
  errorMessage: string;
}

/** Firebase multicast accepts at most 500 tokens per call. */
const FCM_BATCH_SIZE = 500;

adminRouter.post(
  "/notifications/send",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const adminUid = currentUser(req).uid;
    const db = getDb();

    const title = readString(req.body?.title);
    const message = readString(req.body?.message);
    const imageUrl = readString(req.body?.imageUrl);

    if (!title || !message) {
      throw badRequest("Notification title and message are required.");
    }

    if (imageUrl && !imageUrl.startsWith("https://")) {
      throw badRequest("Notification image URL must use HTTPS.");
    }

    /*
     * Collect every usable token.
     */
    const tokenSnap = await db.collection("fcmTokens").get();

    const tokens: StoredToken[] = tokenSnap.docs
      .map((tokenDoc) => {
        const data = tokenDoc.data();

        return {
          id: tokenDoc.id,
          token: typeof data.token === "string" ? data.token.trim() : "",
          studentId:
            typeof data.studentId === "string" ? data.studentId : "",
        };
      })
      .filter((item) => item.token.length > 0);

    console.log("FCM notification request:", {
      totalTokens: tokens.length,
      title,
      hasImage: Boolean(imageUrl),
    });

    if (tokens.length === 0) {
      res.json({
        success: true,
        totalTokens: 0,
        successCount: 0,
        failureCount: 0,
        cleanedTokens: 0,
        message: "No students have enabled notifications yet.",
      });

      return;
    }

    const messaging = getAdminMessaging();

    let successCount = 0;
    let failureCount = 0;

    const invalidTokenIds: string[] = [];
    const failedTokens: FailedToken[] = [];

    for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
      const batch = tokens.slice(i, i + FCM_BATCH_SIZE);
      const batchTokens = batch.map((item) => item.token);

      console.log(
        `Sending FCM batch ${Math.floor(i / FCM_BATCH_SIZE) + 1} with ${
          batchTokens.length
        } tokens.`
      );

      const webNotification: {
        title: string;
        body: string;
        icon: string;
        badge: string;
        requireInteraction: boolean;
        tag: string;
        image?: string;
      } = {
        title,
        body: message,
        icon: NOTIFICATION_ICON_URL,
        badge: NOTIFICATION_ICON_URL,
        requireInteraction: false,
        tag: `sbc-${Date.now()}-${i}`,
      };

      /*
       * The uploaded banner image is optional.
       */
      if (imageUrl) {
        webNotification.image = imageUrl;
      }

      const response = await messaging.sendEachForMulticast({
        tokens: batchTokens,

        notification: {
          title,
          body: message,
        },

        data: {
          title,
          body: message,
          url: STUDENT_DASHBOARD_URL,
          ...(imageUrl ? { imageUrl } : {}),
        },

        webpush: {
          headers: {
            Urgency: "high",
          },
          notification: webNotification,
          fcmOptions: {
            link: STUDENT_DASHBOARD_URL,
          },
        },
      });

      console.log("FCM batch response:", {
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      response.responses.forEach((result, index) => {
        const currentToken = batch[index];

        if (result.success) {
          successCount += 1;
          return;
        }

        failureCount += 1;

        const errorCode = result.error?.code || "";
        const errorMessage = result.error?.message || "";

        console.error("FCM delivery failed:", {
          tokenId: currentToken.id,
          studentId: currentToken.studentId,
          errorCode,
          errorMessage,
        });

        failedTokens.push({
          tokenId: currentToken.id,
          studentId: currentToken.studentId,
          errorCode,
          errorMessage,
        });

        /*
         * Tokens Firebase considers permanently dead are removed so the
         * next broadcast is not slowed down by them.
         */
        if (
          errorCode.includes("registration-token-not-registered") ||
          errorCode.includes("invalid-registration-token") ||
          errorCode.includes("unregistered")
        ) {
          invalidTokenIds.push(currentToken.id);
        }
      });
    }

    for (const tokenId of invalidTokenIds) {
      try {
        await db.collection("fcmTokens").doc(tokenId).delete();

        console.log("Deleted invalid FCM token:", tokenId);
      } catch (error) {
        console.error("Failed to delete invalid FCM token:", error);
      }
    }

    await db.collection("notificationLogs").add({
      title,
      message,
      imageUrl: imageUrl || null,
      target: "all_students",
      totalTokens: tokens.length,
      successCount,
      failureCount,
      cleanedTokens: invalidTokenIds.length,
      sentBy: adminUid,
      appUrl: APP_PUBLIC_URL,
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log("FCM notification completed:", {
      totalTokens: tokens.length,
      successCount,
      failureCount,
      cleanedTokens: invalidTokenIds.length,
    });

    res.json({
      success: true,
      totalTokens: tokens.length,
      successCount,
      failureCount,
      cleanedTokens: invalidTokenIds.length,
      failedTokens,
      imageUrl: imageUrl || null,
      message: `Notification sent. ${successCount} successful, ${failureCount} failed.`,
    });
  })
);

/*
|--------------------------------------------------------------------------
| GET /api/admin/payouts
|--------------------------------------------------------------------------
|
| Admin only. Lists every payout request, newest first.
|
*/

function requestedAtMillis(value: unknown): number {
  const candidate = value as { toMillis?: () => number } | undefined;

  return typeof candidate?.toMillis === "function" ? candidate.toMillis() : 0;
}

adminRouter.get(
  "/payouts",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const db = getDb();

    const snap = await db.collection("payoutRequests").get();

    const items = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort(
        (a, b) =>
          requestedAtMillis((b as { requestedAt?: unknown }).requestedAt) -
          requestedAtMillis((a as { requestedAt?: unknown }).requestedAt)
      );

    res.json({ success: true, items });
  })
);

/*
|--------------------------------------------------------------------------
| PATCH /api/admin/payouts
|--------------------------------------------------------------------------
|
| Admin only. Approves or rejects a pending payout.
|
| Both outcomes release the student's reserved (pending) amount. Approval
| additionally moves it into referralPaidAmount. The whole thing runs in a
| transaction and refuses to touch a request that is no longer pending, so
| a double click cannot pay twice.
|
*/

adminRouter.patch(
  "/payouts",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const adminUid = currentUser(req).uid;
    const db = getDb();

    const id = readString(req.body?.id);
    const action = readString(req.body?.action).toLowerCase();
    const utr = readString(req.body?.utr);
    const note = readString(req.body?.note);

    if (!id || !["approve", "reject"].includes(action)) {
      throw badRequest("Invalid payout action.");
    }

    const payoutRef = db.collection("payoutRequests").doc(id);

    await db.runTransaction(async (tx) => {
      const payoutSnap = await tx.get(payoutRef);

      if (!payoutSnap.exists) {
        throw new ApiError(400, "Payout not found.");
      }

      const payout = payoutSnap.data() || {};

      if (String(payout.status || "") !== "pending") {
        throw new ApiError(400, "This payout is already processed.");
      }

      const uid = String(payout.uid || "");
      const amount = Number(payout.amount || 0);

      if (!uid) {
        throw new ApiError(400, "Payout request is missing its student.");
      }

      const studentRef = db.collection("students").doc(uid);
      const studentSnap = await tx.get(studentRef);
      const student = studentSnap.data() || {};

      const pending = Number(student.referralPendingPayoutAmount || 0);

      if (action === "approve") {
        tx.update(payoutRef, {
          status: "paid",
          utr,
          adminNote: note,
          approvedBy: adminUid,
          paidAt: FieldValue.serverTimestamp(),
        });

        tx.set(
          studentRef,
          {
            referralPendingPayoutAmount: Math.max(pending - amount, 0),
            referralPaidAmount:
              Number(student.referralPaidAmount || 0) + amount,
            referralUpdatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return;
      }

      tx.update(payoutRef, {
        status: "rejected",
        adminNote: note,
        rejectedBy: adminUid,
        rejectedAt: FieldValue.serverTimestamp(),
      });

      tx.set(
        studentRef,
        {
          referralPendingPayoutAmount: Math.max(pending - amount, 0),
          referralUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    res.json({ success: true });
  })
);
