import { NextRequest, NextResponse } from "next/server";

import {
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import {
  getFirestore,
} from "firebase-admin/firestore";

export const runtime = "nodejs";

function getAdminApp() {
  const apps = getApps();

  if (apps.length > 0) {
    return apps[0];
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

  const privateKey = Buffer.from(
    privateKeyBase64.trim(),
    "base64"
  )
    .toString("utf8")
    .replace(/\\n/g, "\n");

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const mobile =
      typeof body.mobile === "string"
        ? body.mobile.replace(/\D/g, "").trim()
        : "";

    if (
      !/^[6-9]\d{9}$/.test(mobile)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please enter a valid 10-digit Indian mobile number.",
        },
        {
          status: 400,
        }
      );
    }

    const adminApp = getAdminApp();

    const db =
      getFirestore(adminApp);

    /*
     * Check students collection.
     *
     * Mobile is stored as:
     * 9876543210
     */

    const snapshot =
      await db
        .collection("students")
        .where("mobile", "==", mobile)
        .limit(1)
        .get();

    if (!snapshot.empty) {
      return NextResponse.json({
        success: true,
        exists: true,
        message:
          "This mobile number is already registered.",
      });
    }

    /*
     * Also check Firebase Auth.
     *
     * Existing phone-auth user should
     * not be allowed to start a new
     * registration.
     */

    try {
      const authUser =
        await (
          await import(
            "firebase-admin/auth"
          )
        ).getAuth(adminApp).getUserByPhoneNumber(
          `+91${mobile}`
        );

      if (authUser) {
        return NextResponse.json({
          success: true,
          exists: true,
          message:
            "This mobile number is already registered.",
        });
      }
    } catch (authError: any) {
      /*
       * auth/user-not-found means the
       * phone number is not registered
       * in Firebase Auth.
       *
       * That is OK.
       */

      if (
        authError?.code !==
        "auth/user-not-found"
      ) {
        console.error(
          "Firebase Auth mobile check error:",
          authError
        );

        throw authError;
      }
    }

    return NextResponse.json({
      success: true,
      exists: false,
    });
  } catch (error) {
    console.error(
      "Student mobile check error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to check mobile number.",
      },
      {
        status: 500,
      }
    );
  }
}