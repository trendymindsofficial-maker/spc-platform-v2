import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getAdminApp, requireUser } from "@/lib/admin-server";
import { getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";

const MEMBERSHIP_AMOUNT = 199;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: Request) {
  try {
    /*
     * ============================================================
     * 1. AUTHENTICATE USER
     * ============================================================
     *
     * Membership and renewal orders must belong to a verified
     * Firebase user. The browser cannot create an anonymous
     * membership order.
     */
    let decodedUser;

    try {
      decodedUser = await requireUser(request);
    } catch (error: any) {
      console.error("Payment order authentication failed:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized. Firebase ID token is required.",
        },
        { status: 401 }
      );
    }

    const uid = decodedUser.uid;

    /*
     * ============================================================
     * 2. SERVER-SIDE PAYMENT CONFIG
     * ============================================================
     *
     * IMPORTANT:
     * Never trust amount sent by the browser.
     * SBC membership is always ₹199.
     */
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error(
        "Razorpay environment variables are missing."
      );

      return NextResponse.json(
        {
          success: false,
          error: "Razorpay payment is not configured on the server.",
        },
        { status: 500 }
      );
    }

    /*
     * ============================================================
     * 3. REQUEST PURPOSE
     * ============================================================
     */
    const body = await request.json().catch(() => ({}));

    const requestedPurpose =
      typeof body?.purpose === "string"
        ? body.purpose.trim().toLowerCase()
        : "";

    const isRenewal =
      requestedPurpose === "sbc membership renewal";

    const purpose = isRenewal
      ? "SBC membership renewal"
      : "SBC student membership";

    /*
     * ============================================================
     * 4. RENEWAL SAFETY CHECK
     * ============================================================
     *
     * Renewal should only be possible for an existing student.
     * Registration uses the non-renewal purpose and therefore does
     * not need a student document yet.
     */
    if (isRenewal) {
      const db = getFirestore(getAdminApp());

      const studentSnap = await db
        .collection("students")
        .doc(uid)
        .get();

      if (!studentSnap.exists) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Student membership account was not found. Please complete registration first.",
          },
          { status: 404 }
        );
      }
    }

    /*
     * ============================================================
     * 5. CREATE RAZORPAY ORDER
     * ============================================================
     *
     * The amount is intentionally hard-coded to ₹199.
     * body.amount is completely ignored.
     */
    const order = await razorpay.orders.create({
      amount: MEMBERSHIP_AMOUNT * 100,
      currency: "INR",
      receipt: `sbc_${uid.slice(0, 8)}_${Date.now()}`,
      notes: {
        purpose,
        uid,
        membershipPlan: "1_year",
        amount: String(MEMBERSHIP_AMOUNT),
      },
    });

    return NextResponse.json({
      success: true,
      order,
      keyId,
    });
  } catch (error) {
    console.error(
      "Razorpay order creation failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to create payment order.",
      },
      { status: 500 }
    );
  }
}
