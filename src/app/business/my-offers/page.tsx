"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BusinessProtected from "@/components/BusinessProtected";

import { auth, db } from "@/lib/firebase";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
} from "firebase/firestore";

interface Offer {
  id: string;
  title: string;
  discount: string;
  description: string;
  category: string;
  image: string;
  status: string;
}

export default function MyOffers() {
  const router = useRouter();

  const [offers, setOffers] =
    useState<Offer[]>([]);

  const [loading, setLoading] =
    useState(true);

  /*
   * Load business offers
   */
  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!user) {
            router.replace(
              "/business/login"
            );
            return;
          }

          try {
            const q = query(
              collection(db, "offers"),
              where(
                "businessId",
                "==",
                user.uid
              )
            );

            const snap =
              await getDocs(q);

            const loadedOffers =
              snap.docs.map((item) => {
                const data =
                  item.data();

                return {
                  id: item.id,
                  title:
                    data.title || "",
                  discount:
                    data.discount || "",
                  description:
                    data.description ||
                    "",
                  category:
                    data.category || "",
                  image:
                    data.image || "",
                  status:
                    data.status || "active",
                };
              });

            setOffers(
              loadedOffers
            );
          } catch (error) {
            console.error(
              "Error loading offers:",
              error
            );
          } finally {
            setLoading(false);
          }
        }
      );

    return () =>
      unsubscribe();
  }, [router]);

  /*
   * Logout
   */
  const logout = async () => {
    try {
      await signOut(auth);

      router.replace(
        "/business/login"
      );
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  };

  /*
   * Delete offer
   */
  const deleteOffer = async (
    id: string,
    title: string
  ) => {
    const ok = window.confirm(
      `Delete "${title}" ?`
    );

    if (!ok) {
      return;
    }

    try {
      await deleteDoc(
        doc(db, "offers", id)
      );

      setOffers((prev) =>
        prev.filter(
          (offer) =>
            offer.id !== id
        )
      );

      alert(
        "✅ Offer Deleted Successfully"
      );
    } catch (error) {
      console.error(
        "Delete offer error:",
        error
      );

      alert(
        "❌ Failed to delete offer"
      );
    }
  };

  /*
   * Loading
   */
  if (loading) {
    return (
      <BusinessProtected>
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">

          <div className="rounded-3xl bg-white p-10 text-center shadow-xl">

            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />

            <h2 className="text-2xl font-bold text-green-700">
              Loading Offers...
            </h2>

            <p className="mt-2 text-gray-500">
              Please wait...
            </p>

          </div>

        </div>
      </BusinessProtected>
    );
  }

  return (
    <BusinessProtected>
      <main className="min-h-screen bg-slate-100 p-5 md:p-6">

        <div className="mx-auto max-w-7xl">

          {/* =====================================
              HEADER
          ===================================== */}

          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <h1 className="text-3xl font-bold text-green-700 md:text-4xl">
                🎁 My Offers
              </h1>

              <p className="mt-2 text-gray-600">
                Manage all your business offers.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">

              <button
                onClick={() =>
                  router.push(
                    "/business/dashboard"
                  )
                }
                className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700"
              >
                🏠 Dashboard
              </button>

              <button
                onClick={() =>
                  router.push(
                    "/business/add-offer"
                  )
                }
                className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white transition hover:bg-green-700"
              >
                ➕ Add Offer
              </button>

              <button
                onClick={logout}
                className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700"
              >
                🚪 Logout
              </button>

            </div>

          </div>


          {/* =====================================
              NO OFFERS
          ===================================== */}

          {offers.length === 0 ? (

            <div className="rounded-3xl bg-white p-10 text-center shadow-xl md:p-14">

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
                🎁
              </div>

              <h2 className="mt-6 text-3xl font-bold text-gray-800">
                No Offers Found
              </h2>

              <p className="mx-auto mt-3 max-w-lg text-gray-500">
                Create your first offer and
                start giving exclusive
                privileges to SBC students.
              </p>

              <button
                onClick={() =>
                  router.push(
                    "/business/add-offer"
                  )
                }
                className="mt-7 rounded-xl bg-green-600 px-8 py-4 text-lg font-bold text-white transition hover:bg-green-700"
              >
                ➕ Create First Offer
              </button>

            </div>

          ) : (

            <>
              {/* =================================
                  OFFERS GRID
              ================================= */}

              <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">

                {offers.map((offer) => (

                  <div
                    key={offer.id}
                    className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-lg transition duration-200 hover:-translate-y-1 hover:shadow-2xl"
                  >

                    {/* =============================
                        IMAGE
                    ============================== */}

                    <div className="relative h-56 w-full shrink-0 overflow-hidden bg-gray-100">

                      {offer.image ? (

                        <img
                          src={offer.image}
                          alt={offer.title}
                          className="h-full w-full object-cover"
                        />

                      ) : (

                        <div className="flex h-full w-full items-center justify-center bg-slate-200">

                          <span className="text-5xl">
                            🎁
                          </span>

                        </div>

                      )}

                      {/* Status */}

                      <div className="absolute right-4 top-4">

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold shadow ${
                            offer.status ===
                            "active"
                              ? "bg-green-600 text-white"
                              : "bg-gray-600 text-white"
                          }`}
                        >
                          {offer.status ===
                          "active"
                            ? "ACTIVE"
                            : offer.status?.toUpperCase()}
                        </span>

                      </div>

                    </div>


                    {/* =============================
                        CARD CONTENT
                    ============================== */}

                    <div className="flex flex-1 flex-col p-6">

                      {/* Category */}

                      <div className="h-7">

                        <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          {offer.category ||
                            "Other"}
                        </span>

                      </div>


                      {/* Title */}

                      <div className="mt-4 min-h-[68px]">

                        <h2 className="line-clamp-2 text-2xl font-bold leading-tight text-gray-900">
                          {offer.title}
                        </h2>

                      </div>


                      {/* Discount */}

                      <div className="mt-2 h-12">

                        <p className="text-3xl font-bold text-green-600">
                          {offer.discount}
                        </p>

                      </div>


                      {/* Description */}

                      <div className="mt-4 h-[96px] overflow-hidden">

                        <p className="line-clamp-4 text-sm leading-6 text-gray-600">
                          {offer.description ||
                            "No description available."}
                        </p>

                      </div>


                      {/* Spacer */}

                      <div className="flex-1" />


                      {/* Divider */}

                      <div className="my-5 border-t border-gray-100" />


                      {/* Buttons */}

                      <div className="grid grid-cols-2 gap-3">

                        <button
                          onClick={() =>
                            router.push(
                              `/business/edit-offer/${offer.id}`
                            )
                          }
                          className="rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700"
                        >
                          ✏️ Edit
                        </button>

                        <button
                          onClick={() =>
                            deleteOffer(
                              offer.id,
                              offer.title
                            )
                          }
                          className="rounded-xl bg-red-600 py-3 font-bold text-white transition hover:bg-red-700"
                        >
                          🗑 Delete
                        </button>

                      </div>

                    </div>

                  </div>

                ))}

              </div>


              {/* =================================
                  TOTAL OFFERS
              ================================= */}

              <div className="mt-10 rounded-3xl bg-white p-6 shadow-xl">

                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <h2 className="text-xl font-bold text-gray-800">
                      Total Offers
                    </h2>

                    <p className="mt-1 text-gray-500">
                      You currently have{" "}
                      {offers.length}{" "}
                      {offers.length === 1
                        ? "offer"
                        : "offers"}.
                    </p>

                  </div>

                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">

                    <span className="text-2xl font-bold text-green-700">
                      {offers.length}
                    </span>

                  </div>

                </div>

              </div>

            </>

          )}

        </div>

      </main>
    </BusinessProtected>
  );
}