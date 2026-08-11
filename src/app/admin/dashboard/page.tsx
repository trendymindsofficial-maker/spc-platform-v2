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

  const [students, setStudents] =
    useState(0);

  const [businesses, setBusinesses] =
    useState(0);

  const [offers, setOffers] =
    useState(0);

  const [redemptions, setRedemptions] =
    useState(0);

  const [categories, setCategories] =
    useState(0);

  const [pendingStudents, setPendingStudents] =
    useState(0);

  const [pendingBusinesses, setPendingBusinesses] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [
        studentSnap,
        businessSnap,
        offerSnap,
        redeemSnap,
        categorySnap,
      ] = await Promise.all([
        getDocs(
          collection(db, "students")
        ),
        getDocs(
          collection(db, "businesses")
        ),
        getDocs(
          collection(db, "offers")
        ),
        getDocs(
          collection(db, "redemptions")
        ),
        getDocs(
          collection(db, "categories")
        ),
      ]);

      setStudents(
        studentSnap.size
      );

      setBusinesses(
        businessSnap.size
      );

      setOffers(
        offerSnap.size
      );

      setRedemptions(
        redeemSnap.size
      );

      setCategories(
        categorySnap.size
      );

      setPendingStudents(
        studentSnap.docs.filter(
          (item) =>
            String(
              item.data().status || ""
            ).toLowerCase() ===
            "pending"
        ).length
      );

      setPendingBusinesses(
        businessSnap.docs.filter(
          (item) =>
            String(
              item.data().status || ""
            ).toLowerCase() ===
            "pending"
        ).length
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

  const logout = async () => {
    await signOut(auth);
    router.replace("/admin/login");
  };

  return (
    <AdminProtected>
      <main className="min-h-screen bg-gray-100 p-6 md:p-10">

        <div className="mx-auto max-w-7xl">

          {/* HEADER */}

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
              className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700"
            >
              Logout
            </button>

          </div>

          {/* STATISTICS */}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">

            <div className="rounded-3xl bg-white p-7 shadow-xl">

              <p className="text-gray-500">
                👨‍🎓 Total Students
              </p>

              <h2 className="mt-4 text-5xl font-bold text-blue-700">
                {loading
                  ? "..."
                  : students}
              </h2>

            </div>

            <div className="rounded-3xl bg-white p-7 shadow-xl">

              <p className="text-gray-500">
                🏪 Total Businesses
              </p>

              <h2 className="mt-4 text-5xl font-bold text-green-700">
                {loading
                  ? "..."
                  : businesses}
              </h2>

            </div>

            <div className="rounded-3xl bg-white p-7 shadow-xl">

              <p className="text-gray-500">
                🎁 Total Offers
              </p>

              <h2 className="mt-4 text-5xl font-bold text-orange-600">
                {loading
                  ? "..."
                  : offers}
              </h2>

            </div>

            <div className="rounded-3xl bg-white p-7 shadow-xl">

              <p className="text-gray-500">
                🎉 Redemptions
              </p>

              <h2 className="mt-4 text-5xl font-bold text-purple-700">
                {loading
                  ? "..."
                  : redemptions}
              </h2>

            </div>

            <div className="rounded-3xl bg-white p-7 shadow-xl">

              <p className="text-gray-500">
                🏷️ Categories
              </p>

              <h2 className="mt-4 text-5xl font-bold text-pink-600">
                {loading
                  ? "..."
                  : categories}
              </h2>

            </div>

          </div>

          {/* PENDING */}

          <div className="mt-8 grid gap-6 md:grid-cols-2">

            <Link
              href="/admin/students"
              className="rounded-3xl border-2 border-orange-200 bg-orange-50 p-7 shadow transition hover:scale-[1.01]"
            >

              <h2 className="text-2xl font-bold text-orange-700">
                ⏳ Student Pending Approvals
              </h2>

              <p className="mt-3 text-gray-600">
                {pendingStudents} student
                {pendingStudents !== 1
                  ? "s"
                  : ""} waiting for approval.
              </p>

              <span className="mt-5 inline-block rounded-xl bg-orange-500 px-5 py-3 font-bold text-white">
                Review Students →
              </span>

            </Link>

            <Link
              href="/admin/businesses"
              className="rounded-3xl border-2 border-orange-200 bg-orange-50 p-7 shadow transition hover:scale-[1.01]"
            >

              <h2 className="text-2xl font-bold text-orange-700">
                ⏳ Business Pending Approvals
              </h2>

              <p className="mt-3 text-gray-600">
                {pendingBusinesses} business
                {pendingBusinesses !== 1
                  ? "es"
                  : ""} waiting for approval.
              </p>

              <span className="mt-5 inline-block rounded-xl bg-orange-500 px-5 py-3 font-bold text-white">
                Review Businesses →
              </span>

            </Link>

          </div>

          {/* QUICK ACTIONS */}

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
                View, approve and manage students
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
              href="/admin/categories"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-[1.02]"
            >

              <h2 className="text-3xl font-bold text-purple-700">
                🏷️ Manage Categories
              </h2>

              <p className="mt-3 text-gray-600">
                Add, edit and delete offer categories
              </p>

            </Link>

            <Link
              href="/admin/redemptions"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-[1.02]"
            >

              <h2 className="text-3xl font-bold text-pink-700">
                📊 Redemption Reports
              </h2>

              <p className="mt-3 text-gray-600">
                View all redemption history
              </p>

            </Link>

          </div>

          {/* PORTAL INFO */}

          <div className="mt-10 rounded-3xl bg-white p-8 shadow-xl">

            <h2 className="text-3xl font-bold text-blue-700">
              🚀 SPC Admin Portal
            </h2>

            <p className="mt-4 text-lg text-gray-600">
              Manage Students, Businesses,
              Offers, Categories and Redemptions
              from one central dashboard.
            </p>

          </div>

        </div>

      </main>
    </AdminProtected>
  );
}