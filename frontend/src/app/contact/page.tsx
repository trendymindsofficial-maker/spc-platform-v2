import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="bg-[#0b1729] px-5 py-6 text-white sm:px-8 sm:py-8">
          <Link
            href="/"
            className="inline-flex min-h-9 items-center rounded-full border border-white/20 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
          >
            ← Back to SBC Home
          </Link>

          <div className="mt-6 flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-black text-[#0b1729]">
              SBC
            </span>
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-slate-300">
                STUDENT BENEFIT CARD
              </p>
              <p className="mt-1 text-xs text-slate-400">
                More Benefits. More Savings.
              </p>
            </div>
          </div>

          <h1 className="mt-6 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Contact Us
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Contact us for questions about SBC membership, payments, activation,
            partner offers, privacy or refund requests.
          </p>
        </header>

        <div className="space-y-4 bg-slate-50 p-4 sm:space-y-5 sm:p-8">
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01M16 13v.01M16 16v.01M16 19v.01" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  Business Information
                </h2>
                <dl className="mt-4 space-y-3 break-words text-sm">
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Brand</dt>
                    <dd className="mt-1 font-semibold text-slate-800">Student Benefit Card (SBC)</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Legal Name</dt>
                    <dd className="mt-1 font-semibold text-slate-800">TIMIRI MALLISWARI</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Trade Name</dt>
                    <dd className="mt-1 font-semibold text-slate-800">TRENDYMINDS</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Business Constitution</dt>
                    <dd className="mt-1 text-slate-700">Proprietorship</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Business Address</dt>
                    <dd className="mt-1 leading-6 text-slate-700">
                      D.No. 26/3-A/599, Main Road, Nellore, Andhra Pradesh - 524004
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  Customer Support
                </h2>
                <div className="mt-4 space-y-4 text-sm">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Email</p>
                    <a
                      href="mailto:trendymindsofficial@gmail.com"
                      className="mt-1 inline-block break-all font-semibold text-blue-700 underline underline-offset-4"
                    >
                      trendymindsofficial@gmail.com
                    </a>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Phone</p>
                    <a
                      href="tel:7989197127"
                      className="mt-1 inline-block font-semibold text-blue-700 underline underline-offset-4"
                    >
                      7989197127
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-600">
              When contacting us about a payment, include the transaction
              reference and payment date. Never share an OTP, PIN or password.
            </p>
          </section>

          <nav className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-sm font-bold text-slate-900">Legal &amp; Policies</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/terms" className="inline-flex min-h-9 items-center rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                Terms &amp; Conditions
              </Link>
              <Link href="/privacy" className="inline-flex min-h-9 items-center rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                Privacy Policy
              </Link>
              <Link href="/refund-policy" className="inline-flex min-h-9 items-center rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                Refund Policy
              </Link>
            </div>
          </nav>
        </div>

        <footer className="border-t border-slate-200 bg-slate-200 px-4 py-4 text-center text-xs leading-5 text-slate-600">
          © 2026 Student Benefit Card (SBC). All rights reserved.
        </footer>
      </div>
    </main>
  );
}
