import Link from "next/link";

const sections = [
  {
    title: "Membership Fee",
    content:
      "The SBC membership fee is ₹199, excluding any additional charge disclosed at checkout. Please check the total amount before confirming payment.",
  },
  {
    title: "Failed Activation",
    content:
      "If your payment is successful but your membership is not activated, contact us with the transaction reference, payment date and registered mobile number. We will check the payment status and investigate the activation issue.",
  },
  {
    title: "Incorrect or Duplicate Payments",
    content:
      "Incorrect, duplicate or otherwise disputed payments will be reviewed individually using available transaction records. If a refund is approved, it will be initiated through the appropriate payment channel where possible. The time taken for the amount to appear in your account may depend on the payment provider and your bank.",
  },
  {
    title: "How to Request a Review",
    content:
      "Contact our support team with your name, registered mobile number, transaction reference, payment date and a brief description of the issue. Do not send your OTP, UPI PIN, card PIN or password.",
  },
  {
    title: "Review and Applicable Rights",
    content:
      "Each request will be assessed based on the transaction and circumstances. This review process does not remove any refund, cancellation or consumer rights available under applicable law. Where a refund is due, we will process it in accordance with applicable requirements.",
  },
];

export default function RefundPolicyPage() {
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
            Refund &amp; Cancellation Policy
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Last updated: October 10, 2026
          </p>
        </header>

        <div className="space-y-4 bg-slate-50 p-4 sm:space-y-5 sm:p-8">
          <p className="text-sm leading-6 text-slate-600">
            This policy explains how SBC reviews membership payment and refund
            requests.
          </p>

          {sections.map((section, index) => (
            <section
              key={section.title}
              className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                    {section.title}
                  </h2>
                  <p className="mt-2 break-words text-sm leading-7 text-slate-600">
                    {section.content}
                  </p>
                </div>
              </div>
            </section>
          ))}

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              Need Help?
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              For assistance, visit our{" "}
              <Link
                href="/contact"
                className="font-semibold text-blue-700 underline underline-offset-4"
              >
                Contact Us
              </Link>{" "}
              page. For general membership conditions, see our{" "}
              <Link
                href="/terms"
                className="font-semibold text-blue-700 underline underline-offset-4"
              >
                Terms &amp; Conditions
              </Link>
              .
            </p>
          </section>
        </div>

        <footer className="border-t border-slate-200 bg-slate-200 px-4 py-4 text-center text-xs leading-5 text-slate-600">
          © 2026 Student Benefit Card (SBC). All rights reserved.
        </footer>
      </div>
    </main>
  );
}
