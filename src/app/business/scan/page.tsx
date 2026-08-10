"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import BusinessProtected from "@/components/BusinessProtected";
import { auth, db } from "@/lib/firebase";

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
}

interface Offer {
  id: string;
  title: string;
  discount: string;
  businessId: string;
}

export default function ScanPage() {
  const router = useRouter();

  const scannerRef = useRef<any>(null);

  const [student, setStudent] = useState<Student | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [usedCount, setUsedCount] = useState(0);

  const [scannerLoading, setScannerLoading] = useState(true);
  const [scannerError, setScannerError] = useState("");

  /*
   * Load the business active offer
   */
  const loadOffer = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        return;
      }

      const offerQuery = query(
        collection(db, "offers"),
        where("businessId", "==", user.uid),
        where("status", "==", "active")
      );

      const offerSnap = await getDocs(offerQuery);

      if (!offerSnap.empty) {
        const data = offerSnap.docs[0].data();

        setOffer({
          id: offerSnap.docs[0].id,
          title: data.title || "",
          discount: data.discount || "",
          businessId: data.businessId || user.uid,
        });
      }
    } catch (error) {
      console.error("Error loading offer:", error);
    }
  };

  /*
   * QR scan success
   */
  const onScanSuccess = async (decodedText: string) => {
    try {
      console.log("QR Scanned:", decodedText);

      let qrData: any;

      try {
        qrData = JSON.parse(decodedText);
      } catch {
        alert("Invalid SPC QR Code");
        return;
      }

      if (!qrData?.studentId) {
        alert("Invalid SPC QR Code");
        return;
      }

      /*
       * Find student
       */
      const studentRef = doc(
        db,
        "students",
        qrData.studentId
      );

      const studentSnap = await getDoc(studentRef);

      if (!studentSnap.exists()) {
        alert("Student Not Found");
        return;
      }

      const studentData: Student = {
        id: studentSnap.id,
        ...(studentSnap.data() as Omit<Student, "id">),
      };

      /*
       * Current business
       */
      const user = auth.currentUser;

      if (!user) {
        alert("Business login required");
        return;
      }

      /*
       * Find active offer
       */
      const offerQuery = query(
        collection(db, "offers"),
        where("businessId", "==", user.uid),
        where("status", "==", "active")
      );

      const offerSnap = await getDocs(offerQuery);

      if (offerSnap.empty) {
        alert("No Active Offer");
        return;
      }

      const offerData = offerSnap.docs[0].data();

      const activeOffer: Offer = {
        id: offerSnap.docs[0].id,
        title: offerData.title || "",
        discount: offerData.discount || "",
        businessId: offerData.businessId || user.uid,
      };

      setOffer(activeOffer);

      /*
       * Check previous redemptions
       */
      const redemptionQuery = query(
        collection(db, "redemptions"),
        where("studentId", "==", studentSnap.id),
        where("offerId", "==", activeOffer.id)
      );

      const redemptionSnap = await getDocs(
        redemptionQuery
      );

      setUsedCount(redemptionSnap.size);
      setStudent(studentData);

      /*
       * Stop scanner after successful scan
       */
      if (scannerRef.current) {
        try {
          await scannerRef.current.clear();
        } catch (error) {
          console.warn(
            "Scanner clear warning:",
            error
          );
        }

        scannerRef.current = null;
      }
    } catch (error) {
      console.error(
        "QR processing error:",
        error
      );

      alert("Invalid QR Code");
    }
  };

  /*
   * Start QR scanner only in browser
   */
  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      try {
        setScannerLoading(true);
        setScannerError("");

        /*
         * Dynamic import prevents server-side
         * html5-qrcode problems.
         */
        const module = await import(
          "html5-qrcode"
        );

        if (!mounted) {
          return;
        }

        const Html5QrcodeScanner =
          module.Html5QrcodeScanner;

        const reader =
          document.getElementById("reader");

        if (!reader) {
          throw new Error(
            "QR reader element not found"
          );
        }

        /*
         * Remove previous scanner if any
         */
        if (scannerRef.current) {
          try {
            await scannerRef.current.clear();
          } catch {}
        }

        const scanner =
          new Html5QrcodeScanner(
            "reader",
            {
              fps: 10,
              qrbox: {
                width: 250,
                height: 250,
              },
              rememberLastUsedCamera: true,
            },
            false
          );

        scanner.render(
          onScanSuccess,
          () => {
            /*
             * Ignore continuous QR scan errors.
             */
          }
        );

        scannerRef.current = scanner;

        if (mounted) {
          setScannerLoading(false);
        }
      } catch (error: any) {
        console.error(
          "QR scanner initialization failed:",
          error
        );

        const exactError =
          error?.message ||
          error?.name ||
          String(error);

        if (mounted) {
          setScannerLoading(false);

          setScannerError(
            `Camera Error: ${exactError}`
          );
        }
      }
    };

    loadOffer();
    startScanner();

    return () => {
      mounted = false;

      if (scannerRef.current) {
        scannerRef.current
          .clear()
          .catch(() => {});

        scannerRef.current = null;
      }
    };
  }, []);

  /*
   * Redeem offer
   */
  const redeemOffer = async () => {
    if (!student || !offer) {
      alert("Student or Offer not found");
      return;
    }

    if (usedCount >= 4) {
      alert("Offer usage limit reached");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      alert("Business login required");
      return;
    }

    try {
      await addDoc(
        collection(db, "redemptions"),
        {
          studentId: student.id,
          studentName: student.fullName,
          studentMobile: student.mobile || "",

          businessId: user.uid,

          offerId: offer.id,
          offerTitle: offer.title,
          discount: offer.discount,

          redeemedAt: serverTimestamp(),

          status: "redeemed",
        }
      );

      const nextCount = usedCount + 1;

      setUsedCount(nextCount);

      if (nextCount === 1) {
        alert("🌟 First Time Use");
      } else if (nextCount === 4) {
        alert("🏆 Final Use (4/4)");
      } else {
        alert(
          `✅ Used : ${nextCount} / 4`
        );
      }

      setStudent(null);
      setUsedCount(0);

      router.replace(
        "/business/dashboard"
      );
    } catch (error) {
      console.error(
        "Redemption error:",
        error
      );

      alert(
        "❌ Redemption failed. Please try again."
      );
    }
  };

  return (
    <BusinessProtected>
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-5xl">

          {/* Header */}
          <div className="mb-8 flex items-center justify-between gap-4">
            <h1 className="text-4xl font-bold text-purple-700">
              📷 Scan Student QR
            </h1>

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

          {/* Scanner */}
          <div className="rounded-3xl bg-white p-6 shadow-xl">

            {scannerLoading && (
              <div className="mb-5 rounded-2xl bg-blue-50 p-5 text-center">
                <p className="text-lg font-bold text-blue-700">
                  📷 Starting QR Scanner...
                </p>

                <p className="mt-2 text-sm text-gray-600">
                  Please allow camera permission
                  when asked.
                </p>
              </div>
            )}

            {scannerError && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-center">

                <p className="font-bold text-red-700">
                  ❌ Scanner Error
                </p>

                <p className="mt-3 break-words text-sm text-gray-700">
                  {scannerError}
                </p>

                <button
                  onClick={() =>
                    window.location.reload()
                  }
                  className="mt-5 rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700"
                >
                  🔄 Reload Scanner
                </button>

              </div>
            )}

            <div id="reader" />

          </div>

          {/* Student Details */}
          {student && (
            <div className="mt-8 rounded-3xl bg-white p-8 shadow-xl">

              <h2 className="text-3xl font-bold text-green-600">
                ✅ Student Verified
              </h2>

              <div className="mt-8 grid gap-5 md:grid-cols-2">

                <div className="rounded-2xl bg-slate-100 p-5">
                  <p className="text-sm text-gray-500">
                    👤 Student Name
                  </p>

                  <h3 className="mt-2 text-xl font-bold">
                    {student.fullName}
                  </h3>
                </div>

                <div className="rounded-2xl bg-slate-100 p-5">
                  <p className="text-sm text-gray-500">
                    🏫 College
                  </p>

                  <h3 className="mt-2 text-xl font-bold">
                    {student.college || "-"}
                  </h3>
                </div>

                <div className="rounded-2xl bg-slate-100 p-5">
                  <p className="text-sm text-gray-500">
                    📱 Mobile
                  </p>

                  <h3 className="mt-2 text-xl font-bold">
                    {student.mobile || "-"}
                  </h3>
                </div>

                <div className="rounded-2xl bg-slate-100 p-5">
                  <p className="text-sm text-gray-500">
                    📧 Email
                  </p>

                  <h3 className="mt-2 break-all text-lg font-bold">
                    {student.email || "-"}
                  </h3>
                </div>

              </div>

              {/* Usage */}
              <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6">

                {usedCount === 0 && (
                  <h2 className="text-2xl font-bold text-green-700">
                    🌟 First Time Use
                  </h2>
                )}

                {usedCount > 0 &&
                  usedCount < 4 && (
                    <h2 className="text-2xl font-bold text-blue-700">
                      ✅ Used : {usedCount} / 4
                    </h2>
                  )}

                {usedCount >= 4 && (
                  <h2 className="text-2xl font-bold text-red-700">
                    ❌ Limit Reached
                  </h2>
                )}

              </div>

              {/* Current Offer */}
              {offer && (
                <div className="mt-6 rounded-2xl bg-blue-50 p-6">

                  <p className="text-sm text-gray-500">
                    Current Offer
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-blue-700">
                    {offer.title}
                  </h3>

                  <p className="mt-2 text-xl font-bold text-green-600">
                    {offer.discount}
                  </p>

                </div>
              )}

              {/* Redeem Button */}
              <div className="mt-8">

                <button
                  disabled={usedCount >= 4}
                  onClick={redeemOffer}
                  className={`w-full rounded-2xl py-5 text-xl font-bold text-white transition-all ${
                    usedCount >= 4
                      ? "cursor-not-allowed bg-gray-400"
                      : "bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-[1.02] hover:shadow-2xl"
                  }`}
                >
                  {usedCount >= 4
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
