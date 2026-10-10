import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 text-slate-700">
      <Link href="/" className="text-blue-700 underline">← SBC Home</Link>
      <h1 className="mt-6 text-3xl font-bold text-slate-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: October 10, 2026</p>

      <div className="mt-8 space-y-6 leading-7">
        <section>
          <h2 className="text-xl font-semibold text-slate-900">1. Information We Collect</h2>
          <p>Depending on how you use SBC, we may collect information you provide, such as your name, mobile number, email address, student or membership details, and information related to offers and redemptions. Payment processing may also generate transaction references and payment status information.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">2. How We Use Information</h2>
          <p>We use information to create and manage accounts, activate memberships, process and verify transactions, support offer redemption, prevent misuse, respond to queries and improve our services.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">3. Payments and Service Providers</h2>
          <p>Payments are handled through the payment service provider presented during checkout. We may receive transaction status and reference details needed to confirm your payment. Do not send us your OTP, PIN or payment password.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">4. Sharing of Information</h2>
          <p>Information may be shared with service providers who help operate SBC and, where necessary, with participating businesses to validate eligible memberships or redemptions. We may also disclose information where required by law. We do not describe information as anonymous if it can identify you.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">5. Security and Retention</h2>
          <p>We take reasonable steps to protect information and retain it for as long as needed for the purposes described in this policy, legal obligations, dispute resolution and legitimate business records. No online system can be guaranteed completely secure.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">6. Your Requests</h2>
          <p>You may contact us to request access to, correction of, or deletion of personal information, subject to applicable law and records we are required to retain.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">7. Contact</h2>
          <p>For privacy questions or requests, use the contact details on our <Link href="/contact" className="text-blue-700 underline">Contact Us</Link> page.</p>
        </section>
      </div>
    </main>
  );
}
