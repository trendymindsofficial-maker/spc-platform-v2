import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const privateKeyBase64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64;

  if (!process.env.FIREBASE_ADMIN_PROJECT_ID ||
      !process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
      !privateKeyBase64) {
    throw new Error("Firebase Admin environment variables are missing.");
  }

  const privateKey = Buffer.from(privateKeyBase64, "base64").toString("utf8");

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, exists: false, message: "Email is required." },
        { status: 400 }
      );
    }

    const app = getAdminApp();
    const adminAuth = getAuth(app);
    const db = getFirestore(app);

    let user;

    try {
      user = await adminAuth.getUserByEmail(email);
    } catch (error: any) {
      if (error?.code === "auth/user-not-found") {
        return NextResponse.json({
          success: true,
          exists: false,
        });
      }

      throw error;
    }

    const adminSnap = await db.collection("admins").doc(user.uid).get();

    if (!adminSnap.exists) {
      return NextResponse.json({
        success: true,
        exists: false,
      });
    }

    return NextResponse.json({
      success: true,
      exists: true,
    });
  } catch (error) {
    console.error("Admin check-email failed:", error);

    return NextResponse.json(
      {
        success: false,
        exists: false,
        message: "Unable to verify admin account.",
      },
      { status: 500 }
    );
  }
}
