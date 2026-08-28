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
  Timestamp,
} from "firebase/firestore";

interface Redemption {
  id: string;
  studentName: string;
  businessName: string;
  offerTitle: string;
  discount: string;
  status: string;
  redeemedAt?: unknown;
  createdAt?: unknown;
  timestamp?: unknown;
  date?: unknown;
}

function formatRedeemedDate(item: Redemption) {
  const raw =
    item.redeemedAt ??
    item.createdAt ??
    item.timestamp ??
    item.date;

  if (!raw) return "Date & time unavailable";

  try {
    let date: Date;

    if (raw instanceof Timestamp) {
      date = raw.toDate();
    } else if (
      typeof raw === "object" &&
      raw !== null &&
      "toDate" in raw &&
      typeof (raw as { toDate?: unknown }).toDate === "function"
    ) {
      date = (raw as { toDate: () => Date }).toDate();
    } else if (
      typeof raw === "object" &&
      raw !== null &&
      "seconds" in raw
    ) {
      date = new Date(
        Number((raw as { seconds: number }).seconds) * 1000
      );
    } else {
      date = new Date(
        typeof raw === "number" ? raw : String(raw)
      );
    }

    if (Number.isNaN(date.getTime())) {
      return "Date & time unavailable";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Date & time unavailable";
  }
}

export default function AdminRedemptions() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // This state controls the View Details popup.
  const [selectedRedemption, setSelectedRedemption] =
    useState<Redemption | null>(null);

  useEffect(() => {
    loadRedemptions();
  }, []);

  const loadRedemptions = async () => {
    try {
      const snap = await getDocs(
        collection(db, "redemptions")
      );

      const data = snap.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as Redemption[];

      setRedemptions(data);
    } catch (error) {
      console.error("Error loading redemptions:", error);
      alert("Unable to load redemptions.");
    } finally {
      setLoading(false);
    }
  };

  const deleteRedemption = async (
    id: string,
    studentName: string
  ) => {
    const ok = window.confirm(
      `Delete redemption of "${studentName}" ?`
    );

    if (!ok) return;

    try {
      await deleteDoc(
        doc(db, "redemptions", id)
      );

      setRedemptions((current) =>
        current.filter((item) => item.id !== id)
      );

      if (selectedRedemption?.id === id) {
        setSelectedRedemption(null);
      }
    } catch (error) {
      console.error("Delete redemption error:", error);
      alert("Failed to delete redemption.");
    }
  };

  const filteredRedemptions =
    redemptions.filter((item) =>
      item.studentName
        ?.toLowerCase()
        .includes(search.toLowerCase())
    );

  return (
    <AdminProtected>
      <main className="min-h-screen bg-[#f5f3ed] p-4 md:p-8">

        <div className="mx-auto max-w-7xl">

          {/* HEADER */}
          <div className="mb-6 overflow-hidden rounded-[28px] bg-[#07111f] shadow-[0_20px_65px_rgba(7,17,31,0.13)]">
            <div className="flex flex-col gap-5 px-6 py-7 md:flex-row md:items-center md:justify-between md:px-8">

              <div>
                <span className="inline-flex rounded-full bg-[#d4af37]/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#f1cf63]">
                  SBC Admin
                </span>

                <h1 className="mt-2 text-3xl font-black text-white">
                  Redemption Management
                </h1>

                <p className="mt-1 text-sm text-white/50">
                  View, search and manage all redemptions.
                </p>
              </div>

              <Link
                href="/admin/dashboard"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
              >
                ← Dashboard
              </Link>
            </div>
          </div>

          {/* SEARCH */}
          <div className="mb-6 rounded-3xl border border-black/5 bg-white p-4 shadow-sm md:p-5">

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                🔎
              </span>

              <input
                type="text"
                placeholder="Search Student..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="w-full rounded-2xl border border-slate-200 bg-[#fbfaf6] py-3.5 pl-11 pr-4 text-sm font-semibold text-[#07111f] outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
              />
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-400">
              Showing {filteredRedemptions.length} of{" "}
              {redemptions.length} redemptions
            </p>
          </div>

          {/* CONTENT */}
          {loading ? (

            <div className="rounded-[28px] bg-white p-12 text-center shadow-sm">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#d4af37]" />

              <h2 className="mt-4 text-xl font-black text-[#07111f]">
                Loading Redemptions...
              </h2>
            </div>

          ) : filteredRedemptions.length === 0 ? (

            <div className="rounded-[28px] bg-white p-12 text-center shadow-sm">

              <div className="text-4xl">
                📊
              </div>

              <h2 className="mt-4 text-2xl font-black text-[#07111f]">
                No Redemptions Found
              </h2>

            </div>

          ) : (

            <div className="grid gap-4">

              {filteredRedemptions.map((item) => (

                <div
                  key={item.id}
                  className="overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >

                  <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center md:p-6">

                    {/* STUDENT */}
                    <div className="flex min-w-0 flex-1 items-center gap-4">

                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#fff8df] text-xl font-black text-[#8a680c]">
                        {(item.studentName || "S")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <h2 className="truncate text-lg font-black text-[#07111f]">
                            {item.studentName ||
                              "Unknown Student"}
                          </h2>

                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                            {(item.status || "redeemed").toUpperCase()}
                          </span>

                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-slate-500">

                          <span>
                            🏪 {item.businessName || "-"}
                          </span>

                          <span>
                            🎁 {item.offerTitle || "-"}
                          </span>

                        </div>

                      </div>
                    </div>

                    {/* BENEFIT */}
                    <div className="rounded-2xl border border-[#d4af37]/20 bg-[#fffdf5] px-5 py-3 lg:min-w-[180px]">

                      <p className="text-[9px] font-black uppercase tracking-wider text-[#a37b0d]">
                        Benefit
                      </p>

                      <p className="mt-1 font-black text-[#07111f]">
                        {item.discount || "-"}
                      </p>

                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedRedemption(item)
                        }
                        className="rounded-xl bg-[#07111f] px-5 py-3 text-sm font-black text-[#f1cf63] shadow-sm transition hover:bg-[#101d2e] hover:shadow-md"
                      >
                        View Details
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteRedemption(
                            item.id,
                            item.studentName
                          )
                        }
                        className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-100"
                      >
                        Delete
                      </button>

                    </div>

                  </div>

                  <div className="border-t border-slate-100 bg-[#fbfaf6] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 md:px-6">
                    Redemption Record · ID: {item.id}
                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

        {/* VIEW DETAILS POPUP */}
        {selectedRedemption && (

          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07111f]/70 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedRedemption(null);
              }
            }}
          >

            <div
              className="w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.30)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="redemption-details-title"
            >

              {/* POPUP HEADER */}
              <div className="bg-[#07111f] px-6 py-6 text-white">

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f1cf63]">
                      Redemption Details
                    </p>

                    <h2
                      id="redemption-details-title"
                      className="mt-2 text-2xl font-black"
                    >
                      {selectedRedemption.studentName ||
                        "Student"}
                    </h2>

                    <p className="mt-1 text-sm text-white/50">
                      SBC redemption record
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedRedemption(null)
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl font-bold text-white transition hover:bg-white/20"
                    aria-label="Close"
                  >
                    ×
                  </button>

                </div>
              </div>

              {/* POPUP CONTENT */}
              <div className="max-h-[75vh] space-y-3 overflow-y-auto p-6">

                <div className="rounded-2xl border border-slate-200 bg-[#fbfaf6] p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Student
                  </p>

                  <p className="mt-1 font-black text-[#07111f]">
                    {selectedRedemption.studentName || "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-[#fbfaf6] p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Business
                  </p>

                  <p className="mt-1 font-black text-[#07111f]">
                    {selectedRedemption.businessName || "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-[#fbfaf6] p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Offer
                  </p>

                  <p className="mt-1 font-black text-[#07111f]">
                    {selectedRedemption.offerTitle || "-"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">

                  <div className="rounded-2xl border border-[#d4af37]/20 bg-[#fffdf5] p-4">
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#a37b0d]">
                      Discount
                    </p>

                    <p className="mt-1 font-black text-[#07111f]">
                      {selectedRedemption.discount || "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">
                      Status
                    </p>

                    <p className="mt-1 font-black uppercase text-emerald-700">
                      {selectedRedemption.status ||
                        "redeemed"}
                    </p>
                  </div>

                </div>

                {/* DATE & TIME */}
                <div className="rounded-2xl border border-[#d4af37]/25 bg-[#fffdf5] p-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#07111f] text-lg">
                      🕒
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#a37b0d]">
                        Redeemed On
                      </p>

                      <p className="mt-1 text-sm font-black text-[#07111f]">
                        {formatRedeemedDate(
                          selectedRedemption
                        )}
                      </p>
                    </div>

                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">

                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Record ID
                  </p>

                  <p className="mt-1 break-all font-mono text-xs font-bold text-slate-600">
                    {selectedRedemption.id}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedRedemption(null)
                  }
                  className="w-full rounded-2xl bg-[#07111f] py-3.5 text-sm font-black text-[#f1cf63] transition hover:bg-[#101d2e]"
                >
                  Close
                </button>

              </div>
            </div>
          </div>
        )}
      </main>
    </AdminProtected>
  );
}
