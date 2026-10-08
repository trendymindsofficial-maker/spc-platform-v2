import { NextRequest, NextResponse } from "next/server";

import {
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import { getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";

function getAdminApp() {
  const existingApps = getApps();

  if (existingApps.length > 0) {
    return existingApps[0];
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyBase64 =
    process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64;

  if (!projectId || !clientEmail || !privateKeyBase64) {
    throw new Error("Firebase Admin credentials are not configured.");
  }

  let privateKey = Buffer.from(
    privateKeyBase64.trim(),
    "base64"
  ).toString("utf8");

  privateKey = privateKey.replace(/\\n/g, "\n");

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

function normalizeMobile(value: string) {
  let number = String(value || "").trim();

  number = number.replace(/[\s\-()]/g, "");

  if (number.startsWith("+91")) number = number.slice(3);
  if (number.startsWith("91") && number.length === 12) {
    number = number.slice(2);
  }
  if (number.startsWith("0") && number.length === 11) {
    number = number.slice(1);
  }

  return number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mobile = normalizeMobile(body?.mobile);

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return NextResponse.json(
        {
          success: false,
          exists: false,
          error: "Invalid mobile number.",
        },
        { status: 400 }
      );
    }

    const db = getFirestore(getAdminApp());

    /*
     * Business registration stores mobile in this exact field.
     * We check all common formats for older records too.
     */
    const variants = [
      mobile,
      `0${mobile}`,
      `91${mobile}`,
      `+91${mobile}`,
    ];

    for (const variant of variants) {
      const snapshot = await db
        .collection("businesses")
        .where("mobile", "==", variant)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return NextResponse.json({
          success: true,
          exists: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      exists: false,
    });
  } catch (error) {
    console.error("Business mobile check error:", error);

    return NextResponse.json(
      {
        success: false,
        exists: false,
        error: "Unable to check business registration.",
      },
      { status: 500 }
    );
  }
}
