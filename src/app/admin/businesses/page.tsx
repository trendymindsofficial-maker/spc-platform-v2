"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AdminProtected from "@/components/AdminProtected";
import { db } from "@/lib/firebase";

import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

interface Business {
  id: string;
  businessName: string;
  ownerName: string;
  mobile: string;
  category: string;
  status: string;
  createdAt?: any;
}

export default function AdminBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // VIEW / EDIT BUSINESS
  const [selectedBusiness, setSelectedBusiness] =
    useState<Business | null>(null);
  const [modalMode, setModalMode] =
    useState<"view" | "edit" | null>(null);
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const [categories, setCategories] = useState<
    { id: string; name: string }[]
  >([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  /*
   * ==========================================
   * LOAD BUSINESSES
   * ==========================================
   */

  const loadBusinesses = async () => {
    try {
      setLoading(true);

      const snap = await getDocs(
        collection(db, "businesses")
      );

      const data = snap.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as Business[];

      setBusinesses(data);
    } catch (error) {
      console.error(
        "Error loading businesses:",
        error
      );

      alert(
        "Unable to load businesses."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, []);

  /*
   * ==========================================
   * LOAD EXISTING CATEGORIES
   * ==========================================
   */

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);

        const snap = await getDocs(
          collection(db, "categories")
        );

        const data = snap.docs
          .map((item) => {
            const itemData = item.data();

            return {
              id: item.id,
              name:
                itemData.name ||
                itemData.category ||
                itemData.title ||
                "",
            };
          })
          .filter(
            (item) => item.name.trim() !== ""
          )
          .sort((a, b) =>
            a.name.localeCompare(b.name)
          );

        setCategories(data);
      } catch (error) {
        console.error(
          "Category loading error:",
          error
        );
        alert(
          "Unable to load business categories."
        );
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  /*
   * ==========================================
   * APPROVE BUSINESS
   * ==========================================
   */

  const approveBusiness = async (
    id: string,
    name: string
  ) => {
    const ok = window.confirm(
      `Approve "${name}" as an SBC Partner Business?`
    );

    if (!ok) {
      return;
    }

    try {
      setActionLoading(id);

      await updateDoc(
        doc(db, "businesses", id),
        {
          status: "approved",
        }
      );

      setBusinesses(
        (currentBusinesses) =>
          currentBusinesses.map(
            (business) =>
              business.id === id
                ? {
                    ...business,
                    status: "approved",
                  }
                : business
          )
      );

      alert(
        `${name} approved successfully.`
      );
    } catch (error) {
      console.error(
        "Error approving business:",
        error
      );

      alert(
        "Unable to approve business."
      );
    } finally {
      setActionLoading(null);
    }
  };

  /*
   * ==========================================
   * REJECT BUSINESS
   * ==========================================
   */

  const rejectBusiness = async (
    id: string,
    name: string
  ) => {
    const ok = window.confirm(
      `Reject "${name}"?`
    );

    if (!ok) {
      return;
    }

    try {
      setActionLoading(id);

      await updateDoc(
        doc(db, "businesses", id),
        {
          status: "rejected",
        }
      );

      setBusinesses(
        (currentBusinesses) =>
          currentBusinesses.map(
            (business) =>
              business.id === id
                ? {
                    ...business,
                    status: "rejected",
                  }
                : business
          )
      );

      alert(
        `${name} rejected.`
      );
    } catch (error) {
      console.error(
        "Error rejecting business:",
        error
      );

      alert(
        "Unable to reject business."
      );
    } finally {
      setActionLoading(null);
    }
  };

  /*
   * ==========================================
   * VIEW BUSINESS
   * ==========================================
   */

  const openViewBusiness = (business: Business) => {
    setSelectedBusiness(business);
    setModalMode("view");
  };

  /*
   * ==========================================
   * EDIT BUSINESS
   * ==========================================
   */

  const openEditBusiness = (business: Business) => {
    setSelectedBusiness(business);
    setEditBusinessName(business.businessName || "");
    setEditOwnerName(business.ownerName || "");
    setEditMobile(business.mobile || "");
    setEditCategory(business.category || "");
    setModalMode("edit");
  };

  const closeBusinessModal = () => {
    setSelectedBusiness(null);
    setModalMode(null);
  };

  const saveBusiness = async () => {
    if (!selectedBusiness) return;

    const businessName = editBusinessName.trim();
    const ownerName = editOwnerName.trim();
    const mobile = editMobile.trim();
    const category = editCategory.trim();

    if (!businessName || !ownerName || !mobile || !category) {
      alert("Please fill all business details.");
      return;
    }

    try {
      setActionLoading(selectedBusiness.id);

      await updateDoc(
        doc(db, "businesses", selectedBusiness.id),
        {
          businessName,
          ownerName,
          mobile,
          category,
        }
      );

      setBusinesses((currentBusinesses) =>
        currentBusinesses.map((business) =>
          business.id === selectedBusiness.id
            ? {
                ...business,
                businessName,
                ownerName,
                mobile,
                category,
              }
            : business
        )
      );

      alert("Business details updated successfully.");
      closeBusinessModal();
    } catch (error) {
      console.error("Error updating business:", error);
      alert("Unable to update business details.");
    } finally {
      setActionLoading(null);
    }
  };

  /*
   * ==========================================
   * DELETE BUSINESS
   * ==========================================
   */

  const deleteBusiness = async (
    id: string,
    name: string
  ) => {
    const ok = window.confirm(
      `Delete "${name}" permanently?`
    );

    if (!ok) {
      return;
    }

    try {
      setActionLoading(id);

      await deleteDoc(
        doc(db, "businesses", id)
      );

      setBusinesses(
        (currentBusinesses) =>
          currentBusinesses.filter(
            (business) =>
              business.id !== id
          )
      );
    } catch (error) {
      console.error(
        "Error deleting business:",
        error
      );

      alert(
        "Unable to delete business."
      );
    } finally {
      setActionLoading(null);
    }
  };

  /*
   * ==========================================
   * HELPERS
   * ==========================================
   */

  const isPending = (
    business: Business
  ) =>
    business.status?.toLowerCase() ===
    "pending";

  const getCreatedTime = (
    business: Business
  ) => {
    try {
      if (
        business.createdAt?.toMillis
      ) {
        return business.createdAt.toMillis();
      }

      if (
        business.createdAt?.seconds
      ) {
        return (
          business.createdAt.seconds *
          1000
        );
      }

      if (
        business.createdAt instanceof Date
      ) {
        return business.createdAt.getTime();
      }

      if (
        typeof business.createdAt ===
        "string"
      ) {
        const time = new Date(
          business.createdAt
        ).getTime();

        return Number.isNaN(time)
          ? 0
          : time;
      }

      return 0;
    } catch {
      return 0;
    }
  };

  /*
   * ==========================================
   * FILTER + SORT
   * ==========================================
   *
   * ORDER:
   *
   * 1. Pending businesses
   * 2. Latest registrations
   * 3. Approved businesses
   * 4. Rejected businesses
   *
   */

  const filteredBusinesses =
    useMemo(() => {
      const searchText =
        search.trim().toLowerCase();

      return [...businesses]
        .filter((business) => {
          if (!searchText) {
            return true;
          }

          return (
            business.businessName
              ?.toLowerCase()
              .includes(searchText) ||
            business.ownerName
              ?.toLowerCase()
              .includes(searchText) ||
            business.mobile
              ?.toLowerCase()
              .includes(searchText) ||
            business.category
              ?.toLowerCase()
              .includes(searchText)
          );
        })
        .sort((a, b) => {
          const statusA =
            a.status?.toLowerCase();

          const statusB =
            b.status?.toLowerCase();

          /*
           * Pending first
           */

          const pendingA =
            statusA === "pending";

          const pendingB =
            statusB === "pending";

          if (
            pendingA &&
            !pendingB
          ) {
            return -1;
          }

          if (
            !pendingA &&
            pendingB
          ) {
            return 1;
          }

          /*
           * Then latest registration first
           */

          const timeA =
            getCreatedTime(a);

          const timeB =
            getCreatedTime(b);

          if (
            timeA !== timeB
          ) {
            return timeB - timeA;
          }

          /*
           * Fallback alphabetical
           */

          return (
            a.businessName || ""
          ).localeCompare(
            b.businessName || ""
          );
        });
    }, [businesses, search]);

  /*
   * ==========================================
   * PENDING COUNT
   * ==========================================
   */

  const pendingCount =
    businesses.filter(
      (business) =>
        isPending(business)
    ).length;

  /*
   * ==========================================
   * PAGE
   * ==========================================
   */

  return (
    <AdminProtected>
      <main className="min-h-screen bg-[#f5f1e6] p-8">
        <div className="mx-auto max-w-7xl">

          {/* ==================================
              HEADER
          =================================== */}

          <div className="mb-8 overflow-hidden rounded-[28px] bg-gradient-to-r from-[#07111f] via-[#111b2e] to-[#3b2b0b] p-7 shadow-2xl ring-1 ring-[#d4af37]/30">

            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

              <div>
                <div className="mb-3 inline-flex items-center rounded-full bg-[#d4af37]/15 px-4 py-1.5 text-xs font-extrabold tracking-[0.18em] text-[#f1cf63]">
                  SBC ADMIN
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  🏪 Business Management
                </h1>

                <p className="mt-2 text-sm text-slate-300 sm:text-base">
                  Approve, Reject and Manage Businesses
                </p>
              </div>

              <Link
                href="/admin/dashboard"
                className="rounded-xl bg-white px-6 py-3 text-center font-bold text-[#07111f] shadow-lg transition hover:bg-[#f7e8ad] hover:text-[#5b4300]"
              >
                ← Dashboard
              </Link>

            </div>

          </div>

          {/* ==================================
              PENDING APPROVAL
          =================================== */}

          {!loading && (
            <div
              className={`mb-6 rounded-2xl p-5 shadow ${
                pendingCount > 0
                  ? "border border-[#d4af37]/40 bg-gradient-to-r from-[#fff8df] to-[#f2df9b]"
                  : "bg-white/90"
              }`}
            >

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                <div>
                  <p
                    className={`text-lg font-bold ${
                      pendingCount > 0
                        ? "text-[#8a680c]"
                        : "text-[#8a680c]"
                    }`}
                  >
                    {pendingCount > 0
                      ? "⏳ Pending Business Approvals"
                      : "✅ No Pending Business Approvals"}
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    {pendingCount > 0
                      ? "New businesses waiting for admin verification."
                      : "All currently registered businesses have been reviewed."}
                  </p>
                </div>

                <div
                  className={`rounded-xl px-6 py-3 text-2xl font-extrabold ${
                    pendingCount > 0
                      ? "bg-[#07111f] text-[#f1cf63]"
                      : "bg-green-100 text-[#8a680c]"
                  }`}
                >
                  {pendingCount}
                </div>

              </div>

            </div>
          )}

          {/* ==================================
              SEARCH
          =================================== */}

          <input
            type="text"
            placeholder="🔍 Search Business, Owner, Mobile or Category..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="mb-8 w-full rounded-2xl border border-[#d4af37]/30 bg-white/95 p-4 text-[#07111f] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
          />

          {/* ==================================
              LOADING
          =================================== */}

          {loading ? (

            <div className="rounded-[28px] border border-[#d4af37]/20 bg-white p-10 text-center shadow-sm">

              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />

              <h2 className="text-2xl font-bold">
                Loading Businesses...
              </h2>

            </div>

          ) : (

            <div className="grid gap-6">

              {/* ==================================
                  NO BUSINESSES
              =================================== */}

              {filteredBusinesses.length ===
              0 ? (

                <div className="rounded-[28px] border border-[#d4af37]/20 bg-white p-10 text-center shadow-sm">

                  <h2 className="text-2xl font-bold">
                    No Businesses Found
                  </h2>

                  <p className="mt-3 text-gray-500">
                    Try a different search.
                  </p>

                </div>

              ) : (

                filteredBusinesses.map(
                  (business, index) => {

                    const pending =
                      isPending(
                        business
                      );

                    const recent =
                      index < 5 &&
                      getCreatedTime(
                        business
                      ) > 0;

                    const actionBusy =
                      actionLoading ===
                      business.id;

                    return (
                      <div
                        key={business.id}
                        className={`rounded-[28px] p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl ${
                          pending
                            ? "border-2 border-[#d4af37] bg-gradient-to-r from-[#fff4c7] via-[#fffdf5] to-[#f0d985]"
                            : "border border-[#d4af37]/25 bg-gradient-to-r from-[#fff8df] via-[#fffdf8] to-[#f4e4a8]"
                        }`}
                      >

                        <div className="grid gap-6 md:grid-cols-2">

                          {/* ==================================
                              BUSINESS INFO
                          =================================== */}

                          <div>

                            {/* NEW BADGE */}

                            {pending && (
                              <div className="mb-3 inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700">
                                ⏳ PENDING APPROVAL
                              </div>
                            )}

                            {!pending &&
                              recent && (
                                <div className="mb-3 inline-flex rounded-full bg-[#07111f]/10 px-4 py-2 text-sm font-bold text-[#07111f]">
                                  🆕 RECENTLY JOINED
                                </div>
                              )}

                            <h2 className="text-3xl font-extrabold text-[#07111f]">
                              {
                                business.businessName
                              }
                            </h2>

                            <p className="mt-4 text-gray-600">
                              👤 Owner :
                              <span className="font-semibold">
                                {" "}
                                {
                                  business.ownerName ||
                                  "-"
                                }
                              </span>
                            </p>

                            <p className="mt-2 text-gray-600">
                              📱 Mobile :
                              <span className="font-semibold">
                                {" "}
                                {
                                  business.mobile ||
                                  "-"
                                }
                              </span>
                            </p>

                            <p className="mt-2 text-gray-600">
                              🏷 Category :
                              <span className="font-semibold">
                                {" "}
                                {
                                  business.category ||
                                  "-"
                                }
                              </span>
                            </p>

                            {getCreatedTime(
                              business
                            ) > 0 && (
                              <p className="mt-2 text-sm text-gray-500">
                                🕐 Registered :
                                <span className="font-semibold">
                                  {" "}
                                  {new Date(
                                    getCreatedTime(
                                      business
                                    )
                                  ).toLocaleString()}
                                </span>
                              </p>
                            )}

                          </div>

                          {/* ==================================
                              STATUS + ACTIONS
                          =================================== */}

                          <div className="flex flex-col items-start justify-center">

                            <span
                              className={`rounded-full px-5 py-2 font-bold text-white ${
                                business.status
                                  ?.toLowerCase() ===
                                "approved"
                                  ? "bg-emerald-600"
                                  : business.status
                                        ?.toLowerCase() ===
                                    "pending"
                                  ? "bg-orange-500"
                                  : "bg-red-600"
                              }`}
                            >
                              {(
                                business.status ||
                                "unknown"
                              ).toUpperCase()}
                            </span>

                            <div className="mt-6 flex flex-wrap gap-3">

                              {/* VIEW */}

                              <button
                                onClick={() =>
                                  openViewBusiness(business)
                                }
                                disabled={actionBusy}
                                className="rounded-xl bg-[#07111f] px-5 py-3 font-bold text-[#f1cf63] shadow-sm transition hover:bg-[#18263d] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                👁 View
                              </button>

                              {/* EDIT */}

                              <button
                                onClick={() =>
                                  openEditBusiness(business)
                                }
                                disabled={actionBusy}
                                className="rounded-xl bg-[#6d4aff] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-[#5938e8] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                ✏️ Edit
                              </button>

                              {/* APPROVE */}

                              {business.status
                                ?.toLowerCase() !==
                                "approved" && (
                                <button
                                  onClick={() =>
                                    approveBusiness(
                                      business.id,
                                      business.businessName
                                    )
                                  }
                                  disabled={
                                    actionBusy
                                  }
                                  className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {actionBusy
                                    ? "Processing..."
                                    : "✅ Approve"}
                                </button>
                              )}

                              {/* REJECT */}

                              {business.status
                                ?.toLowerCase() !==
                                "rejected" && (
                                <button
                                  onClick={() =>
                                    rejectBusiness(
                                      business.id,
                                      business.businessName
                                    )
                                  }
                                  disabled={
                                    actionBusy
                                  }
                                  className="rounded-xl bg-[#d97706] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-[#b45309] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  ❌ Reject
                                </button>
                              )}

                              {/* DELETE */}

                              <button
                                onClick={() =>
                                  deleteBusiness(
                                    business.id,
                                    business.businessName
                                  )
                                }
                                disabled={
                                  actionBusy
                                }
                                className="rounded-xl bg-[#dc2626] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                🗑 Delete
                              </button>

                            </div>

                          </div>

                        </div>

                      </div>
                    );
                  }
                )

              )}

            </div>

          )}

          {/* ==================================
              VIEW / EDIT BUSINESS MODAL
          =================================== */}

          {selectedBusiness && modalMode && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-[#fffdf7] p-6 shadow-2xl ring-1 ring-[#d4af37]/25">

                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-extrabold text-[#07111f]">
                      {modalMode === "edit"
                        ? "✏️ Edit Business"
                        : "👁 Business Details"}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {modalMode === "edit"
                        ? "Update the business information below."
                        : "View the complete registered business information."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeBusinessModal}
                    className="rounded-full bg-gray-100 px-4 py-2 text-xl font-bold text-gray-600 transition hover:bg-gray-200"
                  >
                    ✕
                  </button>
                </div>

                {modalMode === "view" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#d4af37]/20 bg-gradient-to-r from-[#fffaf0] to-[#f8edc5] p-4">
                      <p className="text-sm font-semibold text-gray-500">
                        Business Name
                      </p>
                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {selectedBusiness.businessName || "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#d4af37]/20 bg-gradient-to-r from-[#fffaf0] to-[#f8edc5] p-4">
                      <p className="text-sm font-semibold text-gray-500">
                        Owner Name
                      </p>
                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {selectedBusiness.ownerName || "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#d4af37]/20 bg-gradient-to-r from-[#fffaf0] to-[#f8edc5] p-4">
                      <p className="text-sm font-semibold text-gray-500">
                        Mobile
                      </p>
                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {selectedBusiness.mobile || "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#d4af37]/20 bg-gradient-to-r from-[#fffaf0] to-[#f8edc5] p-4">
                      <p className="text-sm font-semibold text-gray-500">
                        Category
                      </p>
                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {selectedBusiness.category || "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#d4af37]/20 bg-gradient-to-r from-[#fffaf0] to-[#f8edc5] p-4 sm:col-span-2">
                      <p className="text-sm font-semibold text-gray-500">
                        Status
                      </p>
                      <p className="mt-1 text-lg font-bold uppercase text-gray-900">
                        {selectedBusiness.status || "-"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditBusiness(selectedBusiness)}
                      className="rounded-xl bg-[#07111f] px-5 py-3 font-bold text-[#f1cf63] transition hover:bg-[#18263d] sm:col-span-2"
                    >
                      ✏️ Edit Business
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block font-bold text-gray-700">
                        Business Name
                      </label>
                      <input
                        value={editBusinessName}
                        onChange={(e) =>
                          setEditBusinessName(e.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white p-4 outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-bold text-gray-700">
                        Owner Name
                      </label>
                      <input
                        value={editOwnerName}
                        onChange={(e) =>
                          setEditOwnerName(e.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white p-4 outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-bold text-gray-700">
                        Mobile
                      </label>
                      <input
                        value={editMobile}
                        onChange={(e) =>
                          setEditMobile(e.target.value)
                        }
                        inputMode="tel"
                        className="w-full rounded-xl border border-gray-300 bg-white p-4 outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-bold text-gray-700">
                        Category
                      </label>

                      <select
                        value={editCategory}
                        onChange={(e) =>
                          setEditCategory(e.target.value)
                        }
                        disabled={categoriesLoading}
                        className="w-full rounded-xl border border-gray-300 bg-white p-4 outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 disabled:cursor-not-allowed disabled:bg-gray-100"
                      >
                        <option value="">
                          {categoriesLoading
                            ? "Loading categories..."
                            : "Select Category"}
                        </option>

                        {categories.map((category) => (
                          <option
                            key={category.id}
                            value={category.name}
                          >
                            {category.name}
                          </option>
                        ))}
                      </select>

                      {!categoriesLoading &&
                        categories.length === 0 && (
                          <p className="mt-2 text-sm text-orange-600">
                            No categories found. Add categories from the Admin Dashboard.
                          </p>
                        )}
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-sm font-semibold text-gray-500">
                        Current Status
                      </p>
                      <p className="mt-1 font-bold uppercase text-gray-800">
                        {selectedBusiness.status || "-"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Use Approve / Reject buttons on the business card to change status.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={closeBusinessModal}
                        disabled={actionLoading === selectedBusiness.id}
                        className="flex-1 rounded-xl border border-gray-300 bg-white px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={saveBusiness}
                        disabled={actionLoading === selectedBusiness.id}
                        className="flex-1 rounded-xl bg-[#07111f] px-5 py-3 font-bold text-[#f1cf63] transition hover:bg-[#18263d] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading === selectedBusiness.id
                          ? "Saving..."
                          : "💾 Save Changes"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </AdminProtected>
  );
}