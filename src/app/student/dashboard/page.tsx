"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import QRCode from "react-qr-code";

import { auth, db } from "@/lib/firebase";

import {
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

interface Student {
  uid: string;
  fullName: string;
  cardNumber: string;
  college: string;
  course: string;
  year: string;
  mobile: string;
  email: string;
  status: string;
}

export default function StudentDashboard() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [student, setStudent] =
    useState<Student | null>(null);

  const [error, setError] =
    useState("");

  /*
   * Load student details
   */
  const loadStudent = async (
    user: User
  ) => {
    try {
      setError("");

      const studentRef = doc(
        db,
        "students",
        user.uid
      );

      const snap =
        await getDoc(studentRef);

      if (!snap.exists()) {
        setStudent(null);

        setError(
          "Student profile not found."
        );

        return;
      }

      const data = snap.data();

      /*
       * Firebase Auth UID is the
       * real student ID.
       *
       * Do not depend on a uid
       * field inside Firestore.
       */
      const studentData: Student = {
        uid: user.uid,

        fullName:
          data.fullName || "",

        cardNumber:
          data.cardNumber || "",

        college:
          data.college || "",

        course:
          data.course || "",

        year:
          data.year || "",

        mobile:
          data.mobile || "",

        email:
          data.email ||
          user.email ||
          "",

        status:
          data.status || "active",
      };

      setStudent(studentData);
    } catch (err) {
      console.error(
        "Student loading error:",
        err
      );

      setStudent(null);

      setError(
        "Unable to load student details. Please refresh and try again."
      );
    }
  };

  /*
   * Authentication listener
   */
  useEffect(() => {
    let mounted = true;

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!mounted) {
            return;
          }

          if (!user) {
            router.replace(
              "/student/login"
            );

            return;
          }

          /*
           * Keep loading state until
           * Firestore student data loads.
           */
          setLoading(true);

          await loadStudent(user);

          if (mounted) {
            setLoading(false);
          }
        }
      );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [router]);

  /*
   * Logout
   */
  const logout = async () => {
    try {
      await signOut(auth);

      router.replace(
        "/student/login"
      );
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  };

  /*
   * Loading screen
   */
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">

        <div className="rounded-3xl bg-white p-10 text-center shadow-xl">

          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

          <h2 className="text-2xl font-bold text-blue-700">
            Loading Student Profile...
          </h2>

          <p className="mt-2 text-gray-500">
            Please wait...
          </p>

        </div>

      </main>
    );
  }

  /*
   * Error screen
   */
  if (error || !student) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">

        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
            ❌
          </div>

          <h2 className="mt-5 text-2xl font-bold text-red-700">
            Student Details Not Found
          </h2>

          <p className="mt-3 text-gray-600">
            {error ||
              "Unable to load your student profile."}
          </p>

          <button
            onClick={() =>
              window.location.reload()
            }
            className="mt-6 w-full rounded-xl bg-blue-600 py-4 font-bold text-white hover:bg-blue-700"
          >
            🔄 Reload
          </button>

          <button
            onClick={logout}
            className="mt-3 w-full rounded-xl bg-red-600 py-4 font-bold text-white hover:bg-red-700"
          >
            Logout
          </button>

        </div>

      </main>
    );
  }

  /*
   * QR data
   *
   * IMPORTANT:
   * studentId = Firebase Auth UID
   */
  const qrData = JSON.stringify({
    studentId: student.uid,
    cardNumber: student.cardNumber,
    type: "student",
  });

  return (
    <main className="min-h-screen bg-slate-100 p-6">

      <div className="mx-auto max-w-6xl">

        {/* =====================================
            HEADER
        ===================================== */}

        <div className="mb-8 flex items-center justify-between">

          <div>
            <h1 className="text-4xl font-bold text-blue-700">
              Welcome 👋
            </h1>

            <p className="mt-1 text-gray-600">
              {student.fullName}
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700"
          >
            Logout
          </button>

        </div>


        {/* =====================================
            CARD + QR
        ===================================== */}

        <div className="grid gap-6 lg:grid-cols-2">

          {/* Digital SPC Card */}

          <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 p-8 text-white shadow-xl">

            <h2 className="mb-6 text-2xl font-bold">
              💳 Student Privilege Card
            </h2>

            <div className="space-y-4 text-lg">

              <p>
                <strong>Name :</strong>{" "}
                {student.fullName || "-"}
              </p>

              <p>
                <strong>Card Number :</strong>{" "}
                {student.cardNumber || "-"}
              </p>

              <p>
                <strong>College :</strong>{" "}
                {student.college || "-"}
              </p>

              <p>
                <strong>Course :</strong>{" "}
                {student.course || "-"}
              </p>

              <p>
                <strong>Year :</strong>{" "}
                {student.year || "-"}
              </p>

              <p>
                <strong>Mobile :</strong>{" "}
                {student.mobile || "-"}
              </p>

            </div>

          </div>


          {/* QR Card */}

          <div className="rounded-3xl bg-white p-8 shadow-xl">

            <h2 className="mb-6 text-2xl font-bold">
              📱 My QR Code
            </h2>

            <div className="flex flex-col items-center">

              <div className="rounded-2xl bg-white p-3 shadow-sm">

                <QRCode
                  value={qrData}
                  size={220}
                />

              </div>

              <p className="mt-5 text-lg font-bold text-purple-700">
                {student.cardNumber || "-"}
              </p>

              <p className="mt-2 text-center text-sm text-gray-500">
                Show this QR to Business Partner
              </p>

            </div>

          </div>

        </div>


        {/* =====================================
            QUICK ACTIONS
        ===================================== */}

        <div className="mt-10 grid gap-6 md:grid-cols-2">

          {/* Available Offers */}

          <div className="rounded-3xl bg-white p-8 shadow-xl">

            <h2 className="mb-5 text-2xl font-bold">
              🎁 Available Offers
            </h2>

            <p className="mb-6 text-gray-600">
              View all active offers from
              SPC Business Partners.
            </p>

            <button
              onClick={() =>
                router.push(
                  "/student/offers"
                )
              }
              className="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white hover:bg-blue-700"
            >
              🎁 View Offers
            </button>

          </div>


          {/* Account Status */}

          <div className="rounded-3xl bg-white p-8 shadow-xl">

            <h2 className="mb-5 text-2xl font-bold">
              👤 Account Status
            </h2>

            <div className="rounded-2xl bg-green-100 p-5 text-center">

              <p className="text-sm text-gray-600">
                Current Status
              </p>

              <h3 className="mt-2 text-3xl font-bold text-green-700">
                {student.status
                  ? student.status.toUpperCase()
                  : "ACTIVE"}
              </h3>

            </div>

          </div>

        </div>


        {/* =====================================
            FOOTER CARD
        ===================================== */}

        <div className="mt-10 rounded-3xl bg-white p-6 shadow-xl">

          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">

            <div>

              <h3 className="text-xl font-bold">
                Student Privilege Card
              </h3>

              <p className="text-gray-500">
                Show your QR code at partner
                businesses to redeem offers.
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