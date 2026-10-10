import Link from "next/link";

const sections = [
  {
    title: "About SBC",
    content:
      "Student Benefit Card (SBC) is a student membership platform operated under TrendyMinds, a proprietorship business. SBC helps members access eligible offers provided by participating partner businesses.",
  },
  {
    title: "Membership Fee",
    content:
      "The SBC membership fee is ₹199. Any applicable convenience fee or other charge will be displayed before payment. Please review the total payable amount before completing your transaction.",
  },
  {
    title: "Membership Activation",
    content:
      "Membership is intended to activate after successful payment confirmation. If payment is debited but membership is not activated, contact our support team with your transaction details. Do not share your OTP, password or complete payment credentials.",
  },
  {
    title: "Partner Offers",
    content:
      "Offers are provided by participating businesses and may have individual conditions, validity periods, exclusions or redemption limits. Check the offer details before visiting or redeeming. SBC cannot guarantee that every offer will remain available indefinitely.",
  },
  {
    title: "Responsible Use",
    content:
      "Members must provide accurate registration details and use their membership personally and lawfully. Fraud, misuse or attempts to manipulate offer redemptions may lead to account review, subject to applicable law.",
  },
  {
    title: "Payments and Refunds",
    content:
      "Payment disputes, incorrect payments and cases where membership activation fails will be reviewed individually. See our Refund Policy for details. Nothing in these terms limits rights available to consumers under applicable law.",
  },
];

export default function TermsPage() {
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
            Terms &amp; Conditions
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Last updated: October 10, 2026
          </p>
        </header>

        <div className="space-y-4 bg-slate-50 p-4 sm:space-y-5 sm:p-8">
          <p className="text-sm leading-6 text-slate-600">
            Please read these terms carefully before purchasing or using your
            Student Benefit Card membership.
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
                  {section.title === "Payments and Refunds" && (
                    <Link
                      href="/refund-policy"
                      className="mt-3 inline-block text-sm font-semibold text-blue-700 underline underline-offset-4"
                    >
                      Read Refund Policy →
                    </Link>
                  )}
                </div>
              </div>
            </section>
          ))}

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
                7
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  Contact
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  For membership, payment or offer-related assistance, visit
                  our{" "}
                  <Link
                    href="/contact"
                    className="font-semibold text-blue-700 underline underline-offset-4"
                  >
                    Contact Us
                  </Link>{" "}
                  page. Please do not share OTPs, PINs or passwords.
                </p>
              </div>
            </div>
          </section>

          <nav className="flex flex-wrap gap-2 border-t border-slate-200 pt-5">
            <Link href="/privacy" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700">
              Privacy Policy
            </Link>
            <Link href="/refund-policy" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700">
              Refund Policy
            </Link>
            <Link href="/contact" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700">
              Contact Us
            </Link>
          </nav>
        </div>

        <footer className="border-t border-slate-200 bg-slate-200 px-4 py-4 text-center text-xs leading-5 text-slate-600">
          © 2026 Student Benefit Card (SBC). All rights reserved.
        </footer>
      </div>
    </main>
  );
}
