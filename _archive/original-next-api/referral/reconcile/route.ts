import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminApp, requireUser } from "@/lib/admin-server";
import { getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";
const STEP = 10;
const REWARD = 250;

export async function POST(request: Request) {
  try {
    const decoded = await requireUser(request);
    const db = getFirestore(getAdminApp());
    const referrerRef = db.collection("students").doc(decoded.uid);
    const referrerSnap = await referrerRef.get();
    if (!referrerSnap.exists) return NextResponse.json({ success: false, error: "Student not found." }, { status: 404 });
    const referrer = referrerSnap.data() || {};
    const code = String(referrer.referralCode || "").trim();
    if (!code) return NextResponse.json({ success: true, counted: 0 });

    const studentsSnap = await db.collection("students").where("referredBy", "==", code).get();
    let counted = 0;

    for (const referred of studentsSnap.docs) {
      if (referred.id === decoded.uid) continue;
      const data = referred.data() || {};
      if (String(data.status || "").toLowerCase() !== "active" || String(data.paymentStatus || "").toLowerCase() !== "paid") continue;

      const referralRef = db.collection("referrals").doc(referred.id);
      await db.runTransaction(async (tx) => {
        const referralSnap = await tx.get(referralRef);
        if (referralSnap.exists && String(referralSnap.data()?.status || "") === "success") return;
        const freshReferrer = await tx.get(referrerRef);
        const fresh = freshReferrer.data() || {};
        const next = Number(fresh.successfulReferrals || 0) + 1;
        tx.set(referralRef, {
          referredUid: referred.id,
          referrerUid: decoded.uid,
          referralCode: code,
          status: "success",
          paymentStatus: "paid",
          razorpayPaymentId: String(data.razorpayPaymentId || ""),
          razorpayOrderId: String(data.razorpayOrderId || ""),
          successfulAt: FieldValue.serverTimestamp(),
          reconciled: true,
        }, { merge: true });
        tx.set(referred.ref, {
          referralStatus: "success",
          referralPaymentStatus: "success",
          referralProcessedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.set(referrerRef, {
          successfulReferrals: next,
          referralTotalEarned: Math.floor(next / STEP) * REWARD,
          referralRewardUnlocked: Math.floor(next / STEP) > 0,
          referralUpdatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        counted += 1;
      });
    }

    const finalSnap = await referrerRef.get();
    const finalData = finalSnap.data() || {};
    const successful = Number(finalData.successfulReferrals || 0);
    return NextResponse.json({ success: true, counted, successfulReferrals: successful, totalEarned: Math.floor(successful / STEP) * REWARD });
  } catch (error: any) {
    const code = error?.message === "UNAUTHORIZED" ? 401 : 500;
    console.error("Referral reconcile error:", error);
    return NextResponse.json({ success: false, error: code === 401 ? "Unauthorized." : "Unable to reconcile referrals." }, { status: code });
  }
}
