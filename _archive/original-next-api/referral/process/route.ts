import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminApp, requireUser } from "@/lib/admin-server";
import { getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";
const REWARD_STEP = 10;
const REWARD_AMOUNT = 250;

export async function POST(request: Request) {
  try {
    const decoded = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const referredUid = String(body?.referredUid || decoded.uid);
    if (referredUid !== decoded.uid) return NextResponse.json({ success: false, error: "Invalid student." }, { status: 403 });

    const db = getFirestore(getAdminApp());
    const studentRef = db.collection("students").doc(referredUid);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) return NextResponse.json({ success: false, error: "Student profile not found." }, { status: 404 });

    const student = studentSnap.data() || {};
    if (String(student.status || "").toLowerCase() !== "active" || String(student.paymentStatus || "").toLowerCase() !== "paid") {
      return NextResponse.json({ success: false, error: "Student payment is not eligible for referral credit." }, { status: 400 });
    }
    if (!student.razorpayPaymentId || !student.razorpayOrderId) {
      return NextResponse.json({ success: false, error: "Verified payment details are missing." }, { status: 400 });
    }

    const referralCode = String(student.referredBy || "").trim();
    if (!referralCode) return NextResponse.json({ success: true, counted: false, reason: "no_referral" });

    const referrerQuery = await db.collection("students").where("referralCode", "==", referralCode).limit(2).get();
    if (referrerQuery.empty) return NextResponse.json({ success: false, error: "Referrer not found." }, { status: 400 });
    const referrerDoc = referrerQuery.docs[0];
    if (referrerDoc.id === referredUid) return NextResponse.json({ success: false, error: "Self referral is not allowed." }, { status: 400 });

    const referralRef = db.collection("referrals").doc(referredUid);
    let counted = false;
    let successfulReferrals = 0;

    await db.runTransaction(async (tx) => {
      const [referralSnap, referrerSnap] = await Promise.all([tx.get(referralRef), tx.get(referrerDoc.ref)]);
      const referrer = referrerSnap.data() || {};
      successfulReferrals = Number(referrer.successfulReferrals || 0);

      if (referralSnap.exists && String(referralSnap.data()?.status || "") === "success") return;

      const next = successfulReferrals + 1;
      successfulReferrals = next;
      counted = true;

      tx.set(referralRef, {
        referredUid,
        referrerUid: referrerDoc.id,
        referralCode,
        status: "success",
        paymentStatus: "paid",
        razorpayPaymentId: String(student.razorpayPaymentId),
        razorpayOrderId: String(student.razorpayOrderId),
        successfulAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(studentRef, {
        referralStatus: "success",
        referralPaymentStatus: "success",
        referralProcessedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(referrerDoc.ref, {
        successfulReferrals: next,
        pendingReferrals: Math.max(Number(referrer.pendingReferrals || 0) - 1, 0),
        referralRewardUnlocked: Math.floor(next / REWARD_STEP) > 0,
        referralTotalEarned: Math.floor(next / REWARD_STEP) * REWARD_AMOUNT,
        referralUpdatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return NextResponse.json({
      success: true,
      counted,
      successfulReferrals,
      totalEarned: Math.floor(successfulReferrals / REWARD_STEP) * REWARD_AMOUNT,
    });
  } catch (error: any) {
    const code = error?.message === "UNAUTHORIZED" ? 401 : 500;
    console.error("Referral process error:", error);
    return NextResponse.json({ success: false, error: code === 401 ? "Unauthorized." : "Unable to process referral." }, { status: code });
  }
}
