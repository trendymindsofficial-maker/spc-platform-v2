import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminApp, requireUser } from "@/lib/admin-server";
import { getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";
const STEP = 10;
const REWARD = 250;
const MIN = 250;

export async function POST(request: Request) {
  try {
    const decoded = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const amount = Math.floor(Number(body?.amount || 0));
    const method = String(body?.method || "").toLowerCase();
    const upiId = String(body?.upiId || "").trim();
    const accountName = String(body?.accountName || "").trim();
    const accountNumber = String(body?.accountNumber || "").trim();
    const ifsc = String(body?.ifsc || "").trim().toUpperCase();

    if (!Number.isFinite(amount) || amount < MIN) return NextResponse.json({ success: false, error: `Minimum payout is ₹${MIN}.` }, { status: 400 });
    if (!['upi','bank'].includes(method)) return NextResponse.json({ success: false, error: "Choose UPI or Bank Account." }, { status: 400 });
    if (method === 'upi' && !upiId) return NextResponse.json({ success: false, error: "UPI ID is required." }, { status: 400 });
    if (method === 'bank' && (!accountName || !accountNumber || !ifsc)) return NextResponse.json({ success: false, error: "Complete bank details are required." }, { status: 400 });

    const db = getFirestore(getAdminApp());
    const studentRef = db.collection("students").doc(decoded.uid);
    const payoutRef = db.collection("payoutRequests").doc();
    let available = 0;

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(studentRef);
      if (!snap.exists) throw new Error("Student not found.");
      const data = snap.data() || {};
      const successful = Number(data.successfulReferrals || 0);
      const totalEarned = Math.floor(successful / STEP) * REWARD;
      const paid = Number(data.referralPaidAmount || 0);
      const pending = Number(data.referralPendingPayoutAmount || 0);
      available = Math.max(totalEarned - paid - pending, 0);
      if (amount > available) throw new Error(`INSUFFICIENT:${available}`);

      tx.set(payoutRef, {
        uid: decoded.uid,
        studentName: String(data.fullName || ""),
        studentMobile: String(data.mobile || ""),
        amount,
        method,
        upiId: method === 'upi' ? upiId : "",
        accountName: method === 'bank' ? accountName : "",
        accountNumber: method === 'bank' ? accountNumber : "",
        ifsc: method === 'bank' ? ifsc : "",
        status: "pending",
        requestedAt: FieldValue.serverTimestamp(),
      });

      tx.set(studentRef, {
        referralPendingPayoutAmount: pending + amount,
        referralUpdatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return NextResponse.json({ success: true, payoutRequestId: payoutRef.id, amount, availableAfterRequest: Math.max(available - amount, 0) });
  } catch (error: any) {
    const msg = String(error?.message || "");
    if (msg.startsWith("INSUFFICIENT:")) return NextResponse.json({ success: false, error: `Available payout balance is ₹${msg.split(":")[1]}.` }, { status: 400 });
    const code = msg === "UNAUTHORIZED" ? 401 : 500;
    console.error("Payout request error:", error);
    return NextResponse.json({ success: false, error: code === 401 ? "Unauthorized." : msg || "Unable to create payout request." }, { status: code });
  }
}
