"use client";

import { useEffect, useRef, useState } from "react";

/*
|--------------------------------------------------------------------------
| RAZORPAY PAYMENT BUTTON
|--------------------------------------------------------------------------
|
| Renders the hosted Razorpay Payment Button:
|
|   <form>
|     <script src=".../payment-button.js"
|             data-payment_button_id="pl_XXXX" async></script>
|   </form>
|
| Two things make this awkward in React, which is why it lives in its own
| component:
|
|   1. React does not execute a <script> tag written in JSX, so the tag
|      has to be created with document.createElement and appended to a
|      real DOM node.
|   2. Razorpay's script replaces itself with a button inside its parent
|      form. On a re-render or route change the leftover markup has to be
|      cleared, otherwise the button appears two or three times.
|
| This component is purely a payment entry point. It receives no success
| callback, because the hosted button does not provide one — the payment
| is confirmed server-side by the Razorpay webhook. The parent waits for
| that by watching the student document.
|
*/

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/payment-button.js";

interface RazorpayPaymentButtonProps {
  /** Payment Button id, e.g. "pl_XXXXXXXXXXXX". */
  paymentButtonId: string;
  /** Shown while Razorpay's script is still loading. */
  loadingLabel?: string;
}

export default function RazorpayPaymentButton({
  paymentButtonId,
  loadingLabel = "Loading secure payment…",
}: RazorpayPaymentButtonProps) {
  const formRef = useRef<HTMLFormElement | null>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const form = formRef.current;

    if (!form || !paymentButtonId) return;

    setReady(false);
    setFailed(false);

    /*
     * Clear anything a previous mount left behind so the button is never
     * rendered twice.
     */
    form.innerHTML = "";

    const script = document.createElement("script");

    script.src = SCRIPT_SRC;
    script.async = true;
    script.dataset.payment_button_id = paymentButtonId;

    script.onload = () => setReady(true);
    script.onerror = () => setFailed(true);

    form.appendChild(script);

    return () => {
      /*
       * Razorpay injects its button as a sibling of the script inside
       * this form, so emptying the form removes both.
       */
      form.innerHTML = "";
    };
  }, [paymentButtonId]);

  if (!paymentButtonId) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-200">
        Online payment is not configured yet. Please contact SBC support.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/*
        Razorpay requires its script to sit inside a form element.
        onSubmit is blocked because the hosted button manages its own
        flow and a stray submit would reload the page mid-payment.
      */}
      <form
        ref={formRef}
        onSubmit={(event) => event.preventDefault()}
        className="flex min-h-[48px] items-center justify-center"
      />

      {!ready && !failed ? (
        <p className="text-center text-xs text-white/40">{loadingLabel}</p>
      ) : null}

      {failed ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-200">
          Could not load the secure payment button. Check your internet
          connection and refresh the page.
        </div>
      ) : null}
    </div>
  );
}
