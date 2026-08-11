"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import AdminProtected from "@/components/AdminProtected";

import {
  collection,
  getDocs,
} from "firebase/firestore";

export default function AdminDashboard() {
  const router = useRouter();

  const [students, setStudents] = useState(0);
  const [businesses, setBusinesses] = useState(0);
  const [offers, setOffers] = useState(0);
  const [redemptions, setRedemptions] = useState(0);

  const [pendingStudents, setPendingStudents] = useState(0);
  const [pendingBusinesses, setPendingBusinesses] = useState(0);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const studentSnap = await getDocs(
          collection(db, "students")
        );

        const businessSnap = await getDocs(
          collection(db, "businesses")
        );

        const offerSnap = await getDocs(
          collection(db, "offers")
        );

        const redeemSnap = await getDocs(
          collection(db, "redemptions")
        );

        // Total counts
        setStudents(studentSnap.size);
        setBusinesses(businessSnap.size);
        setOffers(offerSnap.size);
        setRedemptions(redeemSnap.size);

        // Pending Students
        const pendingStudentCount =
          studentSnap.docs.filter((doc) => {
            const data = doc.data();

            return (
              String(data.status || "").toLowerCase() ===
              "pending"
            );
          }).length;

        // Pending Businesses
        const pendingBusinessCount =
          businessSnap.docs.filter((doc) => {
            const data = doc.data();

            return (
              String(data.status || "").toLowerCase() ===
              "pending"
            );
          }).length;

        setPendingStudents(
          pendingStudentCount
        );

        setPendingBusinesses(
          pendingBusinessCount
        );
      } catch (error) {
        console.error(
          "Dashboard loading error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const logout = async () => {
    await signOut(auth);
    router.replace("/admin/login");
  };

  const totalPending =
    pendingStudents + pendingBusinesses;

  return (
    <AdminProtected>
      <main className="min-h-screen bg-gray-100 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">

          {/* ================================
              HEADER
          ================================= */}

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <h1 className="text-4xl font-bold text-blue-700">
                👋 Welcome Super Admin
              </h1>

              <p className="mt-2 text-gray-600">
                SPC Administration Dashboard
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-700"
            >
              Logout
            </button>

          </div>


          {/* ================================
              STATISTICS
          ================================= */}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

            {/* Students */}

            <div className="rounded-3xl bg-white p-8 shadow-xl">
              <p className="text-gray-500">
                👨‍🎓 Total Students
              </p>

              <h2 className="mt-4 text-5xl font-bold text-blue-700">
                {loading ? "..." : students}
              </h2>
            </div>


            {/* Businesses */}

            <div className="rounded-3xl bg-white p-8 shadow-xl">
              <p className="text-gray-500">
                🏪 Total Businesses
              </p>

              <h2 className="mt-4 text-5xl font-bold text-green-700">
                {loading ? "..." : businesses}
              </h2>
            </div>


            {/* Offers */}

            <div className="rounded-3xl bg-white p-8 shadow-xl">
              <p className="text-gray-500">
                🎁 Total Offers
              </p>

              <h2 className="mt-4 text-5xl font-bold text-orange-600">
                {loading ? "..." : offers}
              </h2>
            </div>


            {/* Redemptions */}

            <div className="rounded-3xl bg-white p-8 shadow-xl">
              <p className="text-gray-500">
                🎉 Total Redemptions
              </p>

              <h2 className="mt-4 text-5xl font-bold text-purple-700">
                {loading ? "..." : redemptions}
              </h2>
            </div>

          </div>


          {/* =========================================
              PENDING APPROVALS
          ========================================== */}

          <div className="mt-10">

            <div
              className={`rounded-3xl p-6 shadow-xl md:p-8 ${
                totalPending > 0
                  ? "border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-yellow-50"
                  : "border border-green-200 bg-green-50"
              }`}
            >

              {/* Heading */}

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                <div>

                  <div className="flex items-center gap-3">

                    <span className="text-3xl">
                      {totalPending > 0
                        ? "🔔"
                        : "✅"}
                    </span>

                    <h2
                      className={`text-3xl font-bold ${
                        totalPending > 0
                          ? "text-orange-700"
                          : "text-green-700"
                      }`}
                    >
                      Pending Approvals
                    </h2>

                  </div>

                  <p className="mt-2 text-gray-600">
                    {totalPending > 0
                      ? "New registrations are waiting for your approval."
                      : "All registrations have been reviewed."}
                  </p>

                </div>


                {/* Total Pending Badge */}

                <div
                  className={`rounded-2xl px-7 py-4 text-center shadow ${
                    totalPending > 0
                      ? "bg-orange-500 text-white"
                      : "bg-green-500 text-white"
                  }`}
                >

                  <span className="block text-4xl font-extrabold">
                    {loading ? "..." : totalPending}
                  </span>

                  <span className="text-sm font-bold uppercase">
                    Pending
                  </span>

                </div>

              </div>


              {/* Pending Cards */}

              <div className="mt-6 grid gap-5 md:grid-cols-2">

                {/* Pending Businesses */}

                <Link
                  href="/admin/businesses"
                  className={`group rounded-2xl border p-6 transition hover:-translate-y-1 hover:shadow-lg ${
                    pendingBusinesses > 0
                      ? "border-orange-200 bg-white"
                      : "border-gray-200 bg-white"
                  }`}
                >

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-sm font-semibold text-gray-500">
                        🏪 BUSINESS REGISTRATIONS
                      </p>

                      <h3 className="mt-2 text-2xl font-bold text-green-700">
                        Pending Businesses
                      </h3>

                    </div>

                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-extrabold ${
                        pendingBusinesses > 0
                          ? "bg-orange-100 text-orange-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {loading
                        ? "..."
                        : pendingBusinesses}
                    </div>

                  </div>

                  <div className="mt-5 flex items-center justify-between">

                    <p className="text-gray-600">
                      {pendingBusinesses > 0
                        ? `${pendingBusinesses} business${pendingBusinesses > 1 ? "es" : ""} waiting for approval`
                        : "No pending businesses"}
                    </p>

                    <span className="font-bold text-blue-600 group-hover:underline">
                      Review →
                    </span>

                  </div>

                </Link>


                {/* Pending Students */}

                <Link
                  href="/admin/students"
                  className={`group rounded-2xl border p-6 transition hover:-translate-y-1 hover:shadow-lg ${
                    pendingStudents > 0
                      ? "border-orange-200 bg-white"
                      : "border-gray-200 bg-white"
                  }`}
                >

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-sm font-semibold text-gray-500">
                        👨‍🎓 STUDENT REGISTRATIONS
                      </p>

                      <h3 className="mt-2 text-2xl font-bold text-blue-700">
                        Pending Students
                      </h3>

                    </div>

                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-extrabold ${
                        pendingStudents > 0
                          ? "bg-orange-100 text-orange-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {loading
                        ? "..."
                        : pendingStudents}
                    </div>

                  </div>

                  <div className="mt-5 flex items-center justify-between">

                    <p className="text-gray-600">
                      {pendingStudents > 0
                        ? `${pendingStudents} student${pendingStudents > 1 ? "s" : ""} waiting for approval`
                        : "No pending students"}
                    </p>

                    <span className="font-bold text-blue-600 group-hover:underline">
                      Review →
                    </span>

                  </div>

                </Link>

              </div>

            </div>

          </div>


          {/* ================================
              QUICK ACTIONS
          ================================= */}

          <div className="mt-10 grid gap-6 md:grid-cols-2">

            <Link
              href="/admin/businesses"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-[1.02]"
            >
              <h2 className="text-3xl font-bold text-green-700">
                🏪 Manage Businesses
              </h2>

              <p className="mt-3 text-gray-600">
                Approve, Reject and Manage Businesses
              </p>
            </Link>


            <Link
              href="/admin/students"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-[1.02]"
            >
              <h2 className="text-3xl font-bold text-blue-700">
                👨‍🎓 Manage Students
              </h2>

              <p className="mt-3 text-gray-600">
                View and manage all registered students
              </p>
            </Link>


            <Link
              href="/admin/offers"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-[1.02]"
            >
              <h2 className="text-3xl font-bold text-orange-600">
                🎁 Manage Offers
              </h2>

              <p className="mt-3 text-gray-600">
                View and manage all offers
              </p>
            </Link>


            <Link
              href="/admin/redemptions"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-[1.02]"
            >
              <h2 className="text-3xl font-bold text-purple-700">
                📊 Redemption Reports
              </h2>

              <p className="mt-3 text-gray-600">
                View all redemption history
              </p>
            </Link>

          </div>


          {/* ================================
              PORTAL INFORMATION
          ================================= */}

          <div className="mt-10 rounded-3xl bg-white p-8 shadow-xl">

            <h2 className="text-3xl font-bold text-blue-700">
              🚀 SPC Admin Portal
            </h2>

            <p className="mt-4 text-lg text-gray-600">
              Manage Students, Businesses, Offers and
              Redemptions from one central dashboard.
            </p>

          </div>

        </div>
      </main>
    </AdminProtected>
  );
}