
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, Timestamp } from "firebase/firestore";

import MembershipPayment from "@/components/MembershipPayment";

type StudentData = {
  fullName?: string;
  mobile?: string;
  status?: string;
  paymentStatus?: string;
  membershipStatus?: string;
  membershipStartDate?: Timestamp | Date | string | null;
  membershipExpiryDate?: Timestamp | Date | string | null;
};

function toDate(value: StudentData["membershipExpiryDate"]): Date | null {
  if (!value) return null;

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  return null;
}

function formatDate(date: Date | null) {
  if (!date) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function StudentRenewMembership() {
  const router = useRouter();

  const [uid, setUid] = useState("");
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [renewed, setRenewed] = useState(false);
  const [baselineExpiryMs, setBaselineExpiryMs] = useState<number | null>(
    null
  );
  const [membershipCurrentlyActive, setMembershipCurrentlyActive] =
    useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/student/login");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "students", user.uid));

        if (!snap.exists()) {
          setErrorMessage(
            "Student account details could not be found. Please contact SBC support."
          );
          return;
        }

        const data = snap.data() as StudentData;

        setUid(user.uid);
        setStudent(data);

        const currentExpiry = toDate(data.membershipExpiryDate);

        setBaselineExpiryMs(
          currentExpiry ? currentExpiry.getTime() : null
        );

        setMembershipCurrentlyActive(
          !!currentExpiry && currentExpiry.getTime() > Date.now()
        );
      } catch (error) {
        console.error("Unable to load student membership:", error);
        setErrorMessage(
          "Unable to load your membership details. Please try again."
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const expiryDate = useMemo(
    () => toDate(student?.membershipExpiryDate),
    [student?.membershipExpiryDate]
  );

  const status = (student?.status || "").toLowerCase();
  const paymentStatus = (student?.paymentStatus || "").toLowerCase();

  const isRegistrationPending =
    status === "pending_payment" || paymentStatus === "pending";

  const pageTitle = isRegistrationPending
    ? "Complete Registration"
    : "Renew SBC";

  const paymentDescription = isRegistrationPending
    ? "Complete your ₹199 membership payment to activate your Student Benefit Card."
    : "Continue your SBC student benefits for another year.";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-sm text-white/60">
            Loading your membership...
          </p>
        </div>
      </main>
    );
  }

  if (errorMessage && !student) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-7 shadow-2xl">
          <h1 className="text-2xl font-semibold">SBC Membership</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={() => router.replace("/student/login")}
            className="mt-6 w-full rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-white/90"
          >
            Back to Login
          </button>
        </section>
      </main>
    );
  }

  if (renewed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-md rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.07] p-7 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-2xl">
            ✓
          </div>

          <h1 className="mt-5 text-2xl font-semibold">
            {isRegistrationPending
              ? "Payment Confirmed"
              : "Membership Renewed"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/65">
            Your payment is confirmed. Your SBC membership has been
            activated or updated.
          </p>

          <button
            type="button"
            onClick={() => router.replace("/student/dashboard")}
            className="mt-6 w-full rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-white/90"
          >
            Go to Dashboard
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-5 py-10 sm:px-8">
        <section className="w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 py-7 sm:px-8">
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-6 text-sm text-white/55 transition hover:text-white"
            >
              ← Back
            </button>

            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                  Student Benefit Card
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  {pageTitle}
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-6 text-white/60">
                  {paymentDescription}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                <p className="text-xs text-white/45">
                  {isRegistrationPending ? "Membership Fee" : "Renewal Fee"}
                </p>
                <p className="mt-1 text-xl font-bold">₹199</p>
                <p className="text-xs text-white/45">1 year</p>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-6 py-7 sm:px-8">
            {isRegistrationPending ? (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] p-5">
                <p className="font-semibold text-amber-200">
                  Your registration is saved
                </p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Your previous payment did not complete. You can retry
                  the ₹199 payment below using the same account. You do
                  not need to register again.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/45">
                      Current membership
                    </p>
                    <p className="mt-1 font-semibold">
                      {membershipCurrentlyActive ? "Active" : "Expired"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      membershipCurrentlyActive
                        ? "bg-emerald-400/15 text-emerald-300"
                        : "bg-red-400/15 text-red-300"
                    }`}
                  >
                    {membershipCurrentlyActive ? "ACTIVE" : "EXPIRED"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-xs text-white/40">Current start</p>
                    <p className="mt-1 text-sm font-medium">
                      {formatDate(
                        toDate(student?.membershipStartDate)
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-xs text-white/40">
                      Current valid until
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {formatDate(expiryDate)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isRegistrationPending && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="font-semibold">How renewal works</p>
                <div className="mt-4 space-y-3 text-sm text-white/60">
                  <p>✓ ₹199 for one year of SBC membership.</p>
                  <p>
                    ✓ If your membership is still active, one year is
                    added to your existing expiry date.
                  </p>
                  <p>
                    ✓ If your membership has expired, the new year
                    starts from the successful payment date.
                  </p>
                  <p>
                    ✓ A failed or cancelled payment does not change
                    your membership dates.
                  </p>
                </div>
              </div>
            )}

            {errorMessage ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-200">
                {errorMessage}
              </div>
            ) : null}

            {uid && student ? (
              <MembershipPayment
                uid={uid}
                mode={isRegistrationPending ? "registration" : "renewal"}
                registeredMobile={student.mobile}
                baselineExpiryMs={baselineExpiryMs}
                onActivated={() => setRenewed(true)}
              />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
