import { NextRequest, NextResponse } from "next/server";

import {
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

export const runtime = "nodejs";

/*
|--------------------------------------------------------------------------
| Firebase Admin
|--------------------------------------------------------------------------
*/

function getAdminApp() {
  const existingApps = getApps();

  if (existingApps.length > 0) {
    return existingApps[0];
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID;

  const clientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  const privateKeyBase64 =
    process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64;

  if (
    !projectId ||
    !clientEmail ||
    !privateKeyBase64
  ) {
    throw new Error(
      "Firebase Admin credentials are not configured."
    );
  }

  let privateKey: string;

  try {
    privateKey = Buffer.from(
      privateKeyBase64.trim(),
      "base64"
    ).toString("utf8");

    privateKey = privateKey.replace(
      /\\n/g,
      "\n"
    );

    if (
      !privateKey.includes(
        "-----BEGIN PRIVATE KEY-----"
      ) ||
      !privateKey.includes(
        "-----END PRIVATE KEY-----"
      )
    ) {
      throw new Error(
        "Decoded Firebase Admin private key is not a valid PEM key."
      );
    }
  } catch (error) {
    console.error(
      "Firebase private key decode error:",
      error
    );

    throw new Error(
      "Failed to decode Firebase Admin private key."
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
*/

export async function POST(
  request: NextRequest
) {
  try {
    const adminApp = getAdminApp();

    /*
     * --------------------------------------------------
     * Authorization
     * --------------------------------------------------
     */

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized. Firebase ID token is required.",
        },
        { status: 401 }
      );
    }

    const idToken =
      authorization
        .substring(7)
        .trim();

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Firebase ID token is missing.",
        },
        { status: 401 }
      );
    }

    /*
     * --------------------------------------------------
     * Verify Admin
     * --------------------------------------------------
     */

    const adminAuth =
      getAuth(adminApp);

    const decodedToken =
      await adminAuth.verifyIdToken(
        idToken
      );

    const adminUid =
      decodedToken.uid;

    const db =
      getFirestore(adminApp);

    const adminSnap =
      await db
        .collection("admins")
        .doc(adminUid)
        .get();

    if (!adminSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin access denied.",
        },
        { status: 403 }
      );
    }

    /*
     * --------------------------------------------------
     * Request body
     * --------------------------------------------------
     */

    let body: {
      title?: unknown;
      message?: unknown;
      imageUrl?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const imageUrl =
      typeof body.imageUrl === "string"
        ? body.imageUrl.trim()
        : "";

    if (!title || !message) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Notification title and message are required.",
        },
        { status: 400 }
      );
    }

    if (
      imageUrl &&
      !imageUrl.startsWith("https://")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Notification image URL must use HTTPS.",
        },
        { status: 400 }
      );
    }

    /*
     * --------------------------------------------------
     * Get FCM tokens
     * --------------------------------------------------
     */

    const tokenSnap =
      await db
        .collection("fcmTokens")
        .get();

    const tokens =
      tokenSnap.docs
        .map((tokenDoc) => {
          const data =
            tokenDoc.data();

          return {
            id: tokenDoc.id,

            token:
              typeof data.token === "string"
                ? data.token.trim()
                : "",

            studentId:
              typeof data.studentId === "string"
                ? data.studentId
                : "",
          };
        })
        .filter(
          (item) =>
            item.token.length > 0
        );

    console.log(
      "===================================="
    );

    console.log(
      "FCM NOTIFICATION REQUEST"
    );

    console.log(
      "Total tokens:",
      tokens.length
    );

    console.log(
      "Title:",
      title
    );

    console.log(
      "Message:",
      message
    );

    console.log(
      "Image:",
      imageUrl || "No image"
    );

    console.log(
      "===================================="
    );

    if (tokens.length === 0) {
      return NextResponse.json({
        success: true,
        totalTokens: 0,
        successCount: 0,
        failureCount: 0,
        cleanedTokens: 0,
        message:
          "No students have enabled notifications yet.",
      });
    }

    /*
     * --------------------------------------------------
     * Firebase Messaging
     * --------------------------------------------------
     */

    const messaging =
      getMessaging(adminApp);

    let successCount = 0;
    let failureCount = 0;

    const invalidTokenIds: string[] = [];

    const failedTokens: Array<{
      tokenId: string;
      studentId: string;
      errorCode: string;
      errorMessage: string;
    }> = [];

    /*
     * Firebase multicast maximum = 500
     */

    for (
      let i = 0;
      i < tokens.length;
      i += 500
    ) {
      const batch =
        tokens.slice(i, i + 500);

      const batchTokens =
        batch.map(
          (item) => item.token
        );

      console.log(
        `Sending batch ${
          Math.floor(i / 500) + 1
        } with ${
          batchTokens.length
        } tokens`
      );

      /*
       * ------------------------------------------------
       * Web notification
       * ------------------------------------------------
       */

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

        icon:
          "https://www.studentbenefitcard.com/sbc-notification-icon.png",

        badge:
          "https://www.studentbenefitcard.com/sbc-notification-icon.png",

        requireInteraction: false,

        tag:
          `sbc-${Date.now()}-${i}`,
      };

      /*
       * Cloudinary image is optional.
       */

      if (imageUrl) {
        webNotification.image =
          imageUrl;
      }

      /*
       * ------------------------------------------------
       * Send FCM
       * ------------------------------------------------
       */

      const response =
        await messaging.sendEachForMulticast({
          tokens: batchTokens,

          notification: {
            title,
            body: message,
          },

          data: {
            title,
            body: message,

            url:
              "https://www.studentbenefitcard.com/student/dashboard",

            ...(imageUrl
              ? { imageUrl }
              : {}),
          },

          webpush: {
            headers: {
              Urgency: "high",
            },

            notification:
              webNotification,

            fcmOptions: {
              link:
                "https://www.studentbenefitcard.com/student/dashboard",
            },
          },
        });

      console.log(
        "FCM batch response:",
        {
          successCount:
            response.successCount,

          failureCount:
            response.failureCount,
        }
      );

      /*
       * ------------------------------------------------
       * Process responses
       * ------------------------------------------------
       */

      response.responses.forEach(
        (result, index) => {
          const currentToken =
            batch[index];

          if (result.success) {
            successCount++;

            console.log(
              "✅ FCM accepted:",
              {
                tokenId:
                  currentToken.id,

                studentId:
                  currentToken.studentId,

                messageId:
                  result.messageId,
              }
            );

            return;
          }

          failureCount++;

          const errorCode =
            result.error?.code || "";

          const errorMessage =
            result.error?.message || "";

          console.error(
            "❌ FCM failed:",
            {
              tokenId:
                currentToken.id,

              studentId:
                currentToken.studentId,

              errorCode,

              errorMessage,
            }
          );

          failedTokens.push({
            tokenId:
              currentToken.id,

            studentId:
              currentToken.studentId,

            errorCode,

            errorMessage,
          });

          if (
            errorCode.includes(
              "registration-token-not-registered"
            ) ||
            errorCode.includes(
              "invalid-registration-token"
            ) ||
            errorCode.includes(
              "unregistered"
            )
          ) {
            invalidTokenIds.push(
              currentToken.id
            );
          }
        }
      );
    }

    /*
     * --------------------------------------------------
     * Delete invalid tokens
     * --------------------------------------------------
     */

    for (
      const tokenId of invalidTokenIds
    ) {
      try {
        await db
          .collection("fcmTokens")
          .doc(tokenId)
          .delete();

        console.log(
          "🗑 Deleted invalid FCM token:",
          tokenId
        );
      } catch (error) {
        console.error(
          "Failed to delete invalid token:",
          error
        );
      }
    }

    /*
     * --------------------------------------------------
     * Notification log
     * --------------------------------------------------
     */

    await db
      .collection("notificationLogs")
      .add({
        title,
        message,

        imageUrl:
          imageUrl || null,

        target:
          "all_students",

        totalTokens:
          tokens.length,

        successCount,

        failureCount,

        cleanedTokens:
          invalidTokenIds.length,

        sentBy:
          adminUid,

        createdAt:
          new Date(),
      });

    /*
     * --------------------------------------------------
     * Final response
     * --------------------------------------------------
     */

    console.log(
      "===================================="
    );

    console.log(
      "FCM NOTIFICATION COMPLETED"
    );

    console.log({
      totalTokens:
        tokens.length,

      successCount,

      failureCount,

      cleanedTokens:
        invalidTokenIds.length,

      image:
        imageUrl || null,
    });

    console.log(
      "===================================="
    );

    return NextResponse.json({
      success: true,

      totalTokens:
        tokens.length,

      successCount,

      failureCount,

      cleanedTokens:
        invalidTokenIds.length,

      failedTokens,

      imageUrl:
        imageUrl || null,

      message:
        `Notification sent. ${successCount} successful, ${failureCount} failed.`,
    });
  } catch (error) {
    console.error(
      "Notification send error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to send notification.",
      },
      { status: 500 }
    );
  }
}
