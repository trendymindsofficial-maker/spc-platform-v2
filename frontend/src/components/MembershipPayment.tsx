"use client";

import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";
import RazorpayPaymentButton from "@/components/RazorpayPaymentButton";

/*
|--------------------------------------------------------------------------
| MEMBERSHIP PAYMENT
|--------------------------------------------------------------------------
|
| Collects the ₹199 SBC membership fee with the hosted Razorpay Payment
| Button, then waits for the server to confirm it.
|
| Why the waiting step exists:
|
| The hosted button hands the customer over to Razorpay and gives the
| browser no success callback and no payment signature. Nothing the client
| could report back would be trustworthy anyway. So the backend is told
| by Razorpay directly, over a signature-verified webhook, and it flips
| the student document to active.
|
| This component therefore does not "confirm" anything itself. It listens
| to the student document and reacts when the server has decided. That
| also means a student who closes the tab mid-payment still gets their
| membership — the webhook does not depend on the browser.
|
| The claim box is the fallback for the one gap in the design: the webhook
| matches a payment to a student by the phone number typed on Razorpay's
| checkout. Pay with a different number and the payment arrives
| "unmatched", and the student can attach it here using the payment id
| from their receipt.
|
*/

const BUTTON_ID_FROM_ENV =
  process.env.NEXT_PUBLIC_RAZORPAY_PAYMENT_BUTTON_ID || "";

/** How long to wait before offering the manual claim box. */
const CLAIM_HINT_DELAY_MS = 45_000;

interface MembershipPaymentProps {
  /** Student uid whose document is watched for activation. */
  uid: string;
  /** Mobile the student registered with, shown as a payment instruction. */
  registeredMobile?: string;
  /**
   * Renewal only: expiry in ms at the time this screen opened. Activation
   * is detected when the stored expiry moves past it.
   */
  baselineExpiryMs?: number | null;
  mode: "registration" | "renewal";
  onActivated: () => void;
}

export default function MembershipPayment({
  uid,
  registeredMobile,
  baselineExpiryMs = null,
  mode,
  onActivated,
}: MembershipPaymentProps) {
  const [buttonId, setButtonId] = useState(BUTTON_ID_FROM_ENV);
  const [configLoading, setConfigLoading] = useState(!BUTTON_ID_FROM_ENV);

  const [waiting, setWaiting] = useState(false);
  const [showClaim, setShowClaim] = useState(false);

  const [claimId, setClaimId] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState("");

  /*
   * onActivated is called from inside a snapshot listener. Keeping it in
   * a ref means the listener is not torn down and recreated every time
   * the parent re-renders with a new closure.
   */
  const onActivatedRef = useRef(onActivated);

  useEffect(() => {
    onActivatedRef.current = onActivated;
  }, [onActivated]);

  const activatedRef = useRef(false);

  /*
   * The button id lives in the backend env. Using it from
   * NEXT_PUBLIC_RAZORPAY_PAYMENT_BUTTON_ID avoids a round trip, but
   * falling back to the API keeps a single source of truth.
   */
  useEffect(() => {
    if (BUTTON_ID_FROM_ENV) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await apiFetch("/api/payment/config");
        const data = await response.json().catch(() => ({}));

        if (!cancelled && data?.paymentButtonId) {
          setButtonId(String(data.paymentButtonId));
        }
      } catch (error) {
        console.error("Unable to load payment configuration:", error);
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Watch for the server granting membership.
   */
  useEffect(() => {
    if (!uid) return;

    const unsubscribe = onSnapshot(
      doc(db, "students", uid),
      (snapshot) => {
        if (!snapshot.exists() || activatedRef.current) return;

        const data = snapshot.data() || {};

        const paid =
          String(data.paymentStatus || "").toLowerCase() === "paid";

        const expiryMs =
          typeof data.membershipExpiryDate?.toMillis === "function"
            ? data.membershipExpiryDate.toMillis()
            : null;

        /*
         * A renewal is only done when the expiry actually moved forward.
         * An already-paid student opening the renew page must not be
         * mistaken for a completed renewal.
         */
        const activated =
          mode === "renewal"
            ? !!expiryMs &&
              (baselineExpiryMs === null || expiryMs > baselineExpiryMs)
            : paid;

        if (activated) {
          activatedRef.current = true;
          onActivatedRef.current();
        }
      },
      (error) => {
        console.error("Membership watcher error:", error);
      }
    );

    return () => unsubscribe();
  }, [uid, mode, baselineExpiryMs]);

  /*
   * Offer the manual claim path only after a realistic wait, so it does
   * not distract from the normal flow.
   */
  useEffect(() => {
    if (!waiting) return;

    const timer = setTimeout(() => setShowClaim(true), CLAIM_HINT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [waiting]);

  const submitClaim = async () => {
    const paymentId = claimId.trim();

    if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
      setClaimError(
        "Enter the Payment ID from your Razorpay receipt. It starts with pay_"
      );
      return;
    }

    try {
      setClaimLoading(true);
      setClaimError("");

      const user = auth.currentUser;

      if (!user) {
        throw new Error("Your session expired. Please sign in again.");
      }

      const idToken = await user.getIdToken();

      const response = await apiFetch("/api/payment/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ paymentId }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Unable to link this payment.");
      }

      /*
       * The snapshot listener picks the activation up, but calling
       * through directly avoids waiting on a round trip.
       */
      if (!activatedRef.current) {
        activatedRef.current = true;
        onActivatedRef.current();
      }
    } catch (error) {
      console.error("Payment claim error:", error);

      setClaimError(
        error instanceof Error
          ? error.message
          : "Unable to link this payment."
      );
    } finally {
      setClaimLoading(false);
    }
  };

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

        {registeredMobile ? (
          <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
            <span className="font-semibold">Important:</span> pay using your
            registered mobile number{" "}
            <span className="font-semibold">{registeredMobile}</span>. Your
            membership is linked to your SBC account using this number.
          </div>
        ) : null}
      </div>

      {configLoading ? (
        <p className="text-center text-xs text-white/40">
          Loading secure payment…
        </p>
      ) : (
        <div onClickCapture={() => setWaiting(true)}>
          <RazorpayPaymentButton paymentButtonId={buttonId} />
        </div>
      )}

      {waiting ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <div className="text-sm leading-6 text-white/70">
              <p className="font-semibold text-white">
                Waiting for payment confirmation…
              </p>
              <p className="mt-1">
                This page updates by itself the moment your payment is
                confirmed. You can safely keep it open.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {showClaim ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold">
            Already paid but nothing happened?
          </p>
          <p className="mt-1 text-sm leading-6 text-white/55">
            This happens if you paid using a different mobile number. Enter
            the Payment ID from your Razorpay receipt (or the confirmation
            SMS or email) to link it to your account.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={claimId}
              onChange={(event) => setClaimId(event.target.value)}
              placeholder="pay_XXXXXXXXXXXXXX"
              aria-label="Razorpay Payment ID"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/30"
            />

            <button
              type="button"
              onClick={submitClaim}
              disabled={claimLoading}
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {claimLoading ? "Linking…" : "Link payment"}
            </button>
          </div>

          {claimError ? (
            <p className="mt-3 text-sm leading-6 text-red-300">{claimError}</p>
          ) : null}
        </div>
      ) : null}

      <p className="text-center text-xs leading-5 text-white/35">
        Payments are processed by Razorpay. Your membership is activated by
        the SBC server only after Razorpay confirms the payment, so your
        benefits and dates are never set from your browser.
      </p>
    </div>
  );
}
