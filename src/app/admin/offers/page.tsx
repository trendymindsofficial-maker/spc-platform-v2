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

interface Offer {
  id: string;
  title: string;
  discount: string;
  category: string;
  businessName: string;
  status: string;
}

export default function AdminOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    const snap = await getDocs(
      collection(db, "offers")
    );

    const data = snap.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as Offer[];

    setOffers(data);
    setLoading(false);
  };

  const deleteOffer = async (
    id: string,
    title: string
  ) => {

    const ok = window.confirm(
      `Delete "${title}" ?`
    );

    if (!ok) return;

    await deleteDoc(
      doc(db, "offers", id)
    );

    loadOffers();

  };

  const filteredOffers =
    offers.filter((offer) =>
      offer.title
        ?.toLowerCase()
        .includes(search.toLowerCase())
    );

  return (

    <AdminProtected>

      <main className="min-h-screen bg-slate-100 p-8">

        <div className="mx-auto max-w-7xl">

          <div className="mb-8 flex items-center justify-between">

            <div>

              <h1 className="text-4xl font-bold text-orange-600">
                🎁 Offer Management
              </h1>

              <p className="mt-2 text-gray-600">
                View, Search and Manage Offers
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
            placeholder="Search Offers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-8 w-full rounded-xl border border-gray-300 bg-white p-4 outline-none focus:border-orange-600"
          />

          {loading ? (

            <div className="rounded-3xl bg-white p-10 text-center shadow-xl">

              <h2 className="text-2xl font-bold">
                Loading Offers...
              </h2>

            </div>

          ) : (

            <div className="grid gap-6">

              {filteredOffers.length === 0 ? (

                <div className="rounded-3xl bg-white p-10 text-center shadow-xl">

                  <h2 className="text-2xl font-bold">
                    No Offers Found
                  </h2>

                </div>

              ) : (

                filteredOffers.map((offer) => (

                  <div
                    key={offer.id}
                    className="rounded-3xl bg-white p-6 shadow-xl"
                  >

                    <div className="grid gap-6 md:grid-cols-2">

                      <div>

                        <h2 className="text-3xl font-bold text-orange-600">

                          {offer.title}

                        </h2>

                        <p className="mt-4 text-gray-600">

                          💰 Discount :
                          <span className="font-semibold">
                            {" "}
                            {offer.discount || "-"}
                          </span>

                        </p>

                        <p className="mt-2 text-gray-600">

                          📂 Category :
                          <span className="font-semibold">
                            {" "}
                            {offer.category || "-"}
                          </span>

                        </p>

                        <p className="mt-2 text-gray-600">

                          🏪 Business :
                          <span className="font-semibold">
                            {" "}
                            {offer.businessName || "-"}
                          </span>

                        </p>

                      </div>

                      <div className="flex flex-col items-start justify-center">
                                                <span
                          className={`rounded-full px-5 py-2 font-bold text-white
                            ${
                              offer.status === "active"
                                ? "bg-green-600"
                                : "bg-red-600"
                            }`}
                        >
                          {(offer.status || "active").toUpperCase()}
                        </span>

                        <div className="mt-6 flex flex-wrap gap-3">

                          <button
                            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
                          >
                            👁 View
                          </button>

                          <button
                            onClick={() =>
                              deleteOffer(
                                offer.id,
                                offer.title
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