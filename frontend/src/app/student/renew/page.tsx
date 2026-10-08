"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, Timestamp } from "firebase/firestore";

import MembershipPayment from "@/components/MembershipPayment";

/*
|--------------------------------------------------------------------------
| RENEW SBC MEMBERSHIP
|--------------------------------------------------------------------------
|
| Payment is collected by the hosted Razorpay Payment Button. The button
| gives the browser no success callback, so this page never decides that a
| payment succeeded — the Razorpay webhook tells the backend, the backend
| extends the membership, and MembershipPayment notices the new expiry
| date and calls back here.
|
| The membership dates are therefore entirely server-controlled, exactly
| as before.
|
*/

type StudentData = {
  fullName?: string;
  mobile?: string;
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

  /*
   * Captured once, before payment, so a renewal is only treated as
   * complete when the stored expiry actually moves past it.
   */
  const [baselineExpiryMs, setBaselineExpiryMs] = useState<number | null>(
    null
  );

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
            "Student account details could not be found. Please sign in again."
          );
          return;
        }

        const data = snap.data() as StudentData;

        setUid(user.uid);
        setStudent(data);

        const currentExpiry = toDate(data.membershipExpiryDate);

        setBaselineExpiryMs(currentExpiry ? currentExpiry.getTime() : null);

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

  /*
   * Decided once when the membership loads. Reading the clock during
   * render would make the component non-idempotent.
   */
  const [membershipCurrentlyActive, setMembershipCurrentlyActive] =
    useState(false);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-sm text-white/60">Loading your membership...</p>
        </div>
      </main>
    );
  }

  if (errorMessage && !student) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-7 shadow-2xl">
          <h1 className="text-2xl font-semibold">SBC Membership</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={() => router.replace("/student/dashboard")}
            className="mt-6 w-full rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-white/90"
          >
            Back to Dashboard
          </button>
        </section>
      </main>
    );
  }

  if (renewed) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <section className="w-full max-w-md rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.07] p-7 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-2xl">
            ✓
          </div>

          <h1 className="mt-5 text-2xl font-semibold">Membership renewed</h1>

          <p className="mt-3 text-sm leading-6 text-white/65">
            Your payment is confirmed and your SBC membership has been
            extended by one year.
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
                  Renew SBC
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-6 text-white/60">
                  Continue your SBC student benefits for another full year.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                <p className="text-xs text-white/45">Renewal</p>
                <p className="mt-1 text-xl font-bold">₹199</p>
                <p className="text-xs text-white/45">1 year</p>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-6 py-7 sm:px-8">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-white/45">Current membership</p>
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
                    {formatDate(toDate(student?.membershipStartDate))}
                  </p>
                </div>

                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-xs text-white/40">Current valid until</p>
                  <p className="mt-1 text-sm font-medium">
                    {formatDate(expiryDate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="font-semibold">How renewal works</p>
              <div className="mt-4 space-y-3 text-sm text-white/60">
                <p>✓ ₹199 for one year of SBC membership.</p>
                <p>
                  ✓ If your membership is still active, your existing expiry
                  date is preserved and one year is added.
                </p>
                <p>
                  ✓ If your membership has expired, the new year starts from
                  the successful payment date.
                </p>
                <p>
                  ✓ Payment cancellation or failure does not change your
                  membership dates.
                </p>
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-200">
                {errorMessage}
              </div>
            ) : null}

            {uid ? (
              <MembershipPayment
                uid={uid}
                mode="renewal"
                registeredMobile={student?.mobile}
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
