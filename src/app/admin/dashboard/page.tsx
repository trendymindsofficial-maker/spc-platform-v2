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

        setStudents(studentSnap.size);
        setBusinesses(businessSnap.size);
        setOffers(offerSnap.size);
        setRedemptions(redeemSnap.size);
      } catch (error) {
        console.error("Dashboard loading error:", error);
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

  return (
    <AdminProtected>
      <main className="min-h-screen bg-gray-100 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">

          {/* Header */}
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

          {/* Statistics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-3xl bg-white p-8 shadow-xl">
              <p className="text-gray-500">
                👨‍🎓 Total Students
              </p>

              <h2 className="mt-4 text-5xl font-bold text-blue-700">
                {loading ? "..." : students}
              </h2>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-xl">
              <p className="text-gray-500">
                🏪 Total Businesses
              </p>

              <h2 className="mt-4 text-5xl font-bold text-green-700">
                {loading ? "..." : businesses}
              </h2>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-xl">
              <p className="text-gray-500">
                🎁 Total Offers
              </p>

              <h2 className="mt-4 text-5xl font-bold text-orange-600">
                {loading ? "..." : offers}
              </h2>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-xl">
              <p className="text-gray-500">
                🎉 Total Redemptions
              </p>

              <h2 className="mt-4 text-5xl font-bold text-purple-700">
                {loading ? "..." : redemptions}
              </h2>
            </div>

          </div>

          {/* Quick Actions */}
          <div className="mt-10 grid gap-6 md:grid-cols-2">

            <Link
              href="/admin/businesses"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-105"
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
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-105"
            >
              <h2 className="text-3xl font-bold text-blue-700">
                👨‍🎓 Manage Students
              </h2>

              <p className="mt-3 text-gray-600">
                View all registered students
              </p>
            </Link>

            <Link
              href="/admin/offers"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-105"
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
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-105"
            >
              <h2 className="text-3xl font-bold text-purple-700">
                📊 Redemption Reports
              </h2>

              <p className="mt-3 text-gray-600">
                View all redemption history
              </p>
            </Link>

          </div>

          {/* Portal Information */}
          <div className="mt-10 rounded-3xl bg-white p-8 shadow-xl">

            <h2 className="text-3xl font-bold text-blue-700">
              🚀 SPC Admin Portal
            </h2>

            <p className="mt-4 text-lg text-gray-600">
              Manage Students, Businesses, Offers and Redemptions
              from one central dashboard.
            </p>

          </div>

        </div>
      </main>
    </AdminProtected>
  );
}
