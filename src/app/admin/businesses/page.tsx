"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AdminProtected from "@/components/AdminProtected";
import { db } from "@/lib/firebase";

import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

interface Business {
  id: string;
  businessName: string;
  ownerName: string;
  mobile: string;
  category: string;
  status: string;
}

export default function AdminBusinesses() {

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {

    const snap = await getDocs(
      collection(db, "businesses")
    );

    const data = snap.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as Business[];

    setBusinesses(data);
    setLoading(false);

  };

  const approveBusiness = async (id: string) => {

    await updateDoc(
      doc(db, "businesses", id),
      {
        status: "approved",
      }
    );

    loadBusinesses();

  };

  const rejectBusiness = async (id: string) => {

    await updateDoc(
      doc(db, "businesses", id),
      {
        status: "rejected",
      }
    );

    loadBusinesses();

  };

  const deleteBusiness = async (
    id: string,
    name: string
  ) => {

    const ok = window.confirm(
      `Delete "${name}" ?`
    );

    if (!ok) return;

    await deleteDoc(
      doc(db, "businesses", id)
    );

    loadBusinesses();

  };

  const filteredBusinesses =
    businesses.filter((business) =>
      business.businessName
        ?.toLowerCase()
        .includes(search.toLowerCase())
    );

  return (

    <AdminProtected>

      <main className="min-h-screen bg-slate-100 p-8">

        <div className="mx-auto max-w-7xl">

          <div className="mb-8 flex items-center justify-between">

            <div>

              <h1 className="text-4xl font-bold text-green-700">
                🏪 Business Management
              </h1>

              <p className="mt-2 text-gray-600">
                Approve, Reject and Manage Businesses
              </p>

            </div>

            <Link
              href="/admin/dashboard"
              className="rounded-xl bg-gray-700 px-6 py-3 font-bold text-white hover:bg-gray-800"
            >
              ← Dashboard
            </Link>

          </div>
                    <input
            type="text"
            placeholder="Search Business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-8 w-full rounded-xl border border-gray-300 bg-white p-4 outline-none focus:border-green-600"
          />

          {loading ? (

            <div className="rounded-3xl bg-white p-10 text-center shadow-xl">

              <h2 className="text-2xl font-bold">
                Loading Businesses...
              </h2>

            </div>

          ) : (

            <div className="grid gap-6">

              {filteredBusinesses.length === 0 ? (

                <div className="rounded-3xl bg-white p-10 text-center shadow-xl">

                  <h2 className="text-2xl font-bold">
                    No Businesses Found
                  </h2>

                </div>

              ) : (

                filteredBusinesses.map((business) => (

                  <div
                    key={business.id}
                    className="rounded-3xl bg-white p-6 shadow-xl"
                  >

                      <div className="grid gap-6 md:grid-cols-2">

                        <div>

                          <h2 className="text-3xl font-bold text-green-700">

                            {business.businessName}

                          </h2>

                          <p className="mt-4 text-gray-600">

                            👤 Owner :
                            <span className="font-semibold">
                              {" "}
                              {business.ownerName}
                            </span>

                          </p>

                          <p className="mt-2 text-gray-600">

                            📱 Mobile :
                            <span className="font-semibold">
                              {" "}
                              {business.mobile}
                            </span>

                          </p>

                          <p className="mt-2 text-gray-600">

                            🏷 Category :
                            <span className="font-semibold">
                              {" "}
                              {business.category}
                            </span>

                          </p>

                        </div>

                        <div className="flex flex-col items-start justify-center">

                                                  <span
                            className={`rounded-full px-5 py-2 font-bold text-white
                              ${
                                business.status === "approved"
                                  ? "bg-green-600"
                                  : business.status === "pending"
                                  ? "bg-orange-500"
                                  : "bg-red-600"
                              }`}
                          >
                            {business.status.toUpperCase()}
                          </span>

                          <div className="mt-6 flex flex-wrap gap-3">

                            <button
                              onClick={() =>
                                approveBusiness(business.id)
                              }
                              className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700"
                            >
                              ✅ Approve
                            </button>

                            <button
                              onClick={() =>
                                rejectBusiness(business.id)
                              }
                              className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-white hover:bg-orange-600"
                            >
                              ❌ Reject
                            </button>

                            <button
                              onClick={() =>
                                deleteBusiness(
                                  business.id,
                                  business.businessName
                                )
                              }
                              className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700"
                            >
                              🗑 Delete
                            </button>

                          </div>

                        </div>

                      </div>

                  </div>
                                  ))

              )}

            </div>

          )}

        </div>

      </main>

    </AdminProtected>

  );
}