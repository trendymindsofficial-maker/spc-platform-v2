import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyBase64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64;
  if (!projectId || !clientEmail || !privateKeyBase64) throw new Error("Firebase Admin credentials are not configured.");
  const privateKey = Buffer.from(privateKeyBase64.trim(), "base64").toString("utf8").replace(/\\n/g, "\n");
  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----") || !privateKey.includes("-----END PRIVATE KEY-----")) throw new Error("Decoded Firebase Admin private key is not a valid PEM key.");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export async function requireUser(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const token = authorization.substring(7).trim();
  if (!token) throw new Error("UNAUTHORIZED");
  return getAuth(getAdminApp()).verifyIdToken(token);
}

export async function requireAdmin(request: Request) {
  const decoded = await requireUser(request);
  const db = getFirestore(getAdminApp());
  const snap = await db.collection("admins").doc(decoded.uid).get();
  if (!snap.exists) throw new Error("FORBIDDEN");
  return { decoded, db };
}
