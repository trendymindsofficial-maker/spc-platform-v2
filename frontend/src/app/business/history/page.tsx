"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BusinessProtected from "@/components/BusinessProtected";

import { auth, db } from "@/lib/firebase";

import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

interface Redemption {
  id: string;
  studentName: string;
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
  const [filteredHistory, setFilteredHistory] =
    useState<Redemption[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * ==========================================
   * LOAD BUSINESS REDEMPTION HISTORY
   * ==========================================
   */

  const loadHistory = async (businessId: string) => {
    try {
      setLoading(true);
      setError("");

      const q = query(
        collection(db, "redemptions"),
        where("businessId", "==", businessId)
      );

      const snap = await getDocs(q);

      const data: Redemption[] = snap.docs.map((item) => {
        const data = item.data();

        return {
          id: item.id,
          studentName: data.studentName || "",
          studentCardNumber:
            data.studentCardNumber || "",
          offerTitle: data.offerTitle || "",
          discount: data.discount || "",
          redeemedAt: data.redeemedAt,
          businessId: data.businessId || "",
          status: data.status || "redeemed",
        };
      });

      /*
       * Sort newest first.
       *
       * We intentionally do NOT use Firestore orderBy()
       * because redeemedAt is created using serverTimestamp()
       * and orderBy can require an index / cause loading issues.
       */

      data.sort((a, b) => {
        const timeA =
          a.redeemedAt?.toMillis?.() || 0;

        const timeB =
          b.redeemedAt?.toMillis?.() || 0;

        return timeB - timeA;
      });

      setHistory(data);
      setFilteredHistory(data);
    } catch (err) {
      console.error(
        "Redemption history error:",
        err
      );

      setError(
        "Unable to load redemption history. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ==========================================
   * AUTH
   * ==========================================
   */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          router.replace("/business/login");
          return;
        }

        await loadHistory(user.uid);
      }
    );

    return () => unsubscribe();
  }, [router]);

  /*
   * ==========================================
   * SEARCH
   * ==========================================
   */

  useEffect(() => {
    const searchText =
      search.trim().toLowerCase();

    if (!searchText) {
      setFilteredHistory(history);
      return;
    }

    const filtered = history.filter((item) => {
      const studentName =
        item.studentName?.toLowerCase() || "";

      const cardNumber =
        item.studentCardNumber
          ?.toLowerCase() || "";

      const offerTitle =
        item.offerTitle?.toLowerCase() || "";

      return (
        studentName.includes(searchText) ||
        cardNumber.includes(searchText) ||
        offerTitle.includes(searchText)
      );
    });

    setFilteredHistory(filtered);
  }, [search, history]);

  /*
   * ==========================================
   * DATE / RELATIVE TIME
   * ==========================================
   */

  const [, setTimeRefresh] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRefresh((value) => value + 1);
    }, 30_000);

    return () => clearInterval(timer);
  }, []);

  const getDateValue = (timestamp: any): Date | null => {
    if (!timestamp) return null;

    try {
      const date =
        typeof timestamp?.toDate === "function"
          ? timestamp.toDate()
          : timestamp instanceof Date
            ? timestamp
            : typeof timestamp === "number" || typeof timestamp === "string"
              ? new Date(timestamp)
              : null;

      return date && !Number.isNaN(date.getTime()) ? date : null;
    } catch {
      return null;
    }
  };

  const formatDate = (timestamp: any) => {
    const date = getDateValue(timestamp);
    if (!date) return "Date unavailable";

    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const getRelativeTime = (timestamp: any) => {
    const date = getDateValue(timestamp);
    if (!date) return "";

    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} ${minutes === 1 ? "min" : "mins"} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;

    const years = Math.floor(days / 365);
    return `${years} ${years === 1 ? "year" : "years"} ago`;
  };

  /*
   * ==========================================
   * REFRESH
   * ==========================================
   */

  const refreshHistory = async () => {
    const user = auth.currentUser;

    if (!user) {
      router.replace("/business/login");
      return;
    }

    await loadHistory(user.uid);
  };

  /*
   * ==========================================
   * PAGE
   * ==========================================
   */

  return (
    <BusinessProtected>
      <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="mx-auto max-w-7xl">

          {/* HEADER */}

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                📊 Redemption History
              </h1>

              <p className="mt-2 text-gray-600">
                View all student offer redemptions
                made at your business.
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
                onClick={() =>
                  router.push(
                    "/business/dashboard"
                  )
                }
                className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800"
              >
                🏠 Dashboard
              </button>

            </div>
          </div>

          {/* SEARCH */}

          <div className="mb-8">
            <input
              type="text"
              placeholder="🔍 Search Student / SBC Number / Offer..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
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

              <div className="text-6xl">
                📊
              </div>

              <h2 className="mt-5 text-3xl font-bold">
                {search
                  ? "No Matching Redemptions"
                  : "No Redemption History"}
              </h2>

              <p className="mt-3 text-gray-500">
                {search
                  ? "Try a different student name, SBC number or offer name."
                  : "Redeemed offers will appear here."}
              </p>

            </div>
          ) : (

            /* HISTORY LIST */

            <div className="grid gap-6">

              {filteredHistory.map(
                (item, index) => (

                  <div
                    key={item.id}
                    className="mx-auto w-full max-w-3xl overflow-hidden rounded-[2rem] border border-purple-100 bg-white shadow-xl transition hover:shadow-2xl"
                  >

                    {/* COUPON HEADER */}
                    <div className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-700 p-5 text-white">
                      <p className="text-xs font-bold tracking-[0.25em]">SBC · REDEMPTION COUPON</p>
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-2xl font-extrabold">{item.offerTitle || "SBC Offer"}</h2>
                          <p className="mt-1 font-semibold opacity-90">{item.discount || "SBC Offer"}</p>
                        </div>
                        <span className="shrink-0 rounded-xl bg-white/20 px-4 py-2 text-sm font-bold">OFFER</span>
                      </div>
                    </div>

                    {/* COUPON DETAILS */}
                    <div className="p-5 sm:p-6">
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-bold tracking-wide text-slate-400">STUDENT NAME</p>
                          <h3 className="mt-2 break-words text-lg font-extrabold text-slate-900">{item.studentName || "-"}</h3>
                        </div>
                        <div>
                          <p className="text-xs font-bold tracking-wide text-slate-400">SBC CARD NUMBER</p>
                          <h3 className="mt-2 break-words text-lg font-extrabold text-slate-900">{item.studentCardNumber || "-"}</h3>
                        </div>
                      </div>

                      <div className="my-5 border-t border-dashed border-slate-300" />

                      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                        <span className="rounded-full bg-emerald-100 px-5 py-2 font-bold text-emerald-800">
                          ✓ Approved
                        </span>

                        <div className="w-full rounded-2xl border-2 border-yellow-300 bg-amber-50 p-4 sm:w-auto sm:min-w-[300px]">
                          <p className="text-center text-sm font-extrabold tracking-wide text-amber-800">REDEEMED DATE &amp; TIME</p>
                          <p className="mt-2 text-center text-lg font-extrabold text-slate-900">{formatDate(item.redeemedAt)}</p>
                          {getDateValue(item.redeemedAt) && (
                            <p className="mt-2 text-right font-extrabold text-amber-800">{getRelativeTime(item.redeemedAt)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                )
              )}

            </div>
          )}

          {/* TOTAL */}

          <div className="mt-10 rounded-3xl bg-white p-6 shadow-xl">

            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

              <div>

                <h2 className="text-2xl font-bold">
                  📊 Total Redemptions
                </h2>

                <p className="mt-2 text-gray-500">
                  Total redeemed offers by your
                  business.
                </p>

                {search && (
                  <p className="mt-2 text-sm font-semibold text-orange-600">
                    Showing {filteredHistory.length}{" "}
                    matching result
                    {filteredHistory.length !== 1
                      ? "s"
                      : ""}
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