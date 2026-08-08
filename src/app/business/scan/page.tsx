"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";

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

  const scannerRef =
    useRef<Html5QrcodeScanner | null>(null);

  const [student, setStudent] =
    useState<Student | null>(null);

  const [offer, setOffer] =
    useState<Offer | null>(null);

  const [usedCount, setUsedCount] =
    useState(0);

  useEffect(() => {

    loadOffer();

    const scanner =
      new Html5QrcodeScanner(
        "reader",
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
        },
        false
      );

    scanner.render(
      onScanSuccess,
      () => {}
    );

    scannerRef.current = scanner;

    return () => {

      scanner
        .clear()
        .catch(() => {});

    };

  }, []);

  const loadOffer = async () => {

    const user =
      auth.currentUser;

    if (!user) return;

    const q = query(
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

    const snap =
      await getDocs(q);

    if (!snap.empty) {

      setOffer({

        id: snap.docs[0].id,

        ...(snap.docs[0].data() as Omit<Offer, "id">),

      });

    }

  };

  const onScanSuccess =
    async (
      decodedText: string
    ) => {

      try {

        const qr =
          JSON.parse(decodedText);

        const studentRef =
          doc(
            db,
            "students",
            qr.studentId
          );

        const studentSnap =
          await getDoc(studentRef);

        if (!studentSnap.exists()) {

          alert(
            "Student Not Found"
          );

          return;

        }
                const studentData = {
          id: studentSnap.id,
          ...(studentSnap.data() as Omit<Student, "id">),
        };

        const user = auth.currentUser;

        if (!user) return;

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

        const activeOffer = {

          id: offerSnap.docs[0].id,

          ...(offerSnap.docs[0].data() as Omit<Offer, "id">),

        };

        setOffer(activeOffer);

        const redeemQuery = query(
          collection(db, "redemptions"),
          where("studentId", "==", studentSnap.id),
          where("offerId", "==", activeOffer.id)
        );

        const redeemSnap = await getDocs(redeemQuery);

        setUsedCount(redeemSnap.size);

        setStudent(studentData);

        await scannerRef.current?.clear();

      } catch (error) {

        console.error(error);

        alert("Invalid QR Code");

      }

    };

    const redeemOffer = async () => {

      if (!student || !offer) {

        alert("Student or Offer not found");

        return;

      }

      if (usedCount >= 4) {

        alert("Offer usage limit reached");

        return;

      }
            await addDoc(
        collection(db, "redemptions"),
        {

          studentId: student.id,
          studentName: student.fullName,
          studentMobile: student.mobile || "",

          businessId: auth.currentUser?.uid,

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

        alert(`✅ Used : ${nextCount} / 4`);

      }

      setStudent(null);

      setUsedCount(0);

      router.replace("/business/dashboard");

    };

    return (

      <BusinessProtected>

        <main className="min-h-screen bg-slate-100 p-8">

          <div className="mx-auto max-w-5xl">

            <div className="mb-8 flex items-center justify-between">

              <h1 className="text-4xl font-bold text-purple-700">

                📷 Scan Student QR

              </h1>

              <button
                onClick={() =>
                  router.push("/business/dashboard")
                }
                className="rounded-xl bg-gray-700 px-6 py-3 font-bold text-white hover:bg-gray-800"
              >
                ← Dashboard
              </button>

            </div>

            <div className="rounded-3xl bg-white p-6 shadow-xl">

              <div id="reader"></div>

            </div>
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

                <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6">

                  {usedCount === 0 && (

                    <h2 className="text-2xl font-bold text-green-700">

                      🌟 First Time Use

                    </h2>

                  )}

                  {usedCount > 0 && usedCount < 4 && (

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

                <div className="mt-8">
                                    <button
                    disabled={usedCount >= 4}
                    onClick={redeemOffer}
                    className={`w-full rounded-2xl py-5 text-xl font-bold text-white transition-all
                      ${
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