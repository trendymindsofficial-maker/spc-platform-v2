import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { Messaging, getMessaging } from "firebase-admin/messaging";

import {
  FIREBASE_ADMIN_CLIENT_EMAIL,
  FIREBASE_ADMIN_PRIVATE_KEY_BASE64,
  FIREBASE_ADMIN_PROJECT_ID,
} from "../config/env";

/*
|--------------------------------------------------------------------------
| FIREBASE ADMIN
|--------------------------------------------------------------------------
|
| Single shared Admin app for the whole process. The original Next.js
| routes each re-implemented this with slightly different validation; the
| strictest version (PEM shape check) is kept here.
|
*/

function decodePrivateKey(): string {
  let privateKey: string;

  try {
    privateKey = Buffer.from(
      FIREBASE_ADMIN_PRIVATE_KEY_BASE64.trim(),
      "base64"
    ).toString("utf8");
  } catch (error) {
    console.error("Firebase private key decode error:", error);

    throw new Error("Failed to decode Firebase Admin private key.");
  }

  /*
   * A base64 payload may itself contain literal "\n" sequences
   * (common when the PEM was JSON-escaped before encoding).
   */
  privateKey = privateKey.replace(/\\n/g, "\n");

  if (
    !privateKey.includes("-----BEGIN PRIVATE KEY-----") ||
    !privateKey.includes("-----END PRIVATE KEY-----")
  ) {
    throw new Error(
      "Decoded Firebase Admin private key is not a valid PEM key."
    );
  }

  return privateKey;
}

export function getAdminApp(): App {
  const existing = getApps();

  if (existing.length > 0) {
    return existing[0];
  }

  if (
    !FIREBASE_ADMIN_PROJECT_ID ||
    !FIREBASE_ADMIN_CLIENT_EMAIL ||
    !FIREBASE_ADMIN_PRIVATE_KEY_BASE64
  ) {
    throw new Error("Firebase Admin credentials are not configured.");
  }

  return initializeApp({
    credential: cert({
      projectId: FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: decodePrivateKey(),
    }),
  });
}

export function getDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminMessaging(): Messaging {
  return getMessaging(getAdminApp());
}
