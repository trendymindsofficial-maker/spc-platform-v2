import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 text-slate-700">
      <Link href="/" className="text-blue-700 underline">← SBC Home</Link>
      <h1 className="mt-6 text-3xl font-bold text-slate-900">Contact Us</h1>
      <p className="mt-3 leading-7">Contact us for questions about SBC membership, payments, activation, partner offers, privacy or refund requests.</p>

      <section className="mt-8 rounded-2xl border border-slate-200 p-6 leading-8">
        <h2 className="text-xl font-semibold text-slate-900">Business Information</h2>
        <p><strong>Brand:</strong> Student Benefit Card (SBC)</p>
        <p><strong>Legal Name:</strong> TIMIRI MALLISWARI</p>
        <p><strong>Trade Name:</strong> TRENDYMİNDS</p>
        <p><strong>Business Constitution:</strong> Proprietorship</p>
        <p><strong>Business Address:</strong> D.No. 26/3-A/599, Main Road, Nellore, Andhra Pradesh - 524004</p>

        <h2 className="mt-6 text-xl font-semibold text-slate-900">Customer Support</h2>
        <p><strong>Email:</strong> trendymindsofficial@gmail.com</p>
        <p><strong>Phone:</strong> 7989197127</p>
        <p className="mt-3 text-sm">When contacting us about a payment, include the transaction reference and payment date. Never share an OTP, PIN or password.</p>
      </section>

      <nav className="mt-8 flex flex-wrap gap-4 text-blue-700 underline">
        <Link href="/terms">Terms &amp; Conditions</Link>
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/refund-policy">Refund Policy</Link>
      </nav>
    </main>
  );
}
