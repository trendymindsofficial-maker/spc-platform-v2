import Link from "next/link";

const sections = [
  {
    title: "Information We Collect",
    content:
      "Depending on how you use SBC, we may collect information you provide, such as your name, mobile number, email address, student or membership details, and information related to offers and redemptions. Payment processing may also generate transaction references and payment status information.",
  },
  {
    title: "How We Use Information",
    content:
      "We use information to create and manage accounts, activate memberships, process and verify transactions, support offer redemption, prevent misuse, respond to queries and improve our services.",
  },
  {
    title: "Payments and Service Providers",
    content:
      "Payments are handled through the payment service provider presented during checkout. We may receive transaction status and reference details needed to confirm your payment. Do not send us your OTP, PIN or payment password.",
  },
  {
    title: "Sharing of Information",
    content:
      "Information may be shared with service providers who help operate SBC and, where necessary, with participating businesses to validate eligible memberships or redemptions. We may also disclose information where required by law. We do not describe information as anonymous if it can identify you.",
  },
  {
    title: "Security and Retention",
    content:
      "We take reasonable steps to protect information and retain it for as long as needed for the purposes described in this policy, legal obligations, dispute resolution and legitimate business records. No online system can be guaranteed completely secure.",
  },
  {
    title: "Your Requests",
    content:
      "You may contact us to request access to, correction of, or deletion of personal information, subject to applicable law and records we are required to retain.",
  },
];

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Last updated: October 10, 2026
          </p>
        </header>

        <div className="space-y-4 bg-slate-50 p-4 sm:space-y-5 sm:p-8">
          <p className="text-sm leading-6 text-slate-600">
            This policy explains how Student Benefit Card handles information
            when you use our platform and services.
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
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
                7
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  Contact
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  For privacy questions or requests, use the contact details on
                  our{" "}
                  <Link
                    href="/contact"
                    className="font-semibold text-blue-700 underline underline-offset-4"
                  >
                    Contact Us
                  </Link>{" "}
                  page.
                </p>
              </div>
            </div>
          </section>
        </div>

        <footer className="border-t border-slate-200 bg-slate-200 px-4 py-4 text-center text-xs leading-5 text-slate-600">
          © 2026 Student Benefit Card (SBC). All rights reserved.
        </footer>
      </div>
    </main>
  );
}
