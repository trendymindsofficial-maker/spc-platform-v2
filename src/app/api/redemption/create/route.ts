import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp, requireUser } from "@/lib/admin-server";

export const runtime = "nodejs";

const MAX_REDEMPTIONS = 4;

function toDate(value: any): Date | null {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (typeof value?.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date ? date : null;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    let decoded;

    try {
      decoded = await requireUser(request);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized. Please login again.",
        },
        { status: 401 }
      );
    }

    const uid = decoded.uid;
    const body = await request.json().catch(() => ({}));

    const businessId =
      typeof body?.businessId === "string"
        ? body.businessId.trim()
        : "";

    const businessName =
      typeof body?.businessName === "string"
        ? body.businessName.trim()
        : "";

    const businessVerificationId =
      typeof body?.businessVerificationId === "string"
        ? body.businessVerificationId.trim()
        : "";

    const offerId =
      typeof body?.offerId === "string"
        ? body.offerId.trim()
        : "";

    const offerTitle =
      typeof body?.offerTitle === "string"
        ? body.offerTitle.trim()
        : "";

    const offerDiscount =
      typeof body?.offerDiscount === "string"
        ? body.offerDiscount.trim()
        : "";

    if (!businessId || !offerId) {
      return NextResponse.json(
        {
          success: false,
          error: "Business and offer are required.",
        },
        { status: 400 }
      );
    }

    const db = getFirestore(getAdminApp());

    /*
     * Membership is checked on the server immediately before a
     * redemption request is created. The browser cannot bypass
     * this by manipulating dashboard state.
     */
    const studentRef = db.collection("students").doc(uid);
    const studentSnap = await studentRef.get();

    if (!studentSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "Student account was not found.",
        },
        { status: 404 }
      );
    }

    const student = studentSnap.data() || {};
    const expiryDate = toDate(student.membershipExpiryDate);
    const now = new Date();

    if (!expiryDate || expiryDate.getTime() <= now.getTime()) {
      if (student.membershipStatus !== "expired") {
        await studentRef.update({
          membershipStatus: "expired",
          membershipUpdatedAt: FieldValue.serverTimestamp(),
        });
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "Your SBC membership has expired. Please renew your membership before redeeming offers.",
          code: "MEMBERSHIP_EXPIRED",
        },
        { status: 403 }
      );
    }

    if (student.membershipStatus === "expired") {
      await studentRef.update({
        membershipStatus: "active",
        membershipUpdatedAt: FieldValue.serverTimestamp(),
      });
    }

    /*
     * Keep the existing SBC rule:
     * maximum 4 redemptions per student per business,
     * regardless of offer.
     */
    const usageRef = db
      .collection("businessStudentUsage")
      .doc(`${businessId}_${uid}`);

    const usageSnap = await usageRef.get();
    const currentUsage = usageSnap.exists
      ? Math.max(0, Number(usageSnap.data()?.count || 0))
      : 0;

    if (currentUsage >= MAX_REDEMPTIONS) {
      return NextResponse.json(
        {
          success: false,
          error: `Redemption limit reached. You can redeem from this business only ${MAX_REDEMPTIONS} times in total.`,
          code: "REDEMPTION_LIMIT_REACHED",
        },
        { status: 403 }
      );
    }

    /*
     * Re-read the offer from Firestore so the request cannot
     * invent an offer that is not currently active.
     */
    const offerSnap = await db.collection("offers").doc(offerId).get();

    if (!offerSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "Offer not found.",
        },
        { status: 404 }
      );
    }

    const offerData = offerSnap.data() || {};

    if (
      String(offerData.status || "").toLowerCase() !== "active" ||
      String(offerData.businessId || "") !== businessId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "This offer is no longer available.",
        },
        { status: 409 }
      );
    }

    const requestRef = db.collection("redemptionRequests").doc();

    await requestRef.set({
      studentId: uid,
      studentName:
        student.name ||
        student.fullName ||
        student.studentName ||
        "SBC Student",
      studentCardNumber:
        student.cardNumber ||
        student.studentCardNumber ||
        "",
      businessId,
      businessName:
        businessName ||
        offerData.businessName ||
        "SBC Partner Business",
      businessVerificationId,
      offerId,
      offerTitle:
        offerTitle ||
        offerData.title ||
        "SBC Offer",
      offerDiscount:
        offerDiscount ||
        offerData.discount ||
        "",
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      requestId: requestRef.id,
    });
  } catch (error) {
    console.error("Create redemption request error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to send redemption request. Please try again.",
      },
      { status: 500 }
    );
  }
}
