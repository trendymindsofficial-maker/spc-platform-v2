import { Router } from "express";

import { getAdminAuth, getDb } from "../lib/firebase-admin";
import { asyncHandler } from "../lib/http";
import { digitsOnly, isValidIndianMobile, toE164 } from "../lib/mobile";

export const studentRouter = Router();

/*
|--------------------------------------------------------------------------
| POST /api/student/check-mobile
|--------------------------------------------------------------------------
|
| Public. Tells the registration page whether a mobile number is already
| taken, checking both the students collection and Firebase Auth.
|
| excludeUid matters: registration calls this again *after* OTP
| verification, at which point Firebase Auth has already created a phone
| user for that number. Without the exclusion the caller would be
| reported as a duplicate of itself and could never finish signing up.
|
*/

studentRouter.post(
  "/check-mobile",
  asyncHandler(async (req, res) => {
    const mobile = digitsOnly(req.body?.mobile);

    const excludeUid =
      typeof req.body?.excludeUid === "string"
        ? req.body.excludeUid.trim()
        : "";

    if (!isValidIndianMobile(mobile)) {
      res.status(400).json({
        success: false,
        error: "Please enter a valid 10-digit Indian mobile number.",
      });

      return;
    }

    try {
      const db = getDb();

      /*
       * Both lookups are needed, and neither depends on the other, so
       * they run together. Sequentially this was two round trips on the
       * critical path before the OTP could even be requested.
       */
      const [snapshot, authUser] = await Promise.all([
        db
          .collection("students")
          .where("mobile", "==", mobile)
          .limit(10)
          .get(),

        getAdminAuth()
          .getUserByPhoneNumber(toE164(mobile))
          .catch((authError: { code?: string }) => {
            /*
             * Not found is the expected result for a new number.
             */
            if (authError?.code === "auth/user-not-found") {
              return null;
            }

            throw authError;
          }),
      ]);

      if (!snapshot.empty) {
        const matchingStudent = snapshot.docs.find((item) => {
          const data = item.data();

          const studentUid =
            typeof data.uid === "string" ? data.uid : item.id;

          return !excludeUid || studentUid !== excludeUid;
        });

        if (matchingStudent) {
          res.json({
            success: true,
            exists: true,
            message: "This mobile number is already registered.",
          });

          return;
        }
      }

      /*
       * No student document. An auth account belonging to somebody else
       * still counts as taken.
       */
      if (authUser && authUser.uid !== excludeUid) {
        res.json({
          success: true,
          exists: true,
          message: "This mobile number is already registered.",
        });

        return;
      }

      res.json({ success: true, exists: false });
    } catch (error) {
      console.error("Student mobile check error:", error);

      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to check mobile number.",
      });
    }
  })
);
