
"use client";

import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";

interface MembershipPaymentProps {
  uid: string;
  registeredMobile?: string;
  baselineExpiryMs?: number | null;
  mode: "registration" | "renewal";
  onActivated: () => void;
}

export default function MembershipPayment({
  uid,
  baselineExpiryMs = null,
  mode,
  onActivated,
}: MembershipPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");
  const [activated, setActivated] = useState(false);

  const onActivatedRef = useRef(onActivated);
  const activatedRef = useRef(false);

  useEffect(() => {
    onActivatedRef.current = onActivated;
  }, [onActivated]);

  useEffect(() => {
    if (!uid) return;

    const unsubscribe = onSnapshot(
      doc(db, "students", uid),
      (snapshot) => {
        if (!snapshot.exists() || activatedRef.current) return;

        const student = snapshot.data();
        const paid =
          String(student.paymentStatus || "").toLowerCase() === "paid";

        const expiryMs =
          typeof student.membershipExpiryDate?.toMillis === "function"
            ? student.membershipExpiryDate.toMillis()
            : null;

        const isActivated =
          mode === "renewal"
            ? !!expiryMs &&
              (baselineExpiryMs === null ||
                expiryMs > baselineExpiryMs)
            : paid;

        if (isActivated) {
          activatedRef.current = true;
          setActivated(true);
          setWaiting(false);
          onActivatedRef.current();
        }
      },
      (snapshotError) => {
        console.error("Membership status listener failed:", snapshotError);
      }
    );

    return () => unsubscribe();
  }, [uid, mode, baselineExpiryMs]);

  async function startPayment() {
    setError("");

    try {
      setLoading(true);

      const user = auth.currentUser;

      if (!user || user.uid !== uid) {
        throw new Error(
          "Your login session is unavailable. Please sign in again."
        );
      }

      const idToken = await user.getIdToken();

      const response = await apiFetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ mode }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success || !data.redirectUrl) {
        throw new Error(
          data.message ||
            data.error ||
            "Unable to start PhonePe checkout."
        );
      }

      setWaiting(true);
      window.location.assign(data.redirectUrl);
    } catch (paymentError) {
      console.error("PhonePe checkout error:", paymentError);

      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Unable to start payment. Please try again."
      );

      setWaiting(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold">
              {mode === "renewal"
                ? "Renew SBC membership"
                : "Complete your SBC membership"}
            </p>
            <p className="mt-1 text-sm text-white/55">
              One year of SBC student benefits.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-right">
            <p className="text-lg font-bold">₹199</p>
            <p className="text-xs text-white/45">1 year</p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-white/60">
          Complete your secure payment through PhonePe. Your membership is
          activated only after the SBC server verifies the payment.
        </p>
      </div>

      {activated ? (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          Membership activation confirmed.
        </div>
      ) : (
        <button
          type="button"
          onClick={startPayment}
          disabled={loading || waiting}
          className="w-full rounded-xl bg-white px-5 py-4 text-sm font-bold text-slate-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Connecting to PhonePe…"
            : waiting
              ? "Opening secure checkout…"
              : "Pay ₹199 with PhonePe"}
        </button>
      )}

      {waiting && !activated ? (
        <p className="text-center text-sm leading-6 text-white/60">
          Opening PhonePe checkout. Please do not close the page until it opens.
        </p>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}
