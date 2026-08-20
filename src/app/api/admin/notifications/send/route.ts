import { NextRequest, NextResponse } from "next/server";

import {
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import {
  getAuth,
} from "firebase-admin/auth";

import {
  getFirestore,
} from "firebase-admin/firestore";

import {
  getMessaging,
} from "firebase-admin/messaging";

export const runtime = "nodejs";

/*
|--------------------------------------------------------------------------
| Firebase Admin App
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
      "Firebase Admin credentials are not configured. Please check FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY_BASE64."
    );
  }

  let privateKey: string;

  try {
    privateKey = Buffer.from(
      privateKeyBase64.trim(),
      "base64"
    ).toString("utf8");

    /*
     * Make sure escaped newlines are converted
     * into real newlines.
     */
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
      "Failed to decode FIREBASE_ADMIN_PRIVATE_KEY_BASE64."
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
    /*
     * --------------------------------------------------
     * STEP 1
     * Initialize Firebase Admin
     * --------------------------------------------------
     */

    const adminApp =
      getAdminApp();

    /*
     * --------------------------------------------------
     * STEP 2
     * Check Authorization Header
     * --------------------------------------------------
     */

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized. Firebase ID token is required.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * --------------------------------------------------
     * STEP 3
     * Get Firebase ID Token
     * --------------------------------------------------
     */

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
        {
          status: 401,
        }
      );
    }

    /*
     * --------------------------------------------------
     * STEP 4
     * Verify Firebase User
     * --------------------------------------------------
     */

    const auth =
      getAuth(adminApp);

    const decodedToken =
      await auth.verifyIdToken(
        idToken
      );

    const adminUid =
      decodedToken.uid;

    /*
     * --------------------------------------------------
     * STEP 5
     * Firestore
     * --------------------------------------------------
     */

    const db =
      getFirestore(adminApp);

    /*
     * --------------------------------------------------
     * STEP 6
     * Verify Admin
     * --------------------------------------------------
     */

    const adminSnap =
      await db
        .collection("admins")
        .doc(adminUid)
        .get();

    if (!adminSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Admin access denied.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * --------------------------------------------------
     * STEP 7
     * Read Request Body
     * --------------------------------------------------
     */

    let body: {
      title?: unknown;
      message?: unknown;
    };

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid JSON request body.",
        },
        {
          status: 400,
        }
      );
    }

    const title =
      typeof body.title ===
      "string"
        ? body.title.trim()
        : "";

    const message =
      typeof body.message ===
      "string"
        ? body.message.trim()
        : "";

    /*
     * --------------------------------------------------
     * STEP 8
     * Validate Message
     * --------------------------------------------------
     */

    if (
      !title ||
      !message
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Notification title and message are required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------
     * STEP 9
     * Get FCM Tokens
     * --------------------------------------------------
     */

    const tokenSnap =
      await db
        .collection("fcmTokens")
        .get();

    /*
     * IMPORTANT:
     *
     * Do NOT use a custom type predicate here.
     *
     * Firebase Firestore returns any values,
     * so we normalize the token first and then
     * simply filter empty tokens.
     */

    const tokens = tokenSnap.docs
      .map((tokenDoc) => {
        const data =
          tokenDoc.data();

        return {
          id: tokenDoc.id,

          token:
            typeof data.token ===
            "string"
              ? data.token.trim()
              : "",

          studentId:
            typeof data.studentId ===
            "string"
              ? data.studentId
              : undefined,
        };
      })
      .filter(
        (item) =>
          item.token.length > 0
      );

    console.log(
      "FCM tokens found:",
      tokens.length
    );

    /*
     * --------------------------------------------------
     * No Tokens
     * --------------------------------------------------
     */

    if (
      tokens.length === 0
    ) {
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
     * STEP 10
     * Firebase Messaging
     * --------------------------------------------------
     */

    const messaging =
      getMessaging(
        adminApp
      );

    let successCount = 0;

    let failureCount = 0;

    const invalidTokenIds: string[] =
      [];

    /*
     * Firebase supports maximum
     * 500 tokens per multicast request.
     */

    for (
      let i = 0;
      i < tokens.length;
      i += 500
    ) {
      const batch =
        tokens.slice(
          i,
          i + 500
        );

      const batchTokens =
        batch.map(
          (item) =>
            item.token
        );

      console.log(
        `Sending FCM batch ${
          Math.floor(i / 500) + 1
        } with ${
          batchTokens.length
        } tokens.`
      );

      /*
       * ------------------------------------------------
       * Send Notification
       * ------------------------------------------------
       */

      const response =
        await messaging.sendEachForMulticast(
          {
            tokens:
              batchTokens,

            notification: {
              title,
              body: message,
            },

            data: {
              url:
                "/student/dashboard",
            },

            webpush: {
              notification: {
                title,
                body: message,

                icon:
                  "/icon-192.png",

                badge:
                  "/icon-192.png",

                requireInteraction:
                  false,
              },

              fcmOptions: {
                link:
                  "https://studentbenefitcard.com/student/dashboard",
              },
            },
          }
        );

      successCount +=
        response.successCount;

      failureCount +=
        response.failureCount;

      /*
       * ------------------------------------------------
       * Find Invalid Tokens
       * ------------------------------------------------
       */

      response.responses.forEach(
        (
          result,
          index
        ) => {
          if (
            result.success
          ) {
            return;
          }

          const errorCode =
            result.error?.code ||
            "";

          const errorMessage =
            result.error?.message ||
            "";

          console.error(
            "FCM token error:",
            {
              token:
                batchTokens[
                  index
                ],

              error:
                errorCode,

              message:
                errorMessage,
            }
          );

          /*
           * Remove expired / invalid tokens.
           */

          if (
            errorCode.includes(
              "registration-token-not-registered"
            ) ||
            errorCode.includes(
              "invalid-registration-token"
            ) ||
            errorCode.includes(
              "unregistered"
            ) ||
            errorCode.includes(
              "invalid-argument"
            )
          ) {
            invalidTokenIds.push(
              batch[index].id
            );
          }
        }
      );
    }

    /*
     * --------------------------------------------------
     * STEP 11
     * Delete Invalid Tokens
     * --------------------------------------------------
     */

    for (
      const tokenId of invalidTokenIds
    ) {
      try {
        await db
          .collection(
            "fcmTokens"
          )
          .doc(tokenId)
          .delete();

        console.log(
          "Deleted invalid FCM token:",
          tokenId
        );
      } catch (
        deleteError
      ) {
        console.error(
          "Failed to delete invalid FCM token:",
          deleteError
        );
      }
    }

    /*
     * --------------------------------------------------
     * STEP 12
     * Save Notification Log
     * --------------------------------------------------
     */

    await db
      .collection(
        "notificationLogs"
      )
      .add({
        title,

        message,

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
     * STEP 13
     * Success Response
     * --------------------------------------------------
     */

    console.log(
      "Notification completed:",
      {
        totalTokens:
          tokens.length,

        successCount,

        failureCount,

        cleanedTokens:
          invalidTokenIds.length,
      }
    );

    return NextResponse.json({
      success: true,

      totalTokens:
        tokens.length,

      successCount,

      failureCount,

      cleanedTokens:
        invalidTokenIds.length,

      message:
        `Notification sent. ${successCount} successful, ${failureCount} failed.`,
    });
  } catch (error) {
    /*
     * --------------------------------------------------
     * ERROR
     * --------------------------------------------------
     */

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
      {
        status: 500,
      }
    );
  }
}