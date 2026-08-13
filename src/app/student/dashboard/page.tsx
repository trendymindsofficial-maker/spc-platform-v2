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

interface Student {
  uid: string;
  fullName?: string;
  cardNumber?: string;
  college?: string;
  course?: string;
  year?: string;
  mobile?: string;
  email?: string;
  status?: string;
}

export default function StudentDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] =
    useState<Student | null>(null);

  const [error, setError] = useState("");

  /*
   * ==========================================
   * LOAD STUDENT DETAILS
   * ==========================================
   */

  const loadStudent = async (
    uid: string,
    email?: string | null
  ) => {
    const studentRef = doc(
      db,
      "students",
      uid
    );

    /*
     * Firebase / Firestore can sometimes
     * take a moment after navigation.
     *
     * Try a few times instead of immediately
     * showing "Student Details Not Available".
     */

    let lastError: unknown = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const snap =
          await getDoc(studentRef);

        if (snap.exists()) {
          const data = snap.data();

          const studentData: Student = {
            uid,

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
              email ||
              "",

            status:
              data.status || "pending",
          };

          setStudent(studentData);
          setError("");

          return true;
        }

        /*
         * Document not found.
         *
         * Wait and try again because the page may
         * have loaded before Firestore/Auth state
         * is fully settled.
         */

        if (attempt < 3) {
          await new Promise((resolve) =>
            setTimeout(resolve, 800)
          );
        }
      } catch (err) {
        lastError = err;

        console.error(
          `Student loading attempt ${attempt} failed:`,
          err
        );

        if (attempt < 3) {
          await new Promise((resolve) =>
            setTimeout(resolve, 800)
          );
        }
      }
    }

    console.error(
      "Unable to load student document:",
      lastError
    );

    return false;
  };

  /*
   * ==========================================
   * AUTH + STUDENT LOAD
   * ==========================================
   */

  useEffect(() => {
    let mounted = true;

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!mounted) return;

          /*
           * User is not logged in
           */

          if (!user) {
            router.replace(
              "/student/login"
            );
            return;
          }

          /*
           * Auth is ready.
           *
           * Now load the student document.
           */

          setLoading(true);
          setError("");

          const success =
            await loadStudent(
              user.uid,
              user.email
            );

          if (!mounted) return;

          if (!success) {
            setError(
              "Unable to load your student details."
            );
          }

          setLoading(false);
        }
      );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [router]);

  /*
   * ==========================================
   * LOGOUT
   * ==========================================
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
   * ==========================================
   * RETRY
   * ==========================================
   */

  const retryLoading = async () => {
    const user = auth.currentUser;

    if (!user) {
      router.replace(
        "/student/login"
      );
      return;
    }

    setLoading(true);
    setError("");

    const success =
      await loadStudent(
        user.uid,
        user.email
      );

    if (success) {
      setError("");
    } else {
      setError(
        "Unable to load your student details. Please try again."
      );
    }

    setLoading(false);
  };

  /*
   * ==========================================
   * LOADING SCREEN
   * ==========================================
   */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-xl">

          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

          <h2 className="text-2xl font-bold text-blue-700">
            Loading Student Dashboard...
          </h2>

          <p className="mt-2 text-gray-500">
            Please wait...
          </p>

        </div>
      </main>
    );
  }

  /*
   * ==========================================
   * ERROR SCREEN
   * ==========================================
   *
   * This is shown only after the retry attempts
   * are completed.
   */

  if (!student) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">

        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
            ⚠️
          </div>

          <h2 className="mt-5 text-2xl font-bold text-red-600">
            Student Details Not Available
          </h2>

          <p className="mt-3 text-gray-600">
            {error ||
              "We could not load your SPC student details."}
          </p>

          <button
            onClick={retryLoading}
            className="mt-6 w-full rounded-xl bg-blue-600 py-4 font-bold text-white transition hover:bg-blue-700"
          >
            🔄 Try Again
          </button>

          <button
            onClick={logout}
            className="mt-3 w-full rounded-xl bg-red-600 py-4 font-bold text-white transition hover:bg-red-700"
          >
            Logout
          </button>

        </div>

      </main>
    );
  }

  /*
   * ==========================================
   * QR DATA
   * ==========================================
   */

  const qrValue = JSON.stringify({
    studentId: student.uid,
    cardNumber:
      student.cardNumber || "",
    type: "student",
  });

  /*
   * ==========================================
   * DASHBOARD
   * ==========================================
   */

  return (
    <main className="min-h-screen bg-slate-100 p-6">

      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <h1 className="text-4xl font-bold text-blue-700">
              Welcome 👋
            </h1>

            <p className="text-gray-600">
              {student.fullName}
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-700"
          >
            Logout
          </button>

        </div>

        {/* CARD + QR */}

        <div className="grid gap-6 lg:grid-cols-2">

          {/* DIGITAL SPC CARD */}

          <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 p-8 text-white shadow-xl">

            <h2 className="mb-6 text-2xl font-bold">
              💳 Student Benefit Card
            </h2>

            <div className="space-y-3 text-lg">

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

          {/* QR */}

          <div className="rounded-3xl bg-white p-8 shadow-xl">

            <h2 className="mb-6 text-2xl font-bold">
              📱 My QR Code
            </h2>

            <div className="flex flex-col items-center">

              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <QRCode
                  value={qrValue}
                  size={220}
                />
              </div>

              <p className="mt-5 text-lg font-bold">
                {student.cardNumber || "-"}
              </p>

              <p className="mt-2 text-center text-sm text-gray-500">
                Show this QR to Business Partner
              </p>

            </div>

          </div>

        </div>

        {/* QUICK ACTIONS */}

        <div className="mt-10 grid gap-6 md:grid-cols-2">

          {/* OFFERS */}

          <div className="rounded-3xl bg-white p-8 shadow-xl">

            <h2 className="mb-5 text-2xl font-bold">
              🎁 Available Offers
            </h2>

            <p className="mb-6 text-gray-600">
              View all active offers from
              SBC Business Partners.
            </p>

            <button
              onClick={() =>
                router.push(
                  "/student/offers"
                )
              }
              className="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white transition hover:bg-blue-700"
            >
              🎁 View Offers
            </button>

          </div>

          {/* ACCOUNT STATUS */}

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
                  : "PENDING"}
              </h3>

            </div>

          </div>

        </div>

        {/* BOTTOM */}

        <div className="mt-10 rounded-3xl bg-white p-6 shadow-xl">

          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">

            <div>

              <h3 className="text-xl font-bold">
                Student Benefit Card
              </h3>

              <p className="text-gray-500">
                Show your QR code at partner
                businesses to redeem offers.
              </p>

            </div>

            <button
              onClick={logout}
              className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-700"
            >
              Logout
            </button>

          </div>

        </div>

      </div>

    </main>
  );
}