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

  const [showConfirm, setShowConfirm] = useState(false);

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
        setOffer(null);
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

      setOffer(null);

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
      setError("Please enter Student Card Number.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setError("Business login required.");
      return;
    }

    try {
      setLoading(true);

      /*
       * Find student by Card Number
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
   * Open confirmation popup
   */
  const openConfirmPopup = () => {
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

    setError("");
    setSuccess("");
    setShowConfirm(true);
  };

  /*
   * Close confirmation popup
   */
  const closeConfirmPopup = () => {
    if (redeeming) {
      return;
    }

    setShowConfirm(false);
  };

  /*
   * Confirm and redeem offer
   */
  const confirmRedeem = async () => {
    if (!student || !offer) {
      setShowConfirm(false);
      setError("Student or Offer not found.");
      return;
    }

    if (usedCount >= 4) {
      setShowConfirm(false);
      setError(
        "This student has already used this offer 4 times."
      );
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setShowConfirm(false);
      setError("Business login required.");
      return;
    }

    try {
      setRedeeming(true);
      setError("");
      setSuccess("");

      /*
       * Double-check previous redemptions
       * before creating a new redemption.
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

      /*
       * Safety limit
       */
      if (currentUsedCount >= 4) {
        setUsedCount(currentUsedCount);
        setShowConfirm(false);

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
            student.cardNumber ||
            cardNumber.trim(),

          studentMobile:
            student.mobile || "",

          studentEmail:
            student.email || "",

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

      setShowConfirm(false);

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

      setShowConfirm(false);

      setError(
        "❌ Redemption failed. Please try again."
      );
    } finally {
      setRedeeming(false);
    }
  };

  /*
   * Load active offer when page opens
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
   * Reset page for next student
   */
  const resetSearch = () => {
    setCardNumber("");
    setStudent(null);
    setUsedCount(0);
    setError("");
    setSuccess("");
    setShowConfirm(false);
  };

  return (
    <BusinessProtected>
      <main className="min-h-screen bg-slate-100 p-5 md:p-8">

        <div className="mx-auto max-w-5xl">

          {/* ========================================
              HEADER
          ======================================== */}

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


          {/* ========================================
              SEARCH CARD
          ======================================== */}

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


          {/* ========================================
              STUDENT DETAILS
          ======================================== */}

          {student && (
            <div className="mt-8 rounded-3xl bg-white p-6 shadow-xl md:p-8">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <h2 className="text-3xl font-bold text-green-600">
                  ✅ Student Verified
                </h2>

                <button
                  onClick={resetSearch}
                  className="rounded-xl bg-gray-100 px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-200"
                >
                  🔄 New Student
                </button>

              </div>


              {/* ====================================
                  STUDENT INFORMATION
              ==================================== */}

              <div className="mt-8 grid gap-5 md:grid-cols-2">

                {/* Student Name */}

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


              {/* ====================================
                  USAGE STATUS
              ==================================== */}

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


              {/* ====================================
                  CURRENT OFFER
              ==================================== */}

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


              {/* ====================================
                  REDEEM BUTTON
              ==================================== */}

              <div className="mt-8">

                <button
                  disabled={
                    usedCount >= 4 ||
                    redeeming
                  }
                  onClick={openConfirmPopup}
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


        {/* ==========================================
            CONFIRM REDEMPTION MODAL
        ========================================== */}

        {showConfirm && student && offer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">

            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl md:p-8">

              {/* Icon */}

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 text-3xl">
                ⚠️
              </div>


              {/* Title */}

              <h2 className="mt-5 text-center text-2xl font-bold text-gray-900">
                Confirm Redemption
              </h2>

              <p className="mt-2 text-center text-gray-500">
                Please verify the details before
                redeeming this offer.
              </p>


              {/* Details */}

              <div className="mt-6 space-y-3 rounded-2xl bg-slate-100 p-5">

                <div className="flex items-start justify-between gap-4">

                  <span className="text-sm text-gray-500">
                    Student
                  </span>

                  <span className="text-right font-bold text-gray-900">
                    {student.fullName}
                  </span>

                </div>


                <div className="flex items-start justify-between gap-4">

                  <span className="text-sm text-gray-500">
                    Card Number
                  </span>

                  <span className="text-right font-bold text-purple-700">
                    {student.cardNumber ||
                      cardNumber}
                  </span>

                </div>


                <div className="flex items-start justify-between gap-4">

                  <span className="text-sm text-gray-500">
                    Offer
                  </span>

                  <span className="text-right font-bold text-blue-700">
                    {offer.title}
                  </span>

                </div>


                <div className="flex items-start justify-between gap-4">

                  <span className="text-sm text-gray-500">
                    Discount
                  </span>

                  <span className="text-right font-bold text-green-600">
                    {offer.discount}
                  </span>

                </div>


                <div className="flex items-start justify-between gap-4">

                  <span className="text-sm text-gray-500">
                    Current Usage
                  </span>

                  <span className="text-right font-bold text-gray-900">
                    {usedCount} / 4
                  </span>

                </div>


                <div className="flex items-start justify-between gap-4">

                  <span className="text-sm text-gray-500">
                    After Redeeming
                  </span>

                  <span className="text-right font-bold text-green-700">
                    {usedCount + 1} / 4
                  </span>

                </div>

              </div>


              {/* Warning */}

              <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">

                <p className="text-sm font-semibold text-yellow-800">
                  ⚠️ Once confirmed, this redemption
                  will be recorded and cannot be undone.
                </p>

              </div>


              {/* Buttons */}

              <div className="mt-6 grid grid-cols-2 gap-3">

                <button
                  onClick={closeConfirmPopup}
                  disabled={redeeming}
                  className="rounded-2xl bg-gray-200 px-4 py-4 font-bold text-gray-800 transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>


                <button
                  onClick={confirmRedeem}
                  disabled={redeeming}
                  className="rounded-2xl bg-green-600 px-4 py-4 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {redeeming
                    ? "⏳ Saving..."
                    : "✅ Confirm Redeem"}
                </button>

              </div>

            </div>

          </div>
        )}

      </main>
    </BusinessProtected>
  );
}