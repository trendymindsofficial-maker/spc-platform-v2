import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminAuth, getDb } from "../lib/firebase-admin";
import {
  ApiError,
  asyncHandler,
  badRequest,
  forbidden,
  notFound,
  readString,
} from "../lib/http";
import {
  isValidIndianMobile,
  mobileVariants,
  normalizeMobile,
} from "../lib/mobile";
import { requireUser, currentUser } from "../middleware/auth";

export const businessRouter = Router();

/*
|--------------------------------------------------------------------------
| BUSINESS AUTH MODEL
|--------------------------------------------------------------------------
|
| A business signs in with email/password where the email is derived from
| its mobile number:
|
|     <10-digit-mobile>@business.spc
|
| The business profile document lives at businesses/<that account's uid>.
|
| The forgot-password flow verifies the mobile number over Firebase phone
| OTP. That creates a *separate* phone-auth user with a different uid, so
| the password reset cannot use the caller's own uid — it must resolve the
| email account from the verified phone number.
|
*/

const BUSINESS_EMAIL_DOMAIN = "business.spc";

function businessLoginEmail(mobile: string): string {
  return `${mobile}@${BUSINESS_EMAIL_DOMAIN}`;
}

/**
 * True when any business document is registered against this mobile,
 * including legacy records stored as 0…, 91… or +91… .
 */
async function businessExistsForMobile(mobile: string): Promise<boolean> {
  const db = getDb();

  for (const variant of mobileVariants(mobile)) {
    const snapshot = await db
      .collection("businesses")
      .where("mobile", "==", variant)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return true;
    }
  }

  return false;
}

/*
|--------------------------------------------------------------------------
| POST /api/business/check-mobile
|--------------------------------------------------------------------------
|
| Public. The business login page calls this *before* sending a reset OTP
| so an unregistered or student-only number never receives one.
|
| This endpoint was missing from the original codebase even though the
| frontend already called it, which made business forgot-password fail
| every time. The existence check that had been placed in
| /business/reset-password by mistake now lives here, where it belongs.
|
*/

businessRouter.post(
  "/check-mobile",
  asyncHandler(async (req, res) => {
    const mobile = normalizeMobile(req.body?.mobile);

    if (!isValidIndianMobile(mobile)) {
      res.status(400).json({
        success: false,
        exists: false,
        error: "Invalid mobile number.",
      });

      return;
    }

    const existsInFirestore = await businessExistsForMobile(mobile);

    if (existsInFirestore) {
      res.json({ success: true, exists: true });
      return;
    }

    /*
     * Fall back to Firebase Auth in case the profile document was removed
     * but the login account still exists.
     */
    try {
      await getAdminAuth().getUserByEmail(businessLoginEmail(mobile));

      res.json({ success: true, exists: true });
    } catch (error) {
      if ((error as { code?: string })?.code === "auth/user-not-found") {
        res.json({ success: true, exists: false });
        return;
      }

      console.error("Business mobile check error:", error);

      res.status(500).json({
        success: false,
        exists: false,
        error: "Unable to check business registration.",
      });
    }
  })
);

/*
|--------------------------------------------------------------------------
| POST /api/business/reset-password
|--------------------------------------------------------------------------
|
| Requires a Firebase ID token from a *phone* sign-in, which proves the
| caller controls the mobile number. The token's phone_number claim must
| match the submitted mobile, so one business cannot reset another's
| password by changing the request body.
|
| The original handler only looked the number up and returned success
| without ever changing the password — the UI reported "Password reset
| successful" while the old password stayed active. This performs the
| actual update via the Admin SDK.
|
*/

businessRouter.post(
  "/reset-password",
  requireUser,
  asyncHandler(async (req, res) => {
    const decoded = currentUser(req);

    const mobile = normalizeMobile(req.body?.mobile);
    const newPassword = readString(req.body?.newPassword);

    if (!isValidIndianMobile(mobile)) {
      throw badRequest("Invalid mobile number.");
    }

    if (newPassword.length < 6) {
      throw badRequest("Password should be at least 6 characters.");
    }

    /*
     * The verified phone number on the token is the only proof of
     * ownership we accept.
     */
    const tokenPhone = normalizeMobile(decoded.phone_number || "");

    if (!tokenPhone) {
      throw forbidden(
        "Mobile number verification is required before resetting the password."
      );
    }

    if (tokenPhone !== mobile) {
      throw forbidden(
        "The verified mobile number does not match this reset request."
      );
    }

    const adminAuth = getAdminAuth();
    const db = getDb();

    /*
     * Resolve the business login account from the verified number.
     */
    let businessUser;

    try {
      businessUser = await adminAuth.getUserByEmail(
        businessLoginEmail(mobile)
      );
    } catch (error) {
      if ((error as { code?: string })?.code === "auth/user-not-found") {
        throw notFound(
          "No business account is registered with this mobile number."
        );
      }

      throw error;
    }

    /*
     * Guard against resetting the phone-auth user itself, and against a
     * number that has an auth account but no business profile.
     */
    if (businessUser.uid === decoded.uid) {
      throw new ApiError(
        409,
        "This account is not a business login account."
      );
    }

    const profileSnap = await db
      .collection("businesses")
      .doc(businessUser.uid)
      .get();

    if (!profileSnap.exists && !(await businessExistsForMobile(mobile))) {
      throw notFound(
        "No business profile is registered with this mobile number."
      );
    }

    await adminAuth.updateUser(businessUser.uid, {
      password: newPassword,
    });

    /*
     * Any session issued before the reset should stop working.
     */
    await adminAuth.revokeRefreshTokens(businessUser.uid);

    if (profileSnap.exists) {
      await profileSnap.ref.set(
        {
          passwordUpdatedAt: FieldValue.serverTimestamp(),
          passwordResetVia: "mobile_otp",
        },
        { merge: true }
      );
    }

    console.log("Business password reset completed for uid:", businessUser.uid);

    res.json({ success: true });
  })
);
