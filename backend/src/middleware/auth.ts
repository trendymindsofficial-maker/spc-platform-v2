import { DecodedIdToken } from "firebase-admin/auth";
import { Request } from "express";

import { getAdminAuth, getDb } from "../lib/firebase-admin";
import { ApiError, asyncHandler, forbidden, unauthorized } from "../lib/http";

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
|
| Every protected endpoint expects a Firebase ID token:
|
|   Authorization: Bearer <idToken>
|
| This is the same contract the Next.js route handlers used, so the
| frontend keeps sending exactly what it sent before.
|
*/

export async function verifyBearerToken(
  req: Request
): Promise<DecodedIdToken> {
  const authorization = req.header("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    throw unauthorized("Unauthorized. Firebase ID token is required.");
  }

  const token = authorization.substring(7).trim();

  if (!token) {
    throw unauthorized("Firebase ID token is missing.");
  }

  try {
    return await getAdminAuth().verifyIdToken(token);
  } catch (error) {
    if (error instanceof ApiError) throw error;

    console.error("Firebase ID token verification failed:", error);

    throw unauthorized("Unauthorized. Firebase ID token is invalid.");
  }
}

/**
 * Requires any signed-in Firebase user. Populates req.user.
 */
export const requireUser = asyncHandler(async (req, _res, next) => {
  req.user = await verifyBearerToken(req);
  next();
});

/**
 * Requires a signed-in user that also has a document in the `admins`
 * collection keyed by their uid. Populates req.user and req.isAdmin.
 */
export const requireAdmin = asyncHandler(async (req, _res, next) => {
  const decoded = await verifyBearerToken(req);

  const snapshot = await getDb().collection("admins").doc(decoded.uid).get();

  if (!snapshot.exists) {
    throw forbidden("Admin access denied.");
  }

  req.user = decoded;
  req.isAdmin = true;

  next();
});

/**
 * Convenience accessor so handlers do not have to re-check for undefined
 * after the middleware has already guaranteed it.
 */
export function currentUser(req: Request): DecodedIdToken {
  if (!req.user) {
    throw unauthorized();
  }

  return req.user;
}
