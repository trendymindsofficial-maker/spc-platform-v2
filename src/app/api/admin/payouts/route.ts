import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminApp, requireAdmin } from "@/lib/admin-server";
import { getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { db } = await requireAdmin(request);
    const snap = await db.collection("payoutRequests").get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.requestedAt?.toMillis?.() || 0) - (a.requestedAt?.toMillis?.() || 0));
    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    const code = error?.message === "UNAUTHORIZED" ? 401 : error?.message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ success: false, error: code === 403 ? "Admin access denied." : code === 401 ? "Unauthorized." : "Unable to load payouts." }, { status: code });
  }
}

export async function PATCH(request: Request) {
  try {
    const { decoded, db } = await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const action = String(body?.action || "").toLowerCase();
    const utr = String(body?.utr || "").trim();
    const note = String(body?.note || "").trim();
    if (!id || !['approve','reject'].includes(action)) return NextResponse.json({ success: false, error: "Invalid payout action." }, { status: 400 });

    const payoutRef = db.collection("payoutRequests").doc(id);
    const studentRefForUpdate = { ref: null as any };
    await db.runTransaction(async (tx) => {
      const payoutSnap = await tx.get(payoutRef);
      if (!payoutSnap.exists) throw new Error("Payout not found.");
      const payout = payoutSnap.data() || {};
      if (String(payout.status || "") !== "pending") throw new Error("This payout is already processed.");
      const uid = String(payout.uid || "");
      const amount = Number(payout.amount || 0);
      const studentRef = db.collection("students").doc(uid);
      studentRefForUpdate.ref = studentRef;
      const studentSnap = await tx.get(studentRef);
      const student = studentSnap.data() || {};
      const pending = Number(student.referralPendingPayoutAmount || 0);

      if (action === 'approve') {
        tx.update(payoutRef, { status: "paid", utr, adminNote: note, approvedBy: decoded.uid, paidAt: FieldValue.serverTimestamp() });
        tx.set(studentRef, { referralPendingPayoutAmount: Math.max(pending - amount, 0), referralPaidAmount: Number(student.referralPaidAmount || 0) + amount, referralUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
      } else {
        tx.update(payoutRef, { status: "rejected", adminNote: note, rejectedBy: decoded.uid, rejectedAt: FieldValue.serverTimestamp() });
        tx.set(studentRef, { referralPendingPayoutAmount: Math.max(pending - amount, 0), referralUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const msg = String(error?.message || "");
    const code = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ success: false, error: code === 403 ? "Admin access denied." : code === 401 ? "Unauthorized." : msg || "Unable to update payout." }, { status: code });
  }
}
