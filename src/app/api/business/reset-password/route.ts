import { NextRequest, NextResponse } from "next/server";

import {
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

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
        "Invalid Firebase Admin private key."
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
| Normalize mobile
|--------------------------------------------------------------------------
*/

function normalizeMobile(value: string) {
  let number = String(value || "").trim();

  number = number.replace(
    /[\s\-()]/g,
    ""
  );

  if (number.startsWith("+91")) {
    number = number.slice(3);
  }

  if (
    number.startsWith("91") &&
    number.length === 12
  ) {
    number = number.slice(2);
  }

  if (
    number.startsWith("0") &&
    number.length === 11
  ) {
    number = number.slice(1);
  }

  return number;
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
    const body = await request.json();

    const mobile =
      normalizeMobile(body?.mobile);

    const newPassword =
      String(body?.newPassword || "");

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid mobile number.",
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password should be at least 6 characters.",
        },
        { status: 400 }
      );
    }

    /*
     * --------------------------------------------------
     * Firebase ID token comes from the OTP-verified
     * phone-auth session.
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
          error: "OTP verification is required.",
        },
        { status: 401 }
      );
    }

    const idToken =
      authorization.substring(7).trim();

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "OTP verification is required.",
        },
        { status: 401 }
      );
    }

    const adminApp = getAdminApp();
    const adminAuth = getAuth(adminApp);
    const decodedToken =
      await adminAuth.verifyIdToken(idToken);

    /*
     * The authenticated phone number must match
     * the business mobile being reset.
     */
    const verifiedPhone =
      String(
        decodedToken.phone_number || ""
      );

    if (
      verifiedPhone !==
      `+91${mobile}`
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Verified mobile number does not match the business account.",
        },
        { status: 403 }
      );
    }

    const db =
      getFirestore(adminApp);

    /*
     * Business registration stores the mobile
     * number in the businesses collection.
     *
     * Try the common formats so existing accounts
     * created with +91 / 91 / 0 are also supported.
     */
    const mobileVariants = [
      mobile,
      `0${mobile}`,
      `91${mobile}`,
      `+91${mobile}`,
    ];

    let businessData:
      | FirebaseFirestore.DocumentData
      | null = null;

    let businessUid = "";

    for (const variant of mobileVariants) {
      const snapshot = await db
        .collection("businesses")
        .where("mobile", "==", variant)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const businessDoc =
          snapshot.docs[0];

        businessData =
          businessDoc.data();

        businessUid =
          String(
            businessData?.uid ||
            businessDoc.id
          );

        break;
      }
    }

    if (!businessData || !businessUid) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No business account was found with this mobile number.",
        },
        { status: 404 }
      );
    }

    /*
     * Only update the existing business Firebase Auth
     * account. The phone-auth user used for OTP is not
     * modified.
     */
    await adminAuth.updateUser(
      businessUid,
      {
        password: newPassword,
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "Business password reset successfully.",
    });
  } catch (error: any) {
    console.error(
      "Business password reset API error:",
      error
    );

    if (
      error?.code ===
      "auth/id-token-expired"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "OTP session expired. Please request a new OTP.",
        },
        { status: 401 }
      );
    }

    if (
      error?.code ===
      "auth/invalid-id-token"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid OTP verification session.",
        },
        { status: 401 }
      );
    }

    if (
      error?.code ===
      "auth/user-not-found"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Business Firebase account was not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to reset business password.",
      },
      { status: 500 }
    );
  }
}
