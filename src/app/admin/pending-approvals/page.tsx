"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AdminProtected from "@/components/AdminProtected";

import { db } from "@/lib/firebase";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

interface Business {
  id: string;
  uid?: string;
  businessName?: string;
  ownerName?: string;
  mobile?: string;
  email?: string;
  category?: string;
  address?: string;
  status?: string;
  createdAt?: any;
}

export default function PendingApprovals() {
  const [businesses, setBusinesses] =
    useState<Business[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  /*
   * ==========================================
   * LOAD PENDING BUSINESSES
   * ==========================================
   */

  const loadPendingBusinesses =
    async () => {
      try {
        setLoading(true);

        const snap =
          await getDocs(
            collection(
              db,
              "businesses"
            )
          );

        const data: Business[] =
          snap.docs
            .map((item) => ({
              id: item.id,
              ...item.data(),
            }))
            .filter(
              (business: Business) =>
                business.status
                  ?.toLowerCase() ===
                "pending"
            ) as Business[];

        /*
         * Latest registrations first
         */

        data.sort((a, b) => {
          const aTime =
            a.createdAt?.toMillis?.() ||
            0;

          const bTime =
            b.createdAt?.toMillis?.() ||
            0;

          return bTime - aTime;
        });

        setBusinesses(data);
      } catch (error) {
        console.error(
          "Pending businesses loading error:",
          error
        );

        alert(
          "❌ Unable to load pending businesses."
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * ==========================================
   * INITIAL LOAD
   * ==========================================
   */

  useEffect(() => {
    loadPendingBusinesses();
  }, []);

  /*
   * ==========================================
   * APPROVE BUSINESS
   * ==========================================
   */

  const approveBusiness =
    async (
      business: Business
    ) => {
      const name =
        business.businessName ||
        "this business";

      const ok =
        window.confirm(
          `Approve "${name}" as an SBC Partner Business?`
        );

      if (!ok) {
        return;
      }

      try {
        setProcessingId(
          business.id
        );

        await updateDoc(
          doc(
            db,
            "businesses",
            business.id
          ),
          {
            status:
              "approved",
          }
        );

        /*
         * Remove from pending list
         */

        setBusinesses(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                business.id
            )
        );

        alert(
          `✅ ${name} approved successfully.`
        );
      } catch (error) {
        console.error(
          "Business approval error:",
          error
        );

        alert(
          "❌ Unable to approve business."
        );
      } finally {
        setProcessingId(null);
      }
    };

  /*
   * ==========================================
   * REJECT BUSINESS
   * ==========================================
   */

  const rejectBusiness =
    async (
      business: Business
    ) => {
      const name =
        business.businessName ||
        "this business";

      const ok =
        window.confirm(
          `Reject "${name}"?\n\nThis will remove the business registration.`
        );

      if (!ok) {
        return;
      }

      try {
        setProcessingId(
          business.id
        );

        /*
         * Delete registration
         */

        await deleteDoc(
          doc(
            db,
            "businesses",
            business.id
          )
        );

        setBusinesses(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                business.id
            )
        );

        alert(
          `❌ ${name} rejected.`
        );
      } catch (error) {
        console.error(
          "Business rejection error:",
          error
        );

        alert(
          "❌ Unable to reject business."
        );
      } finally {
        setProcessingId(null);
      }
    };

  /*
   * ==========================================
   * LOADING
   * ==========================================
   */

  if (loading) {
    return (
      <AdminProtected>
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">

          <div className="rounded-3xl bg-white p-10 text-center shadow-xl">

            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

            <h2 className="text-2xl font-bold text-blue-700">
              Loading Pending Approvals...
            </h2>

            <p className="mt-2 text-gray-500">
              Please wait...
            </p>

          </div>

        </main>
      </AdminProtected>
    );
  }

  /*
   * ==========================================
   * PAGE
   * ==========================================
   */

  return (
    <AdminProtected>
      <main className="min-h-screen bg-slate-100 p-6 md:p-8">

        <div className="mx-auto max-w-7xl">

          {/* =================================
              HEADER
          ================================= */}

          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <h1 className="text-3xl font-bold text-orange-600 md:text-4xl">
                ⏳ Pending Approvals
              </h1>

              <p className="mt-2 text-gray-600">
                Review and approve businesses waiting
                to join the SBC Partner Network.
              </p>

            </div>

            <div className="flex flex-wrap gap-3">

              <button
                onClick={
                  loadPendingBusinesses
                }
                className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white transition hover:bg-green-700"
              >
                🔄 Refresh
              </button>

              <Link
                href="/admin/dashboard"
                className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700"
              >
                🏠 Dashboard
              </Link>

            </div>

          </div>

          {/* =================================
              COUNT
          ================================= */}

          <div className="mb-8 rounded-3xl border-2 border-orange-200 bg-orange-50 p-6 shadow">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
                  Businesses Waiting
                </p>

                <h2 className="mt-1 text-3xl font-bold text-orange-700">
                  {businesses.length}
                </h2>

              </div>

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-200 text-3xl">
                ⏳
              </div>

            </div>

          </div>

          {/* =================================
              NO PENDING BUSINESSES
          ================================= */}

          {businesses.length === 0 ? (

            <div className="rounded-3xl bg-white p-12 text-center shadow-xl md:p-16">

              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-5xl">
                ✅
              </div>

              <h2 className="mt-6 text-3xl font-bold text-green-700">
                No Pending Approvals
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-gray-500">
                All business registrations have been
                reviewed. New registrations will appear
                here automatically.
              </p>

              <Link
                href="/admin/dashboard"
                className="mt-7 inline-block rounded-xl bg-blue-600 px-8 py-4 font-bold text-white transition hover:bg-blue-700"
              >
                ← Back to Dashboard
              </Link>

            </div>

          ) : (

            /* =================================
               BUSINESS LIST
            ================================= */

            <div className="grid gap-6">

              {businesses.map(
                (business) => {

                  const processing =
                    processingId ===
                    business.id;

                  return (
                    <div
                      key={
                        business.id
                      }
                      className="overflow-hidden rounded-3xl border-2 border-orange-200 bg-white shadow-xl"
                    >

                      {/* TOP */}

                      <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">

                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                          <div>

                            <div className="mb-2 inline-block rounded-full bg-white/20 px-4 py-1 text-xs font-bold">
                              ⏳ PENDING APPROVAL
                            </div>

                            <h2 className="text-3xl font-bold">
                              🏪{" "}
                              {business.businessName ||
                                "Business"}
                            </h2>

                            <p className="mt-1 text-orange-50">
                              Owner:{" "}
                              {business.ownerName ||
                                "-"}
                            </p>

                          </div>

                          <div className="rounded-2xl bg-white px-5 py-3 text-center text-orange-600 shadow">

                            <p className="text-xs font-bold uppercase">
                              Status
                            </p>

                            <p className="text-lg font-extrabold">
                              PENDING
                            </p>

                          </div>

                        </div>

                      </div>

                      {/* DETAILS */}

                      <div className="p-6">

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                          {/* OWNER */}

                          <div className="rounded-2xl bg-slate-50 p-5">

                            <p className="text-sm font-semibold text-gray-500">
                              👤 Owner Name
                            </p>

                            <p className="mt-2 text-lg font-bold text-gray-800">
                              {business.ownerName ||
                                "-"}
                            </p>

                          </div>

                          {/* MOBILE */}

                          <div className="rounded-2xl bg-slate-50 p-5">

                            <p className="text-sm font-semibold text-gray-500">
                              📱 Mobile
                            </p>

                            <p className="mt-2 text-lg font-bold text-gray-800">
                              {business.mobile ||
                                "-"}
                            </p>

                          </div>

                          {/* EMAIL */}

                          <div className="rounded-2xl bg-slate-50 p-5">

                            <p className="text-sm font-semibold text-gray-500">
                              📧 Email
                            </p>

                            <p className="mt-2 break-all text-lg font-bold text-gray-800">
                              {business.email ||
                                "-"}
                            </p>

                          </div>

                          {/* CATEGORY */}

                          <div className="rounded-2xl bg-slate-50 p-5">

                            <p className="text-sm font-semibold text-gray-500">
                              🏷️ Category
                            </p>

                            <p className="mt-2 text-lg font-bold text-gray-800">
                              {business.category ||
                                "-"}
                            </p>

                          </div>

                          {/* ADDRESS */}

                          <div className="rounded-2xl bg-slate-50 p-5 md:col-span-2">

                            <p className="text-sm font-semibold text-gray-500">
                              📍 Business Address
                            </p>

                            <p className="mt-2 text-lg font-bold text-gray-800">
                              {business.address ||
                                "-"}
                            </p>

                          </div>

                        </div>

                        {/* APPROVAL AREA */}

                        <div className="mt-6 rounded-2xl border-2 border-orange-200 bg-orange-50 p-6">

                          <h3 className="text-xl font-bold text-orange-700">
                            ⚠️ Approval Required
                          </h3>

                          <p className="mt-2 text-gray-600">
                            Verify the business details
                            before approving this SBC
                            Partner Business.
                          </p>

                          <div className="mt-5 flex flex-col gap-3 sm:flex-row">

                            <button
                              onClick={() =>
                                approveBusiness(
                                  business
                                )
                              }
                              disabled={
                                processing
                              }
                              className="flex-1 rounded-xl bg-green-600 py-4 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {processing
                                ? "Processing..."
                                : "✅ Approve Business"}
                            </button>

                            <button
                              onClick={() =>
                                rejectBusiness(
                                  business
                                )
                              }
                              disabled={
                                processing
                              }
                              className="flex-1 rounded-xl bg-red-600 py-4 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              ❌ Reject Business
                            </button>

                          </div>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </div>

      </main>
    </AdminProtected>
  );
}