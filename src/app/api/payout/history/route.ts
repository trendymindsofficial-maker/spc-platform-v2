import { NextResponse } from "next/server";
import { getAdminApp, requireUser } from "@/lib/admin-server";
import { getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";
const STEP = 10;
const REWARD = 250;

export async function GET(request: Request) {
  try {
    const decoded = await requireUser(request);
    const db = getFirestore(getAdminApp());
    const studentSnap = await db.collection("students").doc(decoded.uid).get();
    if (!studentSnap.exists) return NextResponse.json({ success: false, error: "Student not found." }, { status: 404 });
    const data = studentSnap.data() || {};
    const successful = Number(data.successfulReferrals || 0);
    const totalEarned = Math.floor(successful / STEP) * REWARD;
    const paid = Number(data.referralPaidAmount || 0);
    const pending = Number(data.referralPendingPayoutAmount || 0);
    const available = Math.max(totalEarned - paid - pending, 0);

    const snap = await db.collection("payoutRequests").where("uid", "==", decoded.uid).get();
    const history = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
      const at = a.requestedAt?.toMillis?.() || 0;
      const bt = b.requestedAt?.toMillis?.() || 0;
      return bt - at;
    });

    return NextResponse.json({ success: true, wallet: { successfulReferrals: successful, totalEarned, paidAmount: paid, pendingPayout: pending, available }, history });
  } catch (error: any) {
    const code = error?.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ success: false, error: code === 401 ? "Unauthorized." : "Unable to load payout history." }, { status: code });
  }
}
