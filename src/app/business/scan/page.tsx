"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BusinessProtected from "@/components/BusinessProtected";
import { auth, db } from "@/lib/firebase";

import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

interface Student {
  id: string;
  fullName: string;
  cardNumber?: string;
  college?: string;
  mobile?: string;
  email?: string;
}

interface Offer {
  id: string;
  title: string;
  discount: string;
  businessId: string;
}

export default function ScanPage() {
  const router = useRouter();

  const [cardNumber, setCardNumber] = useState("");

  const [student, setStudent] = useState<Student | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);

  const [usedCount, setUsedCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * Load current business active offer
   */
  const loadOffer = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        return null;
      }

      const offerQuery = query(
        collection(db, "offers"),
        where("businessId", "==", user.uid),
        where("status", "==", "active")
      );

      const offerSnap = await getDocs(offerQuery);

      if (offerSnap.empty) {
        return null;
      }

      const offerDoc = offerSnap.docs[0];
      const data = offerDoc.data();

      const activeOffer: Offer = {
        id: offerDoc.id,
        title: data.title || "",
        discount: data.discount || "",
        businessId: data.businessId || user.uid,
      };

      setOffer(activeOffer);

      return activeOffer;
    } catch (error) {
      console.error("Error loading offer:", error);
      return null;
    }
  };

  /*
   * Search student using Card Number
   */
  const searchStudent = async () => {
    setError("");
    setSuccess("");
    setStudent(null);
    setUsedCount(0);

    const enteredCardNumber = cardNumber.trim();

    if (!enteredCardNumber) {
      setError("Please enter Student Card Number");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setError("Business login required");
      return;
    }

    try {
      setLoading(true);

      /*
       * Find student by cardNumber
       */
      const studentQuery = query(
        collection(db, "students"),
        where("cardNumber", "==", enteredCardNumber)
      );

      const studentSnap = await getDocs(studentQuery);

      if (studentSnap.empty) {
        setError(
          "Student not found. Please check the Card Number."
        );
        return;
      }

      const studentDoc = studentSnap.docs[0];
      const studentData = studentDoc.data();

      const studentDetails: Student = {
        id: studentDoc.id,
        fullName: studentData.fullName || "",
        cardNumber:
          studentData.cardNumber || enteredCardNumber,
        college: studentData.college || "",
        mobile: studentData.mobile || "",
        email: studentData.email || "",
      };

      /*
       * Get current active offer
       */
      let activeOffer = offer;

      if (!activeOffer) {
        activeOffer = await loadOffer();
      }

      if (!activeOffer) {
        setError(
          "This business currently has no active offer."
        );
        return;
      }

      /*
       * Check previous redemptions
       */
      const redemptionQuery = query(
        collection(db, "redemptions"),
        where("studentId", "==", studentDoc.id),
        where("offerId", "==", activeOffer.id)
      );

      const redemptionSnap = await getDocs(
        redemptionQuery
      );

      setUsedCount(redemptionSnap.size);
      setStudent(studentDetails);
    } catch (error) {
      console.error(
        "Student search error:",
        error
      );

      setError(
        "Unable to find student. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Redeem active offer
   */
  const redeemOffer = async () => {
    if (!student || !offer) {
      setError("Student or Offer not found.");
      return;
    }

    if (usedCount >= 4) {
      setError(
        "This student has already used this offer 4 times."
      );
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setError("Business login required");
      return;
    }

    try {
      setRedeeming(true);
      setError("");
      setSuccess("");

      /*
       * Double-check existing redemptions
       * before creating a new one.
       */
      const redemptionQuery = query(
        collection(db, "redemptions"),
        where("studentId", "==", student.id),
        where("offerId", "==", offer.id)
      );

      const redemptionSnap = await getDocs(
        redemptionQuery
      );

      const currentUsedCount =
        redemptionSnap.size;

      if (currentUsedCount >= 4) {
        setUsedCount(currentUsedCount);

        setError(
          "This offer has already reached the 4-use limit."
        );

        return;
      }

      /*
       * Save redemption
       */
      await addDoc(
        collection(db, "redemptions"),
        {
          studentId: student.id,
          studentName: student.fullName,
          studentCardNumber:
            student.cardNumber || cardNumber.trim(),
          studentMobile: student.mobile || "",
          studentEmail: student.email || "",

          businessId: user.uid,

          offerId: offer.id,
          offerTitle: offer.title,
          discount: offer.discount,

          redeemedAt: serverTimestamp(),

          status: "redeemed",
        }
      );

      const nextCount =
        currentUsedCount + 1;

      setUsedCount(nextCount);

      /*
       * Success message
       */
      if (nextCount === 1) {
        setSuccess(
          "🌟 First Time Use — Offer Redeemed Successfully!"
        );
      } else if (nextCount === 4) {
        setSuccess(
          "🏆 Final Use (4/4) — Offer Redeemed Successfully!"
        );
      } else {
        setSuccess(
          `✅ Offer Redeemed Successfully — Used ${nextCount}/4`
        );
      }
    } catch (error) {
      console.error(
        "Redemption error:",
        error
      );

      setError(
        "❌ Redemption failed. Please try again."
      );
    } finally {
      setRedeeming(false);
    }
  };

  /*
   * Load offer when page opens
   */
  useEffect(() => {
    loadOffer();
  }, []);

  /*
   * Enter key support
   */
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      searchStudent();
    }
  };

  /*
   * Reset search
   */
  const resetSearch = () => {
    setCardNumber("");
    setStudent(null);
    setUsedCount(0);
    setError("");
    setSuccess("");
  };

  return (
    <BusinessProtected>
      <main className="min-h-screen bg-slate-100 p-5 md:p-8">
        <div className="mx-auto max-w-5xl">

          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h1 className="text-3xl font-bold text-purple-700 md:text-4xl">
                🎟️ Redeem Student Offer
              </h1>

              <p className="mt-2 text-gray-600">
                Enter the student's SPC Card Number
                to verify and redeem the offer.
              </p>
            </div>

            <button
              onClick={() =>
                router.push(
                  "/business/dashboard"
                )
              }
              className="rounded-xl bg-gray-700 px-6 py-3 font-bold text-white transition hover:bg-gray-800"
            >
              ← Dashboard
            </button>

          </div>

          {/* Search Card */}
          <div className="rounded-3xl bg-white p-6 shadow-xl md:p-8">

            <h2 className="text-2xl font-bold text-gray-800">
              Student Card Number
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Enter the Card Number printed on the
              student's SPC card.
            </p>

            <div className="mt-6 flex flex-col gap-4 md:flex-row">

              <input
                type="text"
                value={cardNumber}
                onChange={(e) =>
                  setCardNumber(
                    e.target.value.toUpperCase()
                  )
                }
                onKeyDown={handleKeyDown}
                placeholder="Enter SPC Card Number"
                className="w-full rounded-2xl border-2 border-gray-200 px-5 py-4 text-lg font-semibold uppercase outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />

              <button
                onClick={searchStudent}
                disabled={loading}
                className="rounded-2xl bg-purple-700 px-8 py-4 text-lg font-bold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {loading
                  ? "🔍 Searching..."
                  : "🔍 Search Student"}
              </button>

            </div>

            {/* Error */}
            {error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
                <p className="font-bold text-red-700">
                  ❌ {error}
                </p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5">
                <p className="font-bold text-green-700">
                  {success}
                </p>
              </div>
            )}

          </div>

          {/* Student Details */}
          {student && (
            <div className="mt-8 rounded-3xl bg-white p-6 shadow-xl md:p-8">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <h2 className="text-3xl font-bold text-green-600">
                  ✅ Student Verified
                </h2>

                <button
                  onClick={resetSearch}
                  className="rounded-xl bg-gray-100 px-5 py-3 font-bold text-gray-700 hover:bg-gray-200"
                >
                  🔄 New Student
                </button>

              </div>

              {/* Student Information */}
              <div className="mt-8 grid gap-5 md:grid-cols-2">

                {/* Name */}
                <div className="rounded-2xl bg-slate-100 p-5">
                  <p className="text-sm text-gray-500">
                    👤 Student Name
                  </p>

                  <h3 className="mt-2 text-xl font-bold text-gray-800">
                    {student.fullName}
                  </h3>
                </div>

                {/* Card Number */}
                <div className="rounded-2xl bg-slate-100 p-5">
                  <p className="text-sm text-gray-500">
                    🎫 Card Number
                  </p>

                  <h3 className="mt-2 text-xl font-bold text-purple-700">
                    {student.cardNumber ||
                      cardNumber}
                  </h3>
                </div>

                {/* College */}
                <div className="rounded-2xl bg-slate-100 p-5">
                  <p className="text-sm text-gray-500">
                    🏫 College
                  </p>

                  <h3 className="mt-2 text-xl font-bold text-gray-800">
                    {student.college || "-"}
                  </h3>
                </div>

                {/* Mobile */}
                <div className="rounded-2xl bg-slate-100 p-5">
                  <p className="text-sm text-gray-500">
                    📱 Mobile
                  </p>

                  <h3 className="mt-2 text-xl font-bold text-gray-800">
                    {student.mobile || "-"}
                  </h3>
                </div>

                {/* Email */}
                <div className="rounded-2xl bg-slate-100 p-5 md:col-span-2">
                  <p className="text-sm text-gray-500">
                    📧 Email
                  </p>

                  <h3 className="mt-2 break-all text-lg font-bold text-gray-800">
                    {student.email || "-"}
                  </h3>
                </div>

              </div>

              {/* Usage Status */}
              <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6">

                {usedCount === 0 && (
                  <>
                    <p className="text-sm font-semibold text-green-600">
                      Offer Usage
                    </p>

                    <h2 className="mt-2 text-2xl font-bold text-green-700">
                      🌟 First Time Use
                    </h2>

                    <p className="mt-2 text-gray-600">
                      This student has not used this
                      offer before.
                    </p>
                  </>
                )}

                {usedCount > 0 &&
                  usedCount < 4 && (
                    <>
                      <p className="text-sm font-semibold text-blue-600">
                        Offer Usage
                      </p>

                      <h2 className="mt-2 text-2xl font-bold text-blue-700">
                        ✅ Used: {usedCount} / 4
                      </h2>

                      <p className="mt-2 text-gray-600">
                        Remaining uses:{" "}
                        {4 - usedCount}
                      </p>
                    </>
                  )}

                {usedCount >= 4 && (
                  <>
                    <p className="text-sm font-semibold text-red-600">
                      Offer Usage
                    </p>

                    <h2 className="mt-2 text-2xl font-bold text-red-700">
                      ❌ Limit Reached
                    </h2>

                    <p className="mt-2 text-gray-600">
                      This student has already used
                      this offer 4 times.
                    </p>
                  </>
                )}

              </div>

              {/* Current Offer */}
              {offer && (
                <div className="mt-6 rounded-2xl bg-blue-50 p-6">

                  <p className="text-sm font-semibold text-gray-500">
                    Current Active Offer
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-blue-700">
                    {offer.title}
                  </h3>

                  <p className="mt-2 text-2xl font-bold text-green-600">
                    {offer.discount}
                  </p>

                </div>
              )}

              {/* Redeem Button */}
              <div className="mt-8">

                <button
                  disabled={
                    usedCount >= 4 ||
                    redeeming
                  }
                  onClick={redeemOffer}
                  className={`w-full rounded-2xl py-5 text-xl font-bold text-white transition-all ${
                    usedCount >= 4 ||
                    redeeming
                      ? "cursor-not-allowed bg-gray-400"
                      : "bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-[1.01] hover:shadow-2xl"
                  }`}
                >
                  {redeeming
                    ? "⏳ Redeeming..."
                    : usedCount >= 4
                    ? "❌ Limit Reached"
                    : "🎉 Redeem Offer"}
                </button>

              </div>

            </div>
          )}

        </div>
      </main>
    </BusinessProtected>
  );
}