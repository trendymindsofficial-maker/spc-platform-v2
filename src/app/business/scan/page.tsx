"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import BusinessProtected from "@/components/BusinessProtected";

import { auth, db } from "@/lib/firebase";

import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

interface Student {
  id: string;
  fullName: string;
  college?: string;
  mobile?: string;
  email?: string;
  cardNumber?: string;
  course?: string;
  year?: string;
}

interface Offer {
  id: string;
  title: string;
  discount: string;
  businessId: string;
}

export default function RedeemStudentOffer() {
  const router = useRouter();

  const scannerRef = useRef<any>(null);
  const mountedRef = useRef(true);

  const [student, setStudent] =
    useState<Student | null>(null);

  const [offer, setOffer] =
    useState<Offer | null>(null);

  const [usedCount, setUsedCount] =
    useState(0);

  const [scannerLoading, setScannerLoading] =
    useState(false);

  const [scannerError, setScannerError] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  const [businessReady, setBusinessReady] =
    useState(false);

  const [cardNumber, setCardNumber] =
    useState("");

  const [searchingCard, setSearchingCard] =
    useState(false);

  /*
   * ==========================================
   * LOAD ACTIVE OFFER
   * ==========================================
   */

  const loadOffer = async (
    businessId: string
  ) => {
    try {
      const offerQuery = query(
        collection(db, "offers"),
        where(
          "businessId",
          "==",
          businessId
        ),
        where(
          "status",
          "==",
          "active"
        )
      );

      const offerSnap =
        await getDocs(offerQuery);

      if (offerSnap.empty) {
        setOffer(null);
        return;
      }

      const offerDoc =
        offerSnap.docs[0];

      const data =
        offerDoc.data();

      setOffer({
        id: offerDoc.id,
        title: data.title || "",
        discount: data.discount || "",
        businessId:
          data.businessId ||
          businessId,
      });
    } catch (error) {
      console.error(
        "Offer loading error:",
        error
      );
    }
  };

  /*
   * ==========================================
   * FIND STUDENT + CHECK USAGE
   * ==========================================
   */

  const verifyStudent = async (
    studentId: string
  ) => {
    try {
      const studentRef = doc(
        db,
        "students",
        studentId
      );

      const studentSnap =
        await getDoc(studentRef);

      if (!studentSnap.exists()) {
        alert(
          "❌ Student Not Found"
        );
        return;
      }

      const studentData =
        studentSnap.data();

      const studentInfo: Student = {
        id: studentSnap.id,
        fullName:
          studentData.fullName || "",
        college:
          studentData.college || "",
        mobile:
          studentData.mobile || "",
        email:
          studentData.email || "",
        cardNumber:
          studentData.cardNumber || "",
        course:
          studentData.course || "",
        year:
          studentData.year || "",
      };

      const user =
        auth.currentUser;

      if (!user) {
        alert(
          "❌ Business login required"
        );
        return;
      }

      /*
       * Get active offer
       */

      const offerQuery = query(
        collection(db, "offers"),
        where(
          "businessId",
          "==",
          user.uid
        ),
        where(
          "status",
          "==",
          "active"
        )
      );

      const offerSnap =
        await getDocs(offerQuery);

      if (offerSnap.empty) {
        alert(
          "❌ No Active Offer Found"
        );
        return;
      }

      const offerDoc =
        offerSnap.docs[0];

      const offerData =
        offerDoc.data();

      const activeOffer: Offer = {
        id: offerDoc.id,
        title:
          offerData.title || "",
        discount:
          offerData.discount || "",
        businessId:
          offerData.businessId ||
          user.uid,
      };

      setOffer(activeOffer);

      /*
       * Check previous redemptions
       */

      const redemptionQuery =
        query(
          collection(
            db,
            "redemptions"
          ),
          where(
            "studentId",
            "==",
            studentSnap.id
          ),
          where(
            "offerId",
            "==",
            activeOffer.id
          )
        );

      const redemptionSnap =
        await getDocs(
          redemptionQuery
        );

      setUsedCount(
        redemptionSnap.size
      );

      setStudent(
        studentInfo
      );
    } catch (error) {
      console.error(
        "Student verification error:",
        error
      );

      alert(
        "❌ Student verification failed"
      );
    }
  };

  /*
   * ==========================================
   * SEARCH BY SPC CARD NUMBER
   * ==========================================
   */

  const searchByCardNumber =
    async () => {
      const number =
        cardNumber.trim();

      if (!number) {
        alert(
          "Please enter SPC Card Number"
        );
        return;
      }

      try {
        setSearchingCard(true);

        const studentQuery =
          query(
            collection(db, "students"),
            where(
              "cardNumber",
              "==",
              number.toUpperCase()
            )
          );

        const studentSnap =
          await getDocs(
            studentQuery
          );

        if (studentSnap.empty) {
          alert(
            "❌ SPC Card Number Not Found"
          );
          return;
        }

        const studentDoc =
          studentSnap.docs[0];

        await verifyStudent(
          studentDoc.id
        );
      } catch (error) {
        console.error(
          "Card search error:",
          error
        );

        alert(
          "❌ Unable to search card number"
        );
      } finally {
        setSearchingCard(false);
      }
    };

  /*
   * ==========================================
   * PROCESS QR CODE
   * ==========================================
   */

  const processQRCode =
    async (
      decodedText: string
    ) => {
      if (processing) {
        return;
      }

      try {
        setProcessing(true);

        let qrData: any;

        try {
          qrData =
            JSON.parse(
              decodedText
            );
        } catch {
          alert(
            "❌ Invalid SPC QR Code"
          );
          return;
        }

        if (
          !qrData ||
          qrData.type !==
            "student" ||
          !qrData.studentId
        ) {
          alert(
            "❌ Invalid SPC Student QR"
          );
          return;
        }

        await verifyStudent(
          qrData.studentId
        );

        await stopScanner();
      } catch (error) {
        console.error(
          "QR processing error:",
          error
        );

        alert(
          "❌ Unable to process QR Code"
        );
      } finally {
        setProcessing(false);
      }
    };

  /*
   * ==========================================
   * START QR SCANNER
   * ==========================================
   */

  const startScanner =
    async () => {
      try {
        setScannerLoading(true);
        setScannerError("");

        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch {}

          try {
            await scannerRef.current.clear();
          } catch {}

          scannerRef.current = null;
        }

        const module =
          await import(
            "html5-qrcode"
          );

        if (!mountedRef.current) {
          return;
        }

        const Html5Qrcode =
          module.Html5Qrcode;

        const reader =
          document.getElementById(
            "reader"
          );

        if (!reader) {
          throw new Error(
            "Scanner area not ready"
          );
        }

        const scanner =
          new Html5Qrcode(
            "reader"
          );

        scannerRef.current =
          scanner;

        const config = {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
          aspectRatio: 1.0,
        };

        await scanner.start(
          {
            facingMode:
              "environment",
          },
          config,
          async (
            decodedText: string
          ) => {
            await processQRCode(
              decodedText
            );
          },
          () => {}
        );

        if (mountedRef.current) {
          setScannerLoading(false);
        }
      } catch (error: any) {
        console.error(
          "Scanner error:",
          error
        );

        if (
          !mountedRef.current
        ) {
          return;
        }

        setScannerLoading(false);

        setScannerError(
          error?.message ||
            "Unable to start camera"
        );
      }
    };

  /*
   * ==========================================
   * STOP SCANNER
   * ==========================================
   */

  const stopScanner =
    async () => {
      if (
        !scannerRef.current
      ) {
        return;
      }

      try {
        await scannerRef.current.stop();
      } catch {}

      try {
        await scannerRef.current.clear();
      } catch {}

      scannerRef.current = null;
    };

  /*
   * ==========================================
   * RESTART SCANNER
   * ==========================================
   */

  const restartScanner =
    async () => {
      setStudent(null);
      setUsedCount(0);
      setScannerError("");

      await stopScanner();

      setTimeout(() => {
        startScanner();
      }, 300);
    };

  /*
   * ==========================================
   * AUTH
   * ==========================================
   */

  useEffect(() => {
    mountedRef.current = true;

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!user) {
            router.replace(
              "/business/login"
            );
            return;
          }

          await loadOffer(
            user.uid
          );

          if (
            mountedRef.current
          ) {
            setBusinessReady(
              true
            );
          }
        }
      );

    return () => {
      mountedRef.current =
        false;

      unsubscribe();

      stopScanner();
    };
  }, [router]);

  /*
   * ==========================================
   * START SCANNER AFTER DOM READY
   * ==========================================
   */

  useEffect(() => {
    if (!businessReady) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        startScanner();
      }, 300);

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [businessReady]);

  /*
   * ==========================================
   * REDEEM OFFER
   * ==========================================
   */

  const redeemOffer =
    async () => {
      if (
        !student ||
        !offer
      ) {
        alert(
          "❌ Student or Offer not found"
        );
        return;
      }

      if (
        usedCount >= 4
      ) {
        alert(
          "❌ Limit Reached\n\nThis student has already used this offer 4/4 times."
        );
        return;
      }

      const user =
        auth.currentUser;

      if (!user) {
        alert(
          "❌ Business login required"
        );
        return;
      }

      try {
        setProcessing(true);

        /*
         * FINAL DATABASE CHECK
         */

        const redemptionQuery =
          query(
            collection(
              db,
              "redemptions"
            ),
            where(
              "studentId",
              "==",
              student.id
            ),
            where(
              "offerId",
              "==",
              offer.id
            )
          );

        const redemptionSnap =
          await getDocs(
            redemptionQuery
          );

        const currentCount =
          redemptionSnap.size;

        if (
          currentCount >= 4
        ) {
          setUsedCount(
            currentCount
          );

          alert(
            "❌ Limit Reached\n\nThis offer has already been used 4/4 times."
          );

          return;
        }

        /*
         * SAVE REDEMPTION
         */

        await addDoc(
          collection(
            db,
            "redemptions"
          ),
          {
            studentId:
              student.id,

            studentName:
              student.fullName,

            studentMobile:
              student.mobile ||
              "",

            studentCardNumber:
              student.cardNumber ||
              "",

            businessId:
              user.uid,

            offerId:
              offer.id,

            offerTitle:
              offer.title,

            discount:
              offer.discount,

            redeemedAt:
              serverTimestamp(),

            status:
              "redeemed",
          }
        );

        const nextCount =
          currentCount + 1;

        setUsedCount(
          nextCount
        );

        if (
          nextCount === 1
        ) {
          alert(
            "🌟 First Time Use\n\nOffer redeemed successfully!"
          );
        } else if (
          nextCount === 4
        ) {
          alert(
            "🏆 Final Use (4/4)\n\nOffer redeemed successfully!\n\nThis offer cannot be used again."
          );
        } else {
          alert(
            `✅ Offer Redeemed Successfully!\n\nUsed: ${nextCount}/4`
          );
        }

        setStudent(null);
        setUsedCount(0);

        setCardNumber("");

        await stopScanner();

        setTimeout(() => {
          if (
            mountedRef.current
          ) {
            startScanner();
          }
        }, 500);
      } catch (error) {
        console.error(
          "Redemption error:",
          error
        );

        alert(
          "❌ Redemption failed. Please try again."
        );
      } finally {
        if (
          mountedRef.current
        ) {
          setProcessing(false);
        }
      }
    };

  /*
   * ==========================================
   * PAGE
   * ==========================================
   */

  return (
    <BusinessProtected>

      <main className="min-h-screen bg-slate-100 p-6">

        <div className="mx-auto max-w-5xl">

          {/* HEADER */}

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>

              <h1 className="text-3xl font-bold text-purple-700 md:text-4xl">
                🎟️ Redeem Student Offer
              </h1>

              <p className="mt-2 text-gray-600">
                Scan QR or enter SPC Card Number
                to verify the student.
              </p>

            </div>

            <button
              onClick={() =>
                router.push(
                  "/business/dashboard"
                )
              }
              className="rounded-xl bg-gray-700 px-6 py-3 font-bold text-white hover:bg-gray-800"
            >
              ← Dashboard
            </button>

          </div>


          {/* ACTIVE OFFER */}

          {offer && (
            <div className="mb-6 rounded-3xl bg-white p-6 shadow-xl">

              <p className="text-sm font-semibold text-gray-500">
                Current Active Offer
              </p>

              <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

                <h2 className="text-2xl font-bold text-blue-700">
                  {offer.title}
                </h2>

                <span className="text-2xl font-bold text-green-600">
                  {offer.discount}
                </span>

              </div>

            </div>
          )}


          {/* ==================================
              TWO OPTIONS
          =================================== */}

          {!student && (
            <div className="grid gap-6 lg:grid-cols-2">

              {/* QR SCANNER */}

              <div className="rounded-3xl bg-white p-6 shadow-xl">

                <div className="mb-5 text-center">

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-3xl">
                    📷
                  </div>

                  <h2 className="mt-4 text-2xl font-bold text-purple-700">
                    Scan Student QR
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Scan the student's SPC QR
                    code.
                  </p>

                </div>

                {scannerLoading && (
                  <div className="mb-4 rounded-2xl bg-blue-50 p-4 text-center">

                    <div className="mx-auto mb-2 h-7 w-7 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

                    <p className="font-bold text-blue-700">
                      Starting Camera...
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Please allow camera permission.
                    </p>

                  </div>
                )}

                {scannerError && (
                  <div className="mb-4 rounded-2xl bg-red-50 p-4 text-center">

                    <p className="font-bold text-red-700">
                      ❌ Camera Error
                    </p>

                    <p className="mt-2 break-words text-sm text-gray-600">
                      {scannerError}
                    </p>

                    <button
                      onClick={
                        restartScanner
                      }
                      className="mt-4 rounded-xl bg-red-600 px-5 py-3 font-bold text-white"
                    >
                      🔄 Try Again
                    </button>

                  </div>
                )}

                <div
                  id="reader"
                  className="mx-auto w-full max-w-md overflow-hidden rounded-2xl"
                />

                {!scannerError && (
                  <button
                    onClick={
                      restartScanner
                    }
                    className="mt-4 w-full rounded-xl bg-gray-200 py-3 font-bold text-gray-700 hover:bg-gray-300"
                  >
                    🔄 Restart Scanner
                  </button>
                )}

              </div>


              {/* CARD NUMBER */}

              <div className="rounded-3xl bg-white p-6 shadow-xl">

                <div className="mb-5 text-center">

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-3xl">
                    🎫
                  </div>

                  <h2 className="mt-4 text-2xl font-bold text-green-700">
                    Enter SPC Card Number
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    If QR scanning is not convenient,
                    enter the card number manually.
                  </p>

                </div>

                <div className="mt-8">

                  <label className="mb-2 block font-semibold text-gray-700">
                    SPC Card Number
                  </label>

                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) =>
                      setCardNumber(
                        e.target.value.toUpperCase()
                      )
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter"
                      ) {
                        searchByCardNumber();
                      }
                    }}
                    placeholder="Example: SPC123456"
                    className="w-full rounded-2xl border-2 border-gray-300 p-5 text-center text-2xl font-bold uppercase tracking-wider outline-none transition focus:border-green-600"
                  />

                  <button
                    onClick={
                      searchByCardNumber
                    }
                    disabled={
                      searchingCard
                    }
                    className="mt-5 w-full rounded-2xl bg-green-600 py-5 text-lg font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {searchingCard
                      ? "🔍 Searching..."
                      : "🔍 Search Student"}
                  </button>

                </div>

                <div className="mt-8 rounded-2xl bg-yellow-50 p-5 text-center">

                  <p className="font-semibold text-yellow-800">
                    💡 Tip
                  </p>

                  <p className="mt-1 text-sm text-yellow-700">
                    Student card number is printed
                    on their SPC card.
                  </p>

                </div>

              </div>

            </div>
          )}


          {/* ==================================
              STUDENT VERIFIED
          =================================== */}

          {student && (
            <div className="rounded-3xl bg-white p-6 shadow-xl md:p-8">

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                <div>

                  <h2 className="text-3xl font-bold text-green-600">
                    ✅ Student Verified
                  </h2>

                  <p className="mt-1 text-gray-500">
                    Student successfully verified.
                  </p>

                </div>

                <button
                  onClick={
                    restartScanner
                  }
                  disabled={
                    processing
                  }
                  className="rounded-xl bg-gray-700 px-5 py-3 font-bold text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  📷 Scan / Search Another
                </button>

              </div>


              {/* STUDENT DETAILS */}

              <div className="mt-8 grid gap-5 md:grid-cols-2">

                <div className="rounded-2xl bg-slate-100 p-5">

                  <p className="text-sm text-gray-500">
                    👤 Student Name
                  </p>

                  <h3 className="mt-2 text-xl font-bold">
                    {student.fullName ||
                      "-"}
                  </h3>

                </div>


                <div className="rounded-2xl bg-slate-100 p-5">

                  <p className="text-sm text-gray-500">
                    🎫 SPC Card Number
                  </p>

                  <h3 className="mt-2 text-xl font-bold text-purple-700">
                    {student.cardNumber ||
                      "-"}
                  </h3>

                </div>


                <div className="rounded-2xl bg-slate-100 p-5">

                  <p className="text-sm text-gray-500">
                    🏫 College
                  </p>

                  <h3 className="mt-2 text-xl font-bold">
                    {student.college ||
                      "-"}
                  </h3>

                </div>


                <div className="rounded-2xl bg-slate-100 p-5">

                  <p className="text-sm text-gray-500">
                    📚 Course
                  </p>

                  <h3 className="mt-2 text-xl font-bold">
                    {student.course ||
                      "-"}
                  </h3>

                </div>


                <div className="rounded-2xl bg-slate-100 p-5">

                  <p className="text-sm text-gray-500">
                    📅 Year
                  </p>

                  <h3 className="mt-2 text-xl font-bold">
                    {student.year ||
                      "-"}
                  </h3>

                </div>


                <div className="rounded-2xl bg-slate-100 p-5">

                  <p className="text-sm text-gray-500">
                    📱 Mobile
                  </p>

                  <h3 className="mt-2 text-xl font-bold">
                    {student.mobile ||
                      "-"}
                  </h3>

                </div>

              </div>


              {/* USAGE */}

              <div className="mt-8 rounded-2xl border p-6">

                {usedCount === 0 && (
                  <div className="rounded-2xl bg-green-50">

                    <p className="text-sm font-semibold text-green-600">
                      Offer Usage
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-green-700">
                      🌟 First Time Use
                    </h2>

                    <p className="mt-1 text-gray-600">
                      This student has not used this
                      offer yet.
                    </p>

                  </div>
                )}

                {usedCount > 0 &&
                  usedCount < 4 && (
                    <div>

                      <p className="text-sm font-semibold text-blue-600">
                        Offer Usage
                      </p>

                      <h2 className="mt-1 text-2xl font-bold text-blue-700">
                        ✅ Used: {usedCount}/4
                      </h2>

                      <p className="mt-1 text-gray-600">
                        Remaining uses:{" "}
                        {4 -
                          usedCount}
                      </p>

                    </div>
                  )}

                {usedCount >= 4 && (
                  <div>

                    <p className="text-sm font-semibold text-red-600">
                      Offer Usage
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-red-700">
                      ❌ Limit Reached
                    </h2>

                    <p className="mt-1 font-semibold text-red-600">
                      Used 4/4 times.
                      No more redemptions allowed.
                    </p>

                  </div>
                )}

              </div>


              {/* OFFER */}

              {offer && (
                <div className="mt-6 rounded-2xl bg-blue-50 p-6">

                  <p className="text-sm font-semibold text-gray-500">
                    Current Offer
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-blue-700">
                    {offer.title}
                  </h3>

                  <p className="mt-2 text-2xl font-bold text-green-600">
                    {offer.discount}
                  </p>

                </div>
              )}


              {/* REDEEM */}

              <button
                disabled={
                  usedCount >= 4 ||
                  processing
                }
                onClick={
                  redeemOffer
                }
                className={`mt-8 w-full rounded-2xl py-5 text-xl font-bold text-white transition ${
                  usedCount >= 4
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-[1.01] hover:shadow-xl"
                }`}
              >
                {processing
                  ? "⏳ Processing..."
                  : usedCount >= 4
                  ? "❌ Limit Reached (4/4)"
                  : "🎉 Redeem Offer"}
              </button>

            </div>
          )}

        </div>

      </main>

    </BusinessProtected>
  );
}