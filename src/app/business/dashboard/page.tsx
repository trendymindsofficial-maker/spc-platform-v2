"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import BusinessProtected from "@/components/BusinessProtected";

import { auth, db } from "@/lib/firebase";

import { signOut, onAuthStateChanged } from "firebase/auth";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

export default function BusinessDashboard() {

  const router = useRouter();

  const [businessName, setBusinessName] =
    useState("Business");

  const [totalOffers, setTotalOffers] =
    useState(0);

  const [totalScans, setTotalScans] =
    useState(0);

  const [totalRedeemed, setTotalRedeemed] =
    useState(0);

  const logout = async () => {

    await signOut(auth);

    router.replace("/business/login");

  };

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {

          if (!user) return;

          const businessSnap =
            await getDoc(
              doc(
                db,
                "businesses",
                user.uid
              )
            );

          if (businessSnap.exists()) {

            setBusinessName(
              businessSnap.data()
                .businessName || "Business"
            );

          }

          const offersSnap =
            await getDocs(
              query(
                collection(db, "offers"),
                where(
                  "businessId",
                  "==",
                  user.uid
                )
              )
            );

          setTotalOffers(
            offersSnap.size
          );

          const redeemSnap =
            await getDocs(
              query(
                collection(
                  db,
                  "redemptions"
                ),
                where(
                  "businessId",
                  "==",
                  user.uid
                )
              )
            );

          setTotalScans(
            redeemSnap.size
          );

          setTotalRedeemed(
            redeemSnap.size
          );

        }
      );

    return () => unsubscribe();

  }, []);

  return (

    <BusinessProtected>

      <main className="min-h-screen bg-slate-100 p-8">

        <div className="mx-auto max-w-6xl">

          <div className="mb-8 flex items-center justify-between">

            <div>

              <h1 className="text-4xl font-bold text-green-700">

                👋 Welcome {businessName}

              </h1>

              <p className="mt-2 text-gray-600">

                Business Dashboard

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

          <div className="grid gap-6 md:grid-cols-3">

            <div className="rounded-3xl bg-white p-8 shadow-xl">

              <p className="text-gray-500">
                🎁 Total Offers
              </p>

              <h2 className="mt-4 text-5xl font-bold text-green-700">
                {totalOffers}
              </h2>

            </div>

            <div className="rounded-3xl bg-white p-8 shadow-xl">

              <p className="text-gray-500">
                📷 Total Scans
              </p>

              <h2 className="mt-4 text-5xl font-bold text-blue-700">
                {totalScans}
              </h2>

            </div>

            <div className="rounded-3xl bg-white p-8 shadow-xl">

              <p className="text-gray-500">
                🎉 Total Redeemed
              </p>

              <h2 className="mt-4 text-5xl font-bold text-orange-600">
                {totalRedeemed}
              </h2>

            </div>

          </div>

          {/* Quick Actions */}

          <div className="mt-10 grid gap-6 md:grid-cols-2">

            <Link
              href="/business/add-offer"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-105"
            >
              <h2 className="text-2xl font-bold text-green-700">
                ➕ Add Offer
              </h2>

              <p className="mt-3 text-gray-600">
                Create new offers for students.
              </p>

            </Link>

            <Link
              href="/business/my-offers"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-105"
            >
              <h2 className="text-2xl font-bold text-blue-700">
                🎁 My Offers
              </h2>

              <p className="mt-3 text-gray-600">
                View and manage your offers.
              </p>

            </Link>
                        <Link
              href="/business/scan"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-105"
            >
              <h2 className="text-2xl font-bold text-purple-700">
                📷 Redeem Student Offer
              </h2>

              <p className="mt-3 text-gray-600">
                Redeem Student Offer here.
              </p>

            </Link>

            <Link
              href="/business/history"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-105"
            >
              <h2 className="text-2xl font-bold text-orange-700">
                📊 Redemption History
              </h2>

              <p className="mt-3 text-gray-600">
                View all redeemed offer history.
              </p>

            </Link>

          </div>

          <div className="mt-10 rounded-3xl bg-white p-8 shadow-xl">

            <h2 className="text-3xl font-bold text-green-700">
              🚀 SPC Business Portal
            </h2>

            <p className="mt-4 text-lg text-gray-600">
              Manage your offers, scan student QR codes and track all
              redemptions from one secure dashboard.
            </p>

          </div>
                  </div>

      </main>

    </BusinessProtected>

  );

}