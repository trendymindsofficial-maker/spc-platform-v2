
"use client";

import { useEffect, useMemo, useState } from "react";
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

interface Coupon {
  requestId: string;
  studentName: string;
  studentMobile: string;
  studentCardNumber: string;
  businessName: string;
  offerTitle: string;
  discount: string;
  requestedAt: any;
  redeemedAt?: any;
  status: string;
  pointsAwarded: number;
}

const toMillis = (value: any): number => {
  if (typeof value?.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value?.toDate === "function") {
    return value.toDate().getTime();
  }

  if (value instanceof Date) return value.getTime();

  if (typeof value === "string" || typeof value === "number") {
    const result = new Date(value).getTime();
    return Number.isFinite(result) ? result : 0;
  }

  return 0;
};

const formatDate = (value: any) => {
  const ms = toMillis(value);
  if (!ms) return "Date unavailable";

  return new Date(ms).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
};

const statusInfo = (status: string) => {
  const value = status.toLowerCase();

  if (value === "rejected") {
    return {
      label: "Rejected",
      badge: "bg-rose-100 text-rose-800",
      message: "This request was rejected.",
    };
  }

  if (value === "approved" || value === "redeemed") {
    return {
      label: "Approved",
      badge: "bg-emerald-100 text-emerald-800",
      message: "Request approved.",
    };
  }

  return {
    label: "Waiting for Approval",
    badge: "bg-amber-100 text-amber-900",
    message: "Request received. Waiting for business approval.",
  };
};

export default function RedemptionHistory() {
  const router = useRouter();

  const [requests, setRequests] = useState<Coupon[]>([]);
  const [redemptions, setRedemptions] = useState<Coupon[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let stopRequests: (() => void) | undefined;
    let stopRedemptions: (() => void) | undefined;

    const stopAuth = onAuthStateChanged(auth, (user) => {
      stopRequests?.();
      stopRedemptions?.();
      stopRequests = undefined;
      stopRedemptions = undefined;

      setRequests([]);
      setRedemptions([]);

      if (!active) return;

      if (!user) {
        setLoading(false);
        router.replace("/business/login");
        return;
      }

      setLoading(true);
      setError("");

      // Live student coupon requests
      const requestsQuery = query(
        collection(db, "redemptionRequests"),
        where("businessId", "==", user.uid)
      );

      // Live approved/redemption records
      const redemptionsQuery = query(
        collection(db, "redemptions"),
        where("businessId", "==", user.uid)
      );

      let requestsReady = false;
      let redemptionsReady = false;

      const updateLoading = () => {
        if (active && requestsReady && redemptionsReady) {
          setLoading(false);
        }
      };

      stopRequests = onSnapshot(
        requestsQuery,
        (snapshot) => {
          if (!active) return;

          const data: Coupon[] = snapshot.docs.map((item) => {
            const record = item.data();

            return {
              requestId: item.id,
              studentName: String(record.studentName || "SBC Student"),
              studentMobile: String(record.studentMobile || ""),
              studentCardNumber: String(
                record.studentCardNumber || record.cardNumber || ""
              ),
              businessName: String(record.businessName || "SBC Partner Business"),
              offerTitle: String(record.offerTitle || "SBC Offer"),
              discount: String(
                record.discount || record.offerDiscount || ""
              ),
              requestedAt: record.createdAt,
              status: String(record.status || "pending").toLowerCase(),
              pointsAwarded: Number(record.pointsAwarded || 0),
            };
          });

          setRequests(data);
          requestsReady = true;
          updateLoading();
        },
        (err) => {
          console.error("Business coupon request listener:", err);
          if (!active) return;
          setError("Unable to load coupon requests. Please check access and try again.");
          setLoading(false);
        }
      );

      stopRedemptions = onSnapshot(
        redemptionsQuery,
        (snapshot) => {
          if (!active) return;

          const data: Coupon[] = snapshot.docs.map((item) => {
            const record = item.data();

            return {
              requestId: String(record.requestId || item.id),
              studentName: String(record.studentName || "SBC Student"),
              studentMobile: String(record.studentMobile || ""),
              studentCardNumber: String(
                record.studentCardNumber || record.cardNumber || ""
              ),
              businessName: String(record.businessName || "SBC Partner Business"),
              offerTitle: String(record.offerTitle || "SBC Offer"),
              discount: String(
                record.discount || record.offerDiscount || ""
              ),
              requestedAt: record.redeemedAt,
              redeemedAt: record.redeemedAt,
              status: "redeemed",
              pointsAwarded: Number(record.pointsAwarded || 0),
            };
          });

          setRedemptions(data);
          redemptionsReady = true;
          updateLoading();
        },
        (err) => {
          console.error("Business redemption listener:", err);
          if (!active) return;
          setError("Unable to load redemption records. Please check access and try again.");
          setLoading(false);
        }
      );
    });

    return () => {
      active = false;
      stopAuth();
      stopRequests?.();
      stopRedemptions?.();
    };
  }, [router]);

  // Merge requests and redemptions by Request ID.
  // A redeemed record takes precedence over its request.
  const history = useMemo(() => {
    const byId = new Map<string, Coupon>();

    for (const coupon of requests) {
      byId.set(coupon.requestId, coupon);
    }

    for (const coupon of redemptions) {
      const previous = byId.get(coupon.requestId);

      byId.set(coupon.requestId, {
        ...previous,
        ...coupon,
        studentName: coupon.studentName || previous?.studentName || "",
        studentMobile: coupon.studentMobile || previous?.studentMobile || "",
        studentCardNumber:
          coupon.studentCardNumber || previous?.studentCardNumber || "",
        businessName: coupon.businessName || previous?.businessName || "",
        offerTitle: coupon.offerTitle || previous?.offerTitle || "",
        discount: coupon.discount || previous?.discount || "",
        requestedAt: previous?.requestedAt || coupon.requestedAt,
        pointsAwarded: coupon.pointsAwarded || previous?.pointsAwarded || 0,
        status: "redeemed",
      });
    }

    return Array.from(byId.values()).sort(
      (a, b) =>
        toMillis(b.redeemedAt || b.requestedAt) -
        toMillis(a.redeemedAt || a.requestedAt)
    );
  }, [requests, redemptions]);

  const searchText = search.trim().toLowerCase();

  const filteredHistory = history.filter((item) =>
    [
      item.studentName,
      item.studentMobile,
      item.studentCardNumber,
      item.offerTitle,
      item.businessName,
      item.requestId,
    ].some((value) => value.toLowerCase().includes(searchText))
  );

  return (
    <BusinessProtected>
      <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-fuchsia-700">
                Student Benefit Card
              </p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">
                Redemption History
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Student coupons and approval status
              </p>
              <p className="mt-2 text-sm font-bold text-emerald-700">
                ● Live updates enabled
              </p>
            </div>

            <button
              onClick={() => router.push("/business/dashboard")}
              className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white"
            >
              Dashboard
            </button>
          </div>

          <input
            type="text"
            placeholder="Search Student / Mobile / Card Number / Offer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-6 w-full rounded-2xl border border-slate-300 bg-white p-4 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100"
          />

          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-3xl bg-white p-12 text-center shadow-lg">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-fuchsia-100 border-t-fuchsia-600" />
              <p className="font-bold text-slate-700">Loading coupons...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-lg">
              <div className="text-5xl">🎟️</div>
              <h2 className="mt-4 text-xl font-black text-slate-900">
                {search ? "No Matching Coupons" : "No Coupons Yet"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {search
                  ? "Try another search."
                  : "Coupons generated for your business will appear here."}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredHistory.map((coupon) => {
                const info = statusInfo(coupon.status);
                const approved =
                  coupon.status === "approved" ||
                  coupon.status === "redeemed";

                return (
                  <article
                    key={coupon.requestId}
                    className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-lg"
                  >
                    {/* Coupon header */}
                    <div className="bg-gradient-to-r from-fuchsia-700 via-purple-700 to-indigo-700 p-4 text-white sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-100">
                            SBC · REDEMPTION COUPON
                          </p>
                          <h2 className="mt-2 break-words text-xl font-black">
                            {coupon.businessName}
                          </h2>
                          <p className="mt-1 text-sm font-semibold text-white/85">
                            {coupon.offerTitle}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-xl bg-white/15 px-3 py-2 text-sm font-black">
                          {coupon.discount || "OFFER"}
                        </span>
                      </div>
                    </div>

                    {/* Coupon details */}
                    <div className="space-y-4 p-4 sm:p-5">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                            Student Name
                          </p>
                          <p className="mt-1 break-words text-sm font-extrabold text-slate-900">
                            {coupon.studentName || "SBC Student"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                            SBC Card Number
                          </p>
                          <p className="mt-1 break-words text-sm font-extrabold tracking-wide text-slate-900">
                            {coupon.studentCardNumber || "—"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                            Mobile
                          </p>
                          <p className="mt-1 break-words text-sm font-extrabold text-slate-900">
                            {coupon.studentMobile || "—"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                            Points Awarded
                          </p>
                          <p className="mt-1 text-sm font-extrabold text-slate-900">
                            {coupon.pointsAwarded}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-dashed border-slate-300 pt-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-black ${info.badge}`}
                          >
                            {info.label}
                          </span>
                          <span className="text-right text-[10px] font-semibold text-slate-500">
                            {formatDate(coupon.redeemedAt || coupon.requestedAt)}
                          </span>
                        </div>

                        <p className="mt-3 text-xs leading-5 text-slate-500">
                          {info.message}
                        </p>

                        {approved && (
                          <p className="mt-2 text-xs font-bold text-emerald-700">
                            {coupon.status === "redeemed"
                              ? "Redemption recorded."
                              : "Approved by business."}
                          </p>
                        )}

                        <div className="mt-3 flex items-start justify-between gap-2 border-t border-dashed border-slate-200 pt-3">
                          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                            Request ID
                          </span>
                          <span className="max-w-[70%] break-all text-right font-mono text-[10px] font-bold text-slate-600">
                            {coupon.requestId}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-6 rounded-2xl bg-white p-5 shadow">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Total Coupons
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Includes pending, approved, rejected and redeemed requests.
                </p>
              </div>
              <div className="rounded-xl bg-fuchsia-50 px-5 py-3 text-center">
                <span className="block text-2xl font-black text-fuchsia-700">
                  {history.length}
                </span>
                <span className="text-[10px] font-bold text-fuchsia-600">
                  TOTAL
                </span>
              </div>
            </div>

            {search && (
              <p className="mt-3 text-sm font-semibold text-fuchsia-700">
                Showing {filteredHistory.length} matching coupons
              </p>
            )}
          </div>
        </div>
      </main>
    </BusinessProtected>
  );
}
