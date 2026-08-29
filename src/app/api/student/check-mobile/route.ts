import { NextRequest, NextResponse } from "next/server";

import {
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import {
  getFirestore,
} from "firebase-admin/firestore";

import {
  getAuth,
} from "firebase-admin/auth";

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

    /*
     * When this check is made AFTER OTP verification,
     * Firebase Auth has already created the current phone user.
     *
     * We must NOT treat that same user as a duplicate.
     */
    const excludeUid =
      typeof body.excludeUid === "string"
        ? body.excludeUid.trim()
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
     * ============================================================
     * CHECK STUDENTS COLLECTION
     * ============================================================
     */

    const snapshot =
      await db
        .collection("students")
        .where("mobile", "==", mobile)
        .limit(10)
        .get();

    /*
     * If a student document exists, it is a real registered
     * SBC student.
     *
     * We still allow the current Firebase Auth user when there
     * is no corresponding student record.
     */

    if (!snapshot.empty) {
      const matchingStudent =
        snapshot.docs.find((item) => {
          const data = item.data();

          const studentUid =
            typeof data.uid === "string"
              ? data.uid
              : item.id;

          return (
            !excludeUid ||
            studentUid !== excludeUid
          );
        });

      if (matchingStudent) {
        return NextResponse.json({
          success: true,
          exists: true,
          message:
            "This mobile number is already registered.",
        });
      }
    }

    /*
     * ============================================================
     * CHECK FIREBASE AUTH
     * ============================================================
     */

    try {
      const authUser =
        await getAuth(adminApp).getUserByPhoneNumber(
          `+91${mobile}`
        );

      /*
       * IMPORTANT:
       *
       * If this is the same Firebase Auth user that just
       * completed OTP verification, it is NOT a duplicate.
       *
       * Only another UID should be treated as registered.
       */

      if (
        authUser &&
        authUser.uid !== excludeUid
      ) {
        return NextResponse.json({
          success: true,
          exists: true,
          message:
            "This mobile number is already registered.",
        });
      }

    } catch (authError: any) {
      /*
       * auth/user-not-found is expected for a completely
       * new mobile number.
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

    /*
     * ============================================================
     * MOBILE AVAILABLE
     * ============================================================
     */

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