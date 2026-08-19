import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

export const runtime = "nodejs";

function getAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  const privateKey =
    process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (
    !process.env.FIREBASE_ADMIN_PROJECT_ID ||
    !process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    !privateKey
  ) {
    throw new Error("Firebase Admin credentials are not configured.");
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const adminApp = getAdminApp();

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const idToken = authorization.substring(7);

    const decodedToken =
      await getAuth(adminApp).verifyIdToken(idToken);

    const db = getFirestore(adminApp);

    const adminSnap = await db
      .collection("admins")
      .doc(decodedToken.uid)
      .get();

    if (!adminSnap.exists) {
      return NextResponse.json(
        { error: "Admin access denied" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required." },
        { status: 400 }
      );
    }

    const tokenSnap = await db
      .collection("fcmTokens")
      .get();

    const tokens = tokenSnap.docs
      .map((doc) => doc.data().token)
      .filter(
        (token): token is string =>
          typeof token === "string" && token.length > 0
      );

    if (tokens.length === 0) {
      return NextResponse.json({
        success: true,
        totalTokens: 0,
        successCount: 0,
        failureCount: 0,
        message:
          "No students have enabled notifications yet.",
      });
    }

    const messaging = getMessaging(adminApp);

    let successCount = 0;
    let failureCount = 0;

    const invalidTokens: string[] = [];

    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);

      const response =
        await messaging.sendEachForMulticast({
          tokens: batch,

          notification: {
            title,
            body: message,
          },

          data: {
            url: "/student/dashboard",
          },

          webpush: {
            fcmOptions: {
              link: "https://studentbenefitcard.com/student/dashboard",
            },
          },
        });

      successCount += response.successCount;
      failureCount += response.failureCount;

      response.responses.forEach(
        (result, index) => {
          if (!result.success) {
            const errorCode = result.error?.code || "";

            if (
              errorCode.includes(
                "registration-token-not-registered"
              ) ||
              errorCode.includes(
                "invalid-registration-token"
              )
            ) {
              invalidTokens.push(batch[index]);
            }
          }
        }
      );
    }

    for (const token of invalidTokens) {
      await db
        .collection("fcmTokens")
        .doc(token)
        .delete()
        .catch(() => {});
    }

    await db.collection("notificationLogs").add({
      title,
      message,
      target: "all_students",
      totalTokens: tokens.length,
      successCount,
      failureCount,
      sentBy: decodedToken.uid,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      totalTokens: tokens.length,
      successCount,
      failureCount,
      cleanedTokens: invalidTokens.length,
    });
  } catch (error) {
    console.error(
      "Notification send error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send notification.",
      },
      { status: 500 }
    );
  }
}