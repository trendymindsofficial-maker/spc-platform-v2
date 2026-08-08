"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import QRCode from "react-qr-code";

import { auth, db } from "@/lib/firebase";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

export default function StudentDashboard() {

  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [student, setStudent] = useState<any>(null);

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(auth, async (user) => {

        if (!user) {
          router.replace("/student/login");
          return;
        }

        const snap = await getDoc(
          doc(db, "students", user.uid)
        );

        if (snap.exists()) {
          setStudent(snap.data());
        }

        setLoading(false);

      });

    return () => unsubscribe();

  }, [router]);

  const logout = async () => {

    await signOut(auth);

    router.replace("/student/login");

  };

  if (loading) {

    return (
      <div className="flex min-h-screen items-center justify-center text-2xl font-bold">
        Loading...
      </div>
    );

  }

  return (

    <main className="min-h-screen bg-slate-100 p-6">

      <div className="mx-auto max-w-6xl">

        <div className="mb-8 flex items-center justify-between">

          <div>

            <h1 className="text-4xl font-bold text-blue-700">
              Welcome 👋
            </h1>

            <p className="text-gray-600">
              {student?.fullName}
            </p>

          </div>

          <button
            onClick={logout}
            className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white"
          >
            Logout
          </button>

        </div>
                <div className="grid gap-6 lg:grid-cols-2">

          {/* Digital SPC Card */}

          <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 p-8 text-white shadow-xl">

            <h2 className="mb-6 text-2xl font-bold">
              💳 Student Privilege Card
            </h2>

            <div className="space-y-3 text-lg">

              <p>
                <strong>Name :</strong> {student?.fullName}
              </p>

              <p>
                <strong>Card Number :</strong> {student?.cardNumber}
              </p>

              <p>
                <strong>College :</strong> {student?.college}
              </p>

              <p>
                <strong>Course :</strong> {student?.course}
              </p>

              <p>
                <strong>Year :</strong> {student?.year}
              </p>

              <p>
                <strong>Mobile :</strong> {student?.mobile}
              </p>

            </div>

          </div>

          {/* QR Card */}

          <div className="rounded-3xl bg-white p-8 shadow-xl">

            <h2 className="mb-6 text-2xl font-bold">
              📱 My QR Code
            </h2>

            <div className="flex flex-col items-center">

              <QRCode
                value={JSON.stringify({
                  studentId: student?.uid,
                  cardNumber: student?.cardNumber,
                  type: "student",
                })}
                size={220}
              />

              <p className="mt-5 text-lg font-bold">
                {student?.cardNumber}
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Show this QR to Business Partner
              </p>

            </div>

          </div>

        </div>
                {/* Quick Actions */}

        <div className="mt-10 grid gap-6 md:grid-cols-2">

          <div className="rounded-3xl bg-white p-8 shadow-xl">

            <h2 className="mb-5 text-2xl font-bold">
              🎁 Available Offers
            </h2>

            <p className="mb-6 text-gray-600">
              View all active offers from SPC Business Partners.
            </p>

            <button
              onClick={() => router.push("/student/offers")}
              className="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white hover:bg-blue-700"
            >
              🎁 View Offers
            </button>

          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl">

            <h2 className="mb-5 text-2xl font-bold">
              👤 Account Status
            </h2>

            <div className="rounded-2xl bg-green-100 p-5 text-center">

              <p className="text-sm text-gray-600">
                Current Status
              </p>

              <h3 className="mt-2 text-3xl font-bold text-green-700">
                {student?.status?.toUpperCase()}
              </h3>

            </div>

          </div>

        </div>
                <div className="mt-10 rounded-3xl bg-white p-6 shadow-xl">

          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">

            <div>

              <h3 className="text-xl font-bold">
                Student Privilege Card
              </h3>

              <p className="text-gray-500">
                Show your QR code at partner businesses to redeem offers.
              </p>

            </div>

            <button
              onClick={logout}
              className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700"
            >
              Logout
            </button>

          </div>

        </div>

      </div>

    </main>

  );
}