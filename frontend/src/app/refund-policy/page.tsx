import Link from "next/link";

export default function RefundPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 text-slate-700">
      <Link href="/" className="text-blue-700 underline">← SBC Home</Link>
      <h1 className="mt-6 text-3xl font-bold text-slate-900">Refund &amp; Cancellation Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: October 10, 2026</p>

      <div className="mt-8 space-y-6 leading-7">
        <section>
          <h2 className="text-xl font-semibold text-slate-900">1. Membership Fee</h2>
          <p>The SBC membership fee is ₹199, excluding any additional charge disclosed at checkout. Please check the total amount before confirming payment.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">2. Failed Activation</h2>
          <p>If your payment is successful but your membership is not activated, contact us with the transaction reference, payment date and registered mobile number. We will check the payment status and investigate the activation issue.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">3. Incorrect or Duplicate Payments</h2>
          <p>Incorrect, duplicate or otherwise disputed payments will be reviewed individually using available transaction records. If a refund is approved, it will be initiated through the appropriate payment channel where possible. The time taken for the amount to appear in your account may depend on the payment provider and your bank.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">4. How to Request a Review</h2>
          <p>Contact our support team with your name, registered mobile number, transaction reference, payment date and a brief description of the issue. Do not send your OTP, UPI PIN, card PIN or password.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">5. Review and Applicable Rights</h2>
          <p>Each request will be assessed based on the transaction and circumstances. This review process does not remove any refund, cancellation or consumer rights available under applicable law. Where a refund is due, we will process it in accordance with applicable requirements.</p>
        </section>
        <p>For help, visit <Link href="/contact" className="text-blue-700 underline">Contact Us</Link>. For general membership conditions, see our <Link href="/terms" className="text-blue-700 underline">Terms &amp; Conditions</Link>.</p>
      </div>
    </main>
  );
}
