"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getIdToken, onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";

type RedemptionRequest = {
  id: string;
  studentId?: string;
  studentName?: string;
  studentCardNumber?: string;
  businessId?: string;
  businessName?: string;
  offerId?: string;
  offerTitle?: string;
  offerDiscount?: string;
  discount?: string;
  status?: string;
  createdAt?: unknown;
};

type Business = {
  id: string;
  name: string;
  successfulRedemptions: number;
};

type Redemption = {
  id: string;
  businessId: string;
  businessName: string;
  studentName: string;
  studentCardNumber: string;
  offerTitle: string;
  discount: string;
  pointsAwarded: number;
  status: string;
  redeemedAt: string | null;
};

function formatDate(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Date unavailable";
  }

  let date: Date;

  if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  } else if (typeof value === "object" && value !== null) {
    if ("seconds" in value && typeof value.seconds === "number") {
      date = new Date(value.seconds * 1000);
    } else if ("toDate" in value && typeof value.toDate === "function") {
      date = value.toDate();
    } else {
      return "Date unavailable";
    }
  } else {
    return "Date unavailable";
  }

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function RedeemApprovalDashboard() {
  const router = useRouter();

  const [requests, setRequests] = useState<RedemptionRequest[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [history, setHistory] = useState<Redemption[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState("");
  const [activeTab, setActiveTab] = useState<"history" | "pending">("history");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const getToken = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Session expired. Please log in again.");
    return getIdToken(user);
  }, []);

  const loadRequests = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const token = await getToken();
      const response = await apiFetch("/api/redeem-approval/requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load pending requests.");
      }

      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load requests.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [getToken]);

  const loadBusinesses = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await apiFetch("/api/redeem-approval/businesses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load businesses.");
      }

      setBusinesses(Array.isArray(data.businesses) ? data.businesses : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load businesses.");
    }
  }, [getToken]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setError("");

    try {
      const token = await getToken();
      const params = new URLSearchParams();

      if (selectedBusiness) params.set("businessId", selectedBusiness);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const response = await apiFetch(
        `/api/redeem-approval/history?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load redemption history.");
      }

      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load history.");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [getToken, selectedBusiness, from, to]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let active = true;
    let refreshing = false;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        if (intervalId) clearInterval(intervalId);
        intervalId = undefined;
        router.replace("/redeem-approval/login");
        return;
      }

      if (!intervalId) {
        void (async () => {
          if (!active) return;
          await Promise.all([
            loadRequests(true),
            loadBusinesses(),
            loadHistory(),
          ]);
        })();

        intervalId = setInterval(async () => {
          if (!active || refreshing || !auth.currentUser) return;
          refreshing = true;
          try {
            await loadRequests(false);
          } finally {
            refreshing = false;
          }
        }, 2000);
      }
    });

    return () => {
      active = false;
      unsubscribe();
      if (intervalId) clearInterval(intervalId);
    };
  }, [router, loadRequests, loadBusinesses, loadHistory]);

  useEffect(() => {
    if (auth.currentUser) void loadHistory();
  }, [selectedBusiness, from, to, loadHistory]);

  const processRequest = async (
    request: RedemptionRequest,
    action: "approve" | "reject"
  ) => {
    const confirmed = window.confirm(
      `${action === "approve" ? "Approve" : "Reject"} redemption for ${
        request.studentName || "this student"
      } at ${request.businessName || "this business"}?`
    );

    if (!confirmed) return;

    setProcessingId(request.id);
    setError("");
    setMessage("");

    try {
      const token = await getToken();
      const response = await apiFetch(
        `/api/redeem-approval/requests/${encodeURIComponent(request.id)}/${action}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || `Could not ${action} request.`);
      }

      setRequests((current) => current.filter((item) => item.id !== request.id));
      setMessage(
        action === "approve"
          ? "Redemption approved successfully."
          : "Redemption rejected successfully."
      );

      await Promise.all([loadRequests(false), loadBusinesses(), loadHistory()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action} request.`);
      await loadRequests(false);
    } finally {
      setProcessingId(null);
    }
  };

  const downloadCsv = async (allBusinesses = false) => {
    if (!allBusinesses && !selectedBusiness) {
      setError("Please select a business before downloading its CSV.");
      return;
    }

    setDownloading(true);
    setError("");

    try {
      const token = await getToken();
      const params = new URLSearchParams();

      if (!allBusinesses && selectedBusiness) {
        params.set("businessId", selectedBusiness);
      }
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const endpoint = allBusinesses
        ? "/api/redeem-approval/history/export-all"
        : "/api/redeem-approval/history/export";

      const response = await apiFetch(`${endpoint}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        let detail = "CSV download failed.";
        try {
          const data = await response.json();
          detail = data.message || detail;
        } catch {}
        throw new Error(detail);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = allBusinesses
        ? "all-redemptions.csv"
        : "business-redemption-history.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("CSV download started.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV download failed.");
    } finally {
      setDownloading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    router.replace("/redeem-approval/login");
  };

  const selectedBusinessName = useMemo(
    () => businesses.find((business) => business.id === selectedBusiness)?.name,
    [businesses, selectedBusiness]
  );

  const totalSuccessful = businesses.reduce(
    (sum, business) => sum + business.successfulRedemptions,
    0
  );

  const filteredTotal = history.length;

  return (
    <main className="min-h-screen bg-[#080d19] text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#0c1323] px-5 py-5 md:px-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-400">
            Student Benefit Card
          </p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">
            Redemption Control Center
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Business-wise history and approval management
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              void loadRequests(true);
              void loadBusinesses();
              void loadHistory();
            }}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold hover:bg-slate-800"
          >
            Refresh
          </button>
          <button
            onClick={() => void logout()}
            className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-300"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-110px)] lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="border-b border-slate-800 bg-[#0c1323] p-4 lg:border-b-0 lg:border-r lg:p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-black">Partner Businesses</h2>
            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-bold">
              {businesses.length}
            </span>
          </div>

          <button
            onClick={() => {
              setSelectedBusiness("");
              setActiveTab("history");
            }}
            className={`mb-2 flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-bold ${
              selectedBusiness === ""
                ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                : "border-transparent text-slate-300 hover:bg-slate-800"
            }`}
          >
            <span>All Businesses</span>
            <span>{totalSuccessful}</span>
          </button>

          <div className="max-h-[420px] space-y-1 overflow-y-auto lg:max-h-[calc(100vh-370px)]">
            {businesses.map((business) => (
              <button
                key={business.id}
                onClick={() => {
                  setSelectedBusiness(business.id);
                  setActiveTab("history");
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left text-sm ${
                  selectedBusiness === business.id
                    ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                    : "border-transparent text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="min-w-0 truncate font-semibold">{business.name}</span>
                <span className="shrink-0 rounded-lg bg-slate-800 px-2 py-1 text-xs font-black">
                  {business.successfulRedemptions}
                </span>
              </button>
            ))}
            {businesses.length === 0 && (
              <p className="px-3 py-5 text-sm text-slate-500">
                No businesses returned by the API.
              </p>
            )}
          </div>

          <div className="mt-5 border-t border-slate-800 pt-5">
            <button
              onClick={() => void downloadCsv(true)}
              disabled={downloading}
              className="w-full rounded-xl bg-emerald-500 px-3 py-3 text-sm font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {downloading ? "Preparing CSV..." : "↓ Download All Redemptions"}
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">
              Exports all businesses with the selected date range.
            </p>
          </div>
        </aside>

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-[#101a2d] p-5">
              <p className="text-sm text-slate-400">Successful Redemptions</p>
              <p className="mt-2 text-3xl font-black text-emerald-400">
                {totalSuccessful}
              </p>
              <p className="mt-1 text-xs text-slate-500">All-time business totals</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#101a2d] p-5">
              <p className="text-sm text-slate-400">Pending Requests</p>
              <p className="mt-2 text-3xl font-black text-amber-300">
                {requests.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">Awaiting a decision</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#101a2d] p-5">
              <p className="text-sm text-slate-400">Businesses</p>
              <p className="mt-2 text-3xl font-black">{businesses.length}</p>
              <p className="mt-1 text-xs text-slate-500">Returned by the backend</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#101a2d] p-5">
              <p className="text-sm text-slate-400">Filtered History</p>
              <p className="mt-2 text-3xl font-black text-sky-300">
                {filteredTotal}
              </p>
              <p className="mt-1 text-xs text-slate-500">Matches current filters</p>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-800 bg-red-950/70 p-4 text-sm text-red-200">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-5 rounded-xl border border-emerald-800 bg-emerald-950/50 p-4 text-sm text-emerald-200">
              {message}
            </div>
          )}

          <div className="mb-5 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("history")}
              className={`rounded-xl px-4 py-3 text-sm font-black ${
                activeTab === "history"
                  ? "bg-amber-400 text-slate-950"
                  : "border border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Redemption History
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`rounded-xl px-4 py-3 text-sm font-black ${
                activeTab === "pending"
                  ? "bg-amber-400 text-slate-950"
                  : "border border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Pending Requests ({requests.length})
            </button>
          </div>

          {activeTab === "history" ? (
            <>
              <div className="mb-5 rounded-2xl border border-slate-800 bg-[#101a2d] p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">
                      {selectedBusinessName || "All Business Redemptions"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Filter by redemption date (India time).
                    </p>
                  </div>
                  <button
                    onClick={() => void downloadCsv(false)}
                    disabled={downloading || !selectedBusiness}
                    title={!selectedBusiness ? "Select a business first" : ""}
                    className="rounded-xl border border-emerald-500/50 px-4 py-2.5 text-sm font-black text-emerald-300 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ↓ Download Business CSV
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
                  <label className="text-xs font-bold text-slate-400">
                    FROM DATE
                    <input
                      type="date"
                      value={from}
                      onChange={(event) => setFrom(event.target.value)}
                      className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-400">
                    TO DATE
                    <input
                      type="date"
                      value={to}
                      min={from || undefined}
                      onChange={(event) => setTo(event.target.value)}
                      className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white"
                    />
                  </label>
                  <button
                    onClick={() => {
                      setFrom("");
                      setTo("");
                    }}
                    className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold hover:bg-slate-800"
                  >
                    Clear Dates
                  </button>
                  <button
                    onClick={() => void loadHistory()}
                    disabled={historyLoading}
                    className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-bold hover:bg-slate-600 disabled:opacity-50"
                  >
                    {historyLoading ? "Loading..." : "Apply / Refresh"}
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101a2d]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
                  <h3 className="font-black">Successful Redemption Records</h3>
                  <span className="text-sm text-slate-400">
                    {history.length} record{history.length === 1 ? "" : "s"}
                  </span>
                </div>

                {historyLoading ? (
                  <div className="p-12 text-center text-slate-400">
                    Loading redemption history...
                  </div>
                ) : history.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="font-bold">No redemption records found</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Try another business or date range.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-sm">
                      <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="px-5 py-4">Business</th>
                          <th className="px-5 py-4">Student</th>
                          <th className="px-5 py-4">Offer</th>
                          <th className="px-5 py-4">Points</th>
                          <th className="px-5 py-4">Redeemed Date &amp; Time</th>
                          <th className="px-5 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {history.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-800/30">
                            <td className="px-5 py-4 font-bold">
                              {item.businessName || "Business"}
                            </td>
                            <td className="px-5 py-4">
                              <p className="font-semibold">
                                {item.studentName || "Student"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Card: {item.studentCardNumber || "N/A"}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <p>{item.offerTitle || "Offer"}</p>
                              {item.discount && (
                                <p className="mt-1 text-xs text-slate-400">
                                  {item.discount}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-4 font-black text-amber-300">
                              {item.pointsAwarded}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-slate-300">
                              {formatDate(item.redeemedAt)}
                            </td>
                            <td className="px-5 py-4">
                              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">
                                Successful
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <section className="space-y-4">
              {loading ? (
                <div className="rounded-2xl border border-slate-800 bg-[#101a2d] p-10 text-center text-slate-400">
                  Loading redemption requests...
                </div>
              ) : requests.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-[#101a2d] p-10 text-center">
                  <p className="text-xl font-black">No pending requests</p>
                  <p className="mt-2 text-sm text-slate-400">
                    New student redemption requests will appear here.
                  </p>
                </div>
              ) : (
                requests.map((request) => (
                  <article
                    key={request.id}
                    className="rounded-2xl border border-slate-800 bg-[#101a2d] p-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-black uppercase text-amber-300">
                            Pending
                          </span>
                          <span className="break-all text-xs text-slate-500">
                            Request ID: {request.id}
                          </span>
                        </div>
                        <h3 className="text-xl font-black">
                          {request.businessName || "SBC Partner Business"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-300">
                          {request.offerTitle || "SBC Offer"}
                          {(request.offerDiscount || request.discount) &&
                            ` · ${request.offerDiscount || request.discount}`}
                        </p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl bg-slate-800/70 p-3">
                            <p className="text-xs text-slate-400">Student</p>
                            <p className="mt-1 font-bold">
                              {request.studentName || "SBC Student"}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Card: {request.studentCardNumber || "Not available"}
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-800/70 p-3">
                            <p className="text-xs text-slate-400">
                              Coupon Request Date &amp; Time
                            </p>
                            <p className="mt-1 font-bold">
                              {formatDate(request.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-3 lg:flex-col">
                        <button
                          onClick={() => void processRequest(request, "approve")}
                          disabled={processingId !== null}
                          className="flex-1 rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-50 lg:min-w-36"
                        >
                          {processingId === request.id ? "Processing..." : "Approve"}
                        </button>
                        <button
                          onClick={() => void processRequest(request, "reject")}
                          disabled={processingId !== null}
                          className="flex-1 rounded-xl border border-red-700 px-5 py-3 font-black text-red-300 hover:bg-red-950 disabled:opacity-50 lg:min-w-36"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </section>
          )}

          <p className="mt-8 text-center text-xs text-slate-500">
            SBC Redeem Approval Team · Successful history is read from recorded redemptions.
          </p>
        </section>
      </div>
    </main>
  );
}
