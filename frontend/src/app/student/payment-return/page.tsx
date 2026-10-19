
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";

type VerifyResult = {
  success?: boolean;
  pending?: boolean;
  verified?: boolean;
  message?: string;
  error?: string;
};

function PaymentReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const merchantOrderId = searchParams.get("merchantOrderId") || "";

  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState(
    "Verifying your PhonePe payment…"
  );
  const [paid, setPaid] = useState(false);

  const verifyPayment = useCallback(async () => {
    if (!merchantOrderId) {
      setChecking(false);
      setMessage(
        "Payment reference is missing. Please contact SBC support."
      );
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setChecking(false);
      setMessage(
        "Please sign in to the same SBC account and check your payment again."
      );
      return;
    }

    setChecking(true);
    setMessage("Verifying your payment securely…");

    try {
      const idToken = await user.getIdToken();

      const response = await apiFetch("/api/payment/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ merchantOrderId }),
      });

      const data = (await response.json().catch(() => ({}))) as VerifyResult;

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Unable to verify payment."
        );
      }

      if (data.success && data.verified) {
        setPaid(true);
        setMessage(
          "Payment verified successfully. Your SBC membership has been activated."
        );
      } else {
        setPaid(false);
        setMessage(
          data.message ||
            "Payment is not confirmed yet. Please wait and check again."
        );
      }
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Unable to verify payment. Please try again."
      );
    } finally {
      setChecking(false);
    }
  }, [merchantOrderId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setChecking(false);
        setMessage(
          "Please sign in to the same SBC account to verify your payment."
        );
        return;
      }

      void verifyPayment();
    });

    return () => unsubscribe();
  }, [verifyPayment]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
        <h1 className="text-xl font-bold">
          {paid ? "Payment successful" : "PhonePe payment status"}
        </h1>

        <p className="mt-4 text-sm leading-7 text-white/70">
          {message}
        </p>

        {checking && (
          <div className="mx-auto mt-6 h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        )}

        {!checking && !paid && (
          <button
            type="button"
            onClick={() => void verifyPayment()}
            className="mt-6 w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-white/90"
          >
            Check payment again
          </button>
        )}

        {paid && (
          <button
            type="button"
            onClick={() => router.replace("/student/dashboard")}
            className="mt-6 w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-white/90"
          >
            Go to SBC dashboard
          </button>
        )}

        {!checking && !paid && (
          <button
            type="button"
            onClick={() => router.replace("/student/login")}
            className="mt-3 w-full rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white"
          >
            Go to student login
          </button>
        )}
      </section>
    </main>
  );
}

export default function StudentPaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[70vh] items-center justify-center">
          Verifying payment page…
        </main>
      }
    >
      <PaymentReturnContent />
    </Suspense>
  );
}
