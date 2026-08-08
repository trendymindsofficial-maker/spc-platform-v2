"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BusinessProtected from "@/components/BusinessProtected";

import { auth, db } from "@/lib/firebase";

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";

interface Redemption {
  id: string;
  studentName: string;
  studentMobile: string;
  offerTitle: string;
  discount: string;
  redeemedAt?: any;
}

export default function RedemptionHistory() {

  const router = useRouter();

  const [history, setHistory] =
    useState<Redemption[]>([]);

  const [filteredHistory, setFilteredHistory] =
    useState<Redemption[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    loadHistory();

  }, []);

  useEffect(() => {

    const filtered = history.filter((item) =>
      item.studentName
        ?.toLowerCase()
        .includes(search.toLowerCase())
    );

    setFilteredHistory(filtered);

  }, [search, history]);

  const loadHistory = async () => {

    const user = auth.currentUser;

    if (!user) return;

    const q = query(
      collection(db, "redemptions"),
      where(
        "businessId",
        "==",
        user.uid
      ),
      orderBy(
        "redeemedAt",
        "desc"
      )
    );

    const snap =
      await getDocs(q);

    setHistory(

      snap.docs.map((item) => ({

        id: item.id,

        ...item.data(),

      })) as Redemption[]

    );

    setLoading(false);

  };

  return (

    <BusinessProtected>

      <main className="min-h-screen bg-slate-100 p-6">

        <div className="mx-auto max-w-7xl">

          <div className="mb-8 flex items-center justify-between">

            <h1 className="text-4xl font-bold text-orange-700">

              📊 Redemption History

            </h1>

            <button
              onClick={() =>
                router.push("/business/dashboard")
              }
              className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
            >
              🏠 Dashboard
            </button>

          </div>
                    <input
            type="text"
            placeholder="Search Student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-8 w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-orange-600"
          />

          {loading ? (

            <div className="rounded-3xl bg-white p-10 text-center shadow-xl">

              <h2 className="text-2xl font-bold">
                Loading Redemption History...
              </h2>

            </div>

          ) : filteredHistory.length === 0 ? (

            <div className="rounded-3xl bg-white p-10 text-center shadow-xl">

              <h2 className="text-3xl font-bold">
                No Redemption History
              </h2>

              <p className="mt-3 text-gray-500">
                No redeemed offers found.
              </p>

            </div>

          ) : (

            <div className="grid gap-6">

              {filteredHistory.map((item) => (

                <div
                  key={item.id}
                  className="rounded-3xl bg-white p-6 shadow-xl"
                >

                  <div className="grid gap-6 md:grid-cols-2">

                    <div>

                      <h2 className="text-2xl font-bold text-orange-700">

                        👨‍🎓 {item.studentName}

                      </h2>

                      <p className="mt-4 text-gray-600">

                        📱 Mobile :
                        <span className="font-semibold">
                          {" "}
                          {item.studentMobile || "-"}
                        </span>

                      </p>

                      <p className="mt-2 text-gray-600">

                        🎁 Offer :
                        <span className="font-semibold">
                          {" "}
                          {item.offerTitle}
                        </span>

                      </p>

                      <p className="mt-2 text-gray-600">

                        💰 Discount :
                        <span className="font-semibold">
                          {" "}
                          {item.discount}
                        </span>

                      </p>

                    </div>

                    <div className="flex flex-col justify-center">
                                              <div className="rounded-2xl bg-orange-50 p-5">

                        <p className="text-sm text-gray-500">
                          📅 Redeemed On
                        </p>

                        <h3 className="mt-2 text-lg font-bold text-orange-700">

                          {item.redeemedAt?.toDate
                            ? item.redeemedAt
                                .toDate()
                                .toLocaleString()
                            : "-"}

                        </h3>

                      </div>

                      <div className="mt-4">

                        <span className="rounded-full bg-green-100 px-5 py-2 font-bold text-green-700">

                          ✅ Redeemed

                        </span>

                      </div>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          )}

          <div className="mt-10 rounded-3xl bg-white p-6 shadow-xl">

            <div className="flex items-center justify-between">

              <div>

                <h2 className="text-2xl font-bold">
                  Total Redemptions
                </h2>

                <p className="mt-2 text-gray-500">
                  Total redeemed offers by your business.
                </p>

              </div>

              <div className="rounded-2xl bg-orange-100 px-6 py-4">

                <span className="text-3xl font-bold text-orange-700">

                  {history.length}

                </span>

              </div>

            </div>

          </div>
                   </div>

      </main>

    </BusinessProtected>

  );

}         