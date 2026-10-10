import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 text-slate-700">
      <Link href="/" className="text-blue-700 underline">← SBC Home</Link>
      <h1 className="mt-6 text-3xl font-bold text-slate-900">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: October 10, 2026</p>

      <div className="mt-8 space-y-6 leading-7">
        <section>
          <h2 className="text-xl font-semibold text-slate-900">1. About SBC</h2>
          <p>Student Benefit Card (SBC) is a student membership platform operated under TrendyMinds, a proprietorship business. SBC helps members access eligible offers provided by participating partner businesses.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">2. Membership Fee</h2>
          <p>The SBC membership fee is ₹199. Any applicable convenience fee or other charge will be displayed before payment. Please review the total payable amount before completing your transaction.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">3. Membership Activation</h2>
          <p>Membership is intended to activate after successful payment confirmation. If payment is debited but membership is not activated, contact our support team with your transaction details. Do not share your OTP, password or complete payment credentials.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">4. Partner Offers</h2>
          <p>Offers are provided by participating businesses and may have individual conditions, validity periods, exclusions or redemption limits. Check the offer details before visiting or redeeming. SBC cannot guarantee that every offer will remain available indefinitely.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">5. Responsible Use</h2>
          <p>Members must provide accurate registration details and use their membership personally and lawfully. Fraud, misuse or attempts to manipulate offer redemptions may lead to account review, subject to applicable law.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">6. Payments and Refunds</h2>
          <p>Payment disputes, incorrect payments and cases where membership activation fails will be reviewed individually. See our <Link className="text-blue-700 underline" href="/refund-policy">Refund Policy</Link> for details. Nothing in these terms limits rights available to consumers under applicable law.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">7. Contact</h2>
          <p>For membership, payment or offer-related assistance, visit our <Link className="text-blue-700 underline" href="/contact">Contact Us</Link> page.</p>
        </section>
      </div>
    </main>
  );
}
