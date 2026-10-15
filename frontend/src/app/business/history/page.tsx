
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BusinessProtected from "@/components/BusinessProtected";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

interface Redemption {
  id: string;
  studentName: string;
  studentMobile: string;
  studentCardNumber?: string;
  offerTitle: string;
  discount: string;
  redeemedAt?: any;
  businessId?: string;
  status?: string;
}

export default function RedemptionHistory() {
  const router = useRouter();

  const [history, setHistory] = useState<Redemption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // REAL-TIME BUSINESS REDEMPTION HISTORY
  useEffect(() => {
    let unsubscribeHistory: (() => void) | undefined;
    let active = true;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!active) return;

      // Clean up any previous business listener.
      unsubscribeHistory?.();
      unsubscribeHistory = undefined;

      if (!user) {
        setLoading(false);
        router.replace("/business/login");
        return;
      }

      setLoading(true);
      setError("");

      const q = query(
        collection(db, "redemptions"),
        where("businessId", "==", user.uid)
      );

      unsubscribeHistory = onSnapshot(
        q,
        (snapshot) => {
          if (!active) return;

          const data: Redemption[] = snapshot.docs.map((item) => {
            const record = item.data();

            return {
              id: item.id,
              studentName: record.studentName || "",
              studentMobile: record.studentMobile || "",
              studentCardNumber:
                record.studentCardNumber ||
                record.cardNumber ||
                "",
              offerTitle: record.offerTitle || "",
              discount: record.discount || "",
              redeemedAt: record.redeemedAt,
              businessId: record.businessId || "",
              status: record.status || "redeemed",
            };
          });

          // Newest records first.
          data.sort((a, b) => {
            const timeA =
              a.redeemedAt?.toMillis?.() || 0;
            const timeB =
              b.redeemedAt?.toMillis?.() || 0;

            return timeB - timeA;
          });

          setHistory(data);
          setError("");
          setLoading(false);
        },
        (err) => {
          console.error("Live redemption history error:", err);

          if (!active) return;

          setError(
            "Unable to load redemption history. Please try again."
          );
          setLoading(false);
        }
      );
    });

    return () => {
      active = false;
      unsubscribeAuth();
      unsubscribeHistory?.();
    };
  }, [router]);

  // SEARCH
  const searchText = search.trim().toLowerCase();

  const filteredHistory = history.filter((item) => {
    if (!searchText) return true;

    return (
      item.studentName.toLowerCase().includes(searchText) ||
      item.studentMobile.toLowerCase().includes(searchText) ||
      (item.studentCardNumber || "")
        .toLowerCase()
        .includes(searchText) ||
      item.offerTitle.toLowerCase().includes(searchText)
    );
  });

  // DATE FORMAT
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Processing...";

    try {
      const date =
        typeof timestamp?.toDate === "function"
          ? timestamp.toDate()
          : timestamp instanceof Date
            ? timestamp
            : null;

      if (!date || Number.isNaN(date.getTime())) {
        return "Processing...";
      }

      return date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      });
    } catch {
      return "Processing...";
    }
  };

  // Manual refresh is optional; the live listener updates automatically.
  const refreshHistory = () => {
    window.location.reload();
  };

  return (
    <BusinessProtected>
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl">
          {/* HEADER */}
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-orange-700">
                📊 Redemption History
              </h1>

              <p className="mt-2 text-gray-600">
                View student coupons generated for your business.
              </p>

              <p className="mt-2 text-sm font-semibold text-green-700">
                🟢 Live updates enabled
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={refreshHistory}
                disabled={loading}
                className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50"
              >
                🔄 Refresh
              </button>

              <button
                onClick={() => router.push("/business/dashboard")}
                className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
              >
                🏠 Dashboard
              </button>
            </div>
          </div>

          {/* SEARCH */}
          <div className="mb-8">
            <input
              type="text"
              placeholder="🔍 Search Student / Mobile / SBC Number / Offer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 bg-white p-5 text-lg outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          {/* ERROR */}
          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
              <h2 className="text-xl font-bold text-red-700">
                ❌ {error}
              </h2>

              <button
                onClick={refreshHistory}
                className="mt-4 rounded-xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700"
              >
                🔄 Try Again
              </button>
            </div>
          )}

          {/* LOADING */}
          {loading ? (
            <div className="rounded-3xl bg-white p-12 text-center shadow-xl">
              <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />

              <h2 className="text-2xl font-bold">
                Loading Redemption History...
              </h2>

              <p className="mt-2 text-gray-500">
                Please wait...
              </p>
            </div>
          ) : filteredHistory.length === 0 ? (
            /* EMPTY */
            <div className="rounded-3xl bg-white p-14 text-center shadow-xl">
              <div className="text-6xl">🎫</div>

              <h2 className="mt-5 text-3xl font-bold">
                {search
                  ? "No Matching Coupons"
                  : "No Redemption History"}
              </h2>

              <p className="mt-3 text-gray-500">
                {search
                  ? "Try a different student name, mobile number, SBC number or offer name."
                  : "Newly generated coupons for your business will appear here automatically."}
              </p>
            </div>
          ) : (
            /* COUPON HISTORY */
            <div className="grid gap-6">
              {filteredHistory.map((item, index) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-3xl bg-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
                >
                  {/* TOP BAR */}
                  <div className="flex flex-col gap-3 bg-gradient-to-r from-orange-500 to-red-500 p-5 text-white md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold opacity-90">
                        Coupon #{filteredHistory.length - index}
                      </p>

                      <h2 className="text-2xl font-bold">
                        👨‍🎓 {item.studentName || "SBC Student"}
                      </h2>
                    </div>

                    <span className="w-fit rounded-full bg-white px-5 py-2 font-bold text-green-700">
                      ✅ Coupon Generated
                    </span>
                  </div>

                  {/* COUPON DETAILS */}
                  <div className="p-6">
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-2xl bg-slate-100 p-5">
                        <p className="text-sm font-semibold text-gray-500">
                          👤 Student Name
                        </p>
                        <h3 className="mt-2 text-lg font-bold text-gray-900">
                          {item.studentName || "-"}
                        </h3>
                      </div>

                      <div className="rounded-2xl bg-purple-50 p-5">
                        <p className="text-sm font-semibold text-purple-600">
                          🎫 SBC Pass Number
                        </p>
                        <h3 className="mt-2 text-lg font-bold text-purple-800">
                          {item.studentCardNumber || "-"}
                        </h3>
                      </div>

                      <div className="rounded-2xl bg-blue-50 p-5">
                        <p className="text-sm font-semibold text-blue-600">
                          📱 Mobile
                        </p>
                        <h3 className="mt-2 text-lg font-bold text-blue-800">
                          {item.studentMobile || "-"}
                        </h3>
                      </div>

                      <div className="rounded-2xl bg-green-50 p-5">
                        <p className="text-sm font-semibold text-green-600">
                          🎁 Offer
                        </p>
                        <h3 className="mt-2 text-lg font-bold text-green-800">
                          {item.offerTitle || "-"}
                        </h3>
                      </div>

                      <div className="rounded-2xl bg-yellow-50 p-5">
                        <p className="text-sm font-semibold text-yellow-700">
                          💰 Discount
                        </p>
                        <h3 className="mt-2 text-lg font-bold text-yellow-800">
                          {item.discount || "-"}
                        </h3>
                      </div>

                      <div className="rounded-2xl bg-orange-50 p-5">
                        <p className="text-sm font-semibold text-orange-600">
                          📅 Coupon Generated On
                        </p>
                        <h3 className="mt-2 text-lg font-bold text-orange-800">
                          {formatDate(item.redeemedAt)}
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TOTAL */}
          <div className="mt-10 rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  📊 Total Coupons
                </h2>

                <p className="mt-2 text-gray-500">
                  Coupons generated for your business.
                </p>

                {search && (
                  <p className="mt-2 text-sm font-semibold text-orange-600">
                    Showing {filteredHistory.length} matching result
                    {filteredHistory.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-orange-100 px-8 py-5 text-center">
                <span className="block text-4xl font-bold text-orange-700">
                  {history.length}
                </span>

                <span className="text-sm font-semibold text-orange-600">
                  TOTAL
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </BusinessProtected>
  );
}
