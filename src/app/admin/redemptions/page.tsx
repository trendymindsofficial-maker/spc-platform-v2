"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AdminProtected from "@/components/AdminProtected";
import { db } from "@/lib/firebase";

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

interface Redemption {
  id: string;
  studentName: string;
  businessName: string;
  offerTitle: string;
  discount: string;
  status: string;
}

export default function AdminRedemptions() {

  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRedemptions();
  }, []);

  const loadRedemptions = async () => {

    const snap = await getDocs(
      collection(db, "redemptions")
    );

    const data = snap.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as Redemption[];

    setRedemptions(data);
    setLoading(false);

  };

  const deleteRedemption = async (
    id: string,
    studentName: string
  ) => {

    const ok = window.confirm(
      `Delete redemption of "${studentName}" ?`
    );

    if (!ok) return;

    await deleteDoc(
      doc(db, "redemptions", id)
    );

    loadRedemptions();

  };

  const filteredRedemptions =
    redemptions.filter((item) =>
      item.studentName
        ?.toLowerCase()
        .includes(search.toLowerCase())
    );

  return (

    <AdminProtected>

      <main className="min-h-screen bg-slate-100 p-8">

        <div className="mx-auto max-w-7xl">

          <div className="mb-8 flex items-center justify-between">

            <div>

              <h1 className="text-4xl font-bold text-purple-700">
                🎉 Redemption Management
              </h1>

              <p className="mt-2 text-gray-600">
                View, Search and Manage Redemptions
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
            placeholder="Search Student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-8 w-full rounded-xl border border-gray-300 bg-white p-4 outline-none focus:border-purple-600"
          />

          {loading ? (

            <div className="rounded-3xl bg-white p-10 text-center shadow-xl">

              <h2 className="text-2xl font-bold">
                Loading Redemptions...
              </h2>

            </div>

          ) : (

            <div className="grid gap-6">

              {filteredRedemptions.length === 0 ? (

                <div className="rounded-3xl bg-white p-10 text-center shadow-xl">

                  <h2 className="text-2xl font-bold">
                    No Redemptions Found
                  </h2>

                </div>

              ) : (

                filteredRedemptions.map((item) => (

                  <div
                    key={item.id}
                    className="rounded-3xl bg-white p-6 shadow-xl"
                  >

                    <div className="grid gap-6 md:grid-cols-2">

                      <div>

                        <h2 className="text-3xl font-bold text-purple-700">

                          👨‍🎓 {item.studentName}

                        </h2>

                        <p className="mt-4 text-gray-600">

                          🏪 Business :
                          <span className="font-semibold">
                            {" "}
                            {item.businessName || "-"}
                          </span>

                        </p>

                        <p className="mt-2 text-gray-600">

                          🎁 Offer :
                          <span className="font-semibold">
                            {" "}
                            {item.offerTitle || "-"}
                          </span>

                        </p>

                        <p className="mt-2 text-gray-600">

                          💰 Discount :
                          <span className="font-semibold">
                            {" "}
                            {item.discount || "-"}
                          </span>

                        </p>

                      </div>

                      <div className="flex flex-col items-start justify-center">
                                                <span
                          className={`rounded-full px-5 py-2 font-bold text-white
                            ${
                              item.status === "redeemed"
                                ? "bg-green-600"
                                : "bg-gray-600"
                            }`}
                        >
                          {(item.status || "redeemed").toUpperCase()}
                        </span>

                        <div className="mt-6 flex flex-wrap gap-3">

                          <button
                            className="rounded-xl bg-purple-600 px-5 py-3 font-bold text-white hover:bg-purple-700"
                          >
                            👁 View Details
                          </button>

                          <button
                            onClick={() =>
                              deleteRedemption(
                                item.id,
                                item.studentName
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