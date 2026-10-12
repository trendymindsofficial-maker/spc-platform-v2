"use client";



import { useCallback, useEffect, useState } from "react";

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



function formatDate(value: unknown) {

  if (!value) return "Date unavailable";



  let date: Date;



  if (

    typeof value === "object" &&

    value !== null &&

    "seconds" in value &&

    typeof (value as { seconds?: unknown }).seconds === "number"

  ) {

    date = new Date(

      (value as { seconds: number }).seconds * 1000

    );

  } else if (

    typeof value === "object" &&

    value !== null &&

    "toDate" in value &&

    typeof (value as { toDate?: unknown }).toDate === "function"

  ) {

    date = (value as { toDate: () => Date }).toDate();

  } else {

    date = new Date(value as string | number);

  }



  if (Number.isNaN(date.getTime())) return "Date unavailable";



  return date.toLocaleString("en-IN", {

    day: "2-digit",

    month: "short",

    year: "numeric",

    hour: "2-digit",

    minute: "2-digit",

  });

}



export default function RedeemApprovalDashboard() {

  const router = useRouter();



  const [requests, setRequests] = useState<RedemptionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [processingId, setProcessingId] = useState<string | null>(null);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");



  const loadRequests = useCallback(async () => {

    setLoading(true);

    setError("");



    try {

      const user = auth.currentUser;
      if (!user) {
        throw new Error("Session expired. Please log in again.");
      }
      const token = await getIdToken(user);
      const response = await apiFetch("/api/redeem-approval/requests", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();



      if (!response.ok || !data.success) {

        throw new Error(data.message || "Could not load requests.");

      }



      setRequests(Array.isArray(data.requests) ? data.requests : []);

    } catch (err) {

      setError(

        err instanceof Error ? err.message : "Could not load requests."

      );

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, (user) => {

      if (!user) {

        router.replace("/redeem-approval/login");

        return;

      }



      void loadRequests();

    });



    return () => unsubscribe();

  }, [router, loadRequests]);



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

      const user = auth.currentUser;
      if (!user) {
        throw new Error("Session expired. Please log in again.");
      }
      const token = await getIdToken(user);
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



      setRequests((current) =>

        current.filter((item) => item.id !== request.id)

      );



      setMessage(

        action === "approve"

          ? "Redemption approved successfully."

          : "Redemption rejected successfully."

      );

    } catch (err) {

      setError(

        err instanceof Error ? err.message : `Could not ${action} request.`

      );

      await loadRequests();

    } finally {

      setProcessingId(null);

    }

  };



  const logout = async () => {

    await signOut(auth);

    router.replace("/redeem-approval/login");

  };



  return (

    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-8 sm:py-10">

      <div className="mx-auto max-w-6xl">

        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">

              Student Benefit Card

            </p>

            <h1 className="mt-2 text-3xl font-black sm:text-4xl">

              Redeem Approval

            </h1>

            <p className="mt-2 text-sm text-slate-400">

              Review redemption requests across SBC partner businesses.

            </p>

          </div>



          <div className="flex flex-wrap gap-3">

            <button

              onClick={() => void loadRequests()}

              disabled={loading}

              className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold hover:bg-slate-800 disabled:opacity-50"

            >

              {loading ? "Refreshing..." : "Refresh"}

            </button>

            <button

              onClick={() => void logout()}

              className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300"

            >

              Logout

            </button>

          </div>

        </header>



        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <p className="text-sm text-slate-400">Pending Requests</p>

            <p className="mt-2 text-3xl font-black">{requests.length}</p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <p className="text-sm text-slate-400">Businesses Represented</p>

            <p className="mt-2 text-3xl font-black">

              {new Set(requests.map((item) => item.businessId).filter(Boolean)).size}

            </p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <p className="text-sm text-slate-400">Approval Access</p>

            <p className="mt-2 text-lg font-black text-amber-400">

              All Businesses

            </p>

          </div>

        </section>



        {error && (

          <div className="mb-5 rounded-xl border border-red-800 bg-red-950 p-4 text-sm text-red-200">

            {error}

          </div>

        )}



        {message && (

          <div className="mb-5 rounded-xl border border-emerald-800 bg-emerald-950 p-4 text-sm text-emerald-200">

            {message}

          </div>

        )}



        <section className="space-y-4">

          {loading ? (

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">

              Loading redemption requests...

            </div>

          ) : requests.length === 0 ? (

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">

              <p className="text-xl font-bold">No pending requests</p>

              <p className="mt-2 text-sm text-slate-400">

                New student redemption requests will appear here.

              </p>

            </div>

          ) : (

            requests.map((request) => (

              <article

                key={request.id}

                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6"

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



                    <h2 className="text-xl font-black">

                      {request.businessName || "SBC Partner Business"}

                    </h2>

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

                          Coupon Request Date & Time

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



        <p className="mt-8 text-center text-xs text-slate-500">

          SBC Redeem Approval Team · Points are not awarded by this dashboard.

        </p>

      </div>

    </main>

  );

}