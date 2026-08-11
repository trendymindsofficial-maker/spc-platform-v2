"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

export default function StudentOffers() {
  const router = useRouter();

  const [offers, setOffers] =
    useState<any[]>([]);

  const [filteredOffers, setFilteredOffers] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("All");

  const [selectedOffer, setSelectedOffer] =
    useState<any>(null);

  /*
   * Load active offers
   */
  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!user) {
            router.replace(
              "/student/login"
            );
            return;
          }

          try {
            const q = query(
              collection(db, "offers"),
              where(
                "status",
                "==",
                "active"
              )
            );

            const snap =
              await getDocs(q);

            const data =
              snap.docs.map((item) => ({
                id: item.id,
                ...item.data(),
              }));

            setOffers(data);
            setFilteredOffers(data);
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
   * Search + category filter
   */
  useEffect(() => {
    let list = [...offers];

    if (category !== "All") {
      list = list.filter(
        (offer) =>
          offer.category ===
          category
      );
    }

    if (search.trim()) {
      list = list.filter(
        (offer) =>
          String(
            offer.title || ""
          )
            .toLowerCase()
            .includes(
              search
                .toLowerCase()
                .trim()
            )
      );
    }

    setFilteredOffers(list);
  }, [
    offers,
    search,
    category,
  ]);

  /*
   * Loading
   */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">

        <div className="rounded-3xl bg-white p-10 text-center shadow-xl">

          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />

          <h1 className="text-2xl font-bold text-green-600">
            Loading Offers...
          </h1>

        </div>

      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 py-8 md:py-10">

      <div className="mx-auto max-w-7xl px-5 md:px-6">

        {/* =====================================
            HEADER
        ====================================== */}

        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div>

            <h1 className="text-4xl font-extrabold text-green-600 md:text-5xl">
              🎁 Student Offers
            </h1>

            <p className="mt-2 text-base text-gray-500 md:text-lg">
              Exclusive Discounts for SPC Students
            </p>

          </div>

          <button
            onClick={() =>
              router.push(
                "/student/dashboard"
              )
            }
            className="rounded-2xl bg-green-600 px-7 py-4 font-bold text-white shadow-md transition hover:bg-green-700"
          >
            🏠 Dashboard
          </button>

        </div>


        {/* =====================================
            SEARCH + CATEGORY
        ====================================== */}

        <div className="mb-10 grid gap-5 md:grid-cols-2">

          <input
            type="text"
            placeholder="🔍 Search Offers..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />

          <select
            value={category}
            onChange={(e) =>
              setCategory(
                e.target.value
              )
            }
            className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          >
            <option value="All">
              All
            </option>

            <option value="Restaurant">
              Restaurant
            </option>

            <option value="Hospital">
              Hospital
            </option>

            <option value="Shopping">
              Shopping
            </option>

            <option value="Clothing">
              Clothing
            </option>

            <option value="Gym">
              Gym
            </option>

            <option value="Education">
              Education
            </option>

            <option value="Electronics">
              Electronics
            </option>

            <option value="Salon">
              Salon
            </option>

            <option value="Other">
              Other
            </option>
          </select>

        </div>


        {/* =====================================
            NO OFFERS
        ====================================== */}

        {filteredOffers.length === 0 ? (

          <div className="rounded-3xl bg-white p-16 text-center shadow-xl">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
              🎁
            </div>

            <h2 className="mt-6 text-3xl font-bold text-green-600">
              No Offers Found
            </h2>

            <p className="mt-3 text-gray-500">
              No active offers available.
            </p>

          </div>

        ) : (

          /* =====================================
             OFFERS GRID
          ====================================== */

          <div className="grid items-stretch gap-7 md:grid-cols-2 lg:grid-cols-3">

            {filteredOffers.map(
              (offer) => (

                <div
                  key={offer.id}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-yellow-400 hover:shadow-[0_20px_50px_rgba(234,179,8,0.35)]"
                >

                  {/* ============================
                      IMAGE
                  ============================= */}

                  <div className="h-64 w-full shrink-0 overflow-hidden bg-gray-200">

                    {offer.image ? (

                      <img
                        src={offer.image}
                        alt={
                          offer.title ||
                          "Offer"
                        }
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />

                    ) : (

                      <div className="flex h-full w-full items-center justify-center text-6xl">
                        🎁
                      </div>

                    )}

                  </div>


                  {/* ============================
                      CONTENT
                  ============================= */}

                  <div className="flex flex-1 flex-col bg-slate-100 p-6">

                    {/* Category */}

                    <div className="flex min-h-[42px] flex-wrap content-start gap-2">

                      <span className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-xs font-bold text-white shadow">
                        {offer.category ||
                          "Other"}
                      </span>

                      <span className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-xs font-bold text-black shadow">
                        🔥 SPC Exclusive
                      </span>

                    </div>


                    {/* Business */}

                    <div className="mt-3 h-6 overflow-hidden">

                      <p className="truncate text-sm font-semibold text-slate-500">
                        🏢{" "}
                        {offer.businessName ||
                          "SPC Partner Business"}
                      </p>

                    </div>


                    {/* Title */}

                    <div className="mt-2 min-h-[76px]">

                      <h2 className="line-clamp-2 text-2xl font-bold leading-tight text-green-600 md:text-[27px]">
                        {offer.title ||
                          "Special Offer"}
                      </h2>

                    </div>


                    {/* Discount */}

                    <div className="mt-2 flex h-[52px] items-start">

                      <h3 className="bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-4xl font-extrabold text-transparent">
                        {offer.discount ||
                          ""}
                      </h3>

                    </div>


                    {/* Description
                        FIXED HEIGHT
                    */}

                    <div className="mt-3 h-[72px] overflow-hidden">

                      <p className="line-clamp-3 text-sm leading-6 text-gray-600">
                        {offer.description ||
                          "Exclusive offer for SPC students."}
                      </p>

                    </div>


                    {/* Spacer
                        Pushes buttons
                        to bottom
                    */}

                    <div className="flex-1" />


                    {/* Buttons */}

                    <div className="mt-6 grid grid-cols-2 gap-3">

                      <button
                        onClick={() =>
                          setSelectedOffer(
                            offer
                          )
                        }
                        className="rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 md:text-base"
                      >
                        👁 View Details
                      </button>

                      <button
                        onClick={() =>
                          router.push(
                            "/student/dashboard"
                          )
                        }
                        className="rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 md:text-base"
                      >
                        📱 My QR
                      </button>

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        )}


        {/* =====================================
            PREMIUM OFFER POPUP
        ====================================== */}

        {selectedOffer && (

          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() =>
              setSelectedOffer(null)
            }
          >

            <div
              onClick={(e) =>
                e.stopPropagation()
              }
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            >

              {/* Popup Image */}

              {selectedOffer.image && (
                <img
                  src={
                    selectedOffer.image
                  }
                  alt={
                    selectedOffer.title
                  }
                  className="h-64 w-full object-cover md:h-80"
                />
              )}


              {/* Popup Content */}

              <div className="bg-slate-100 p-6 md:p-8">

                {/* Category */}

                <div className="mb-5 flex flex-wrap gap-3">

                  <span className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-bold text-white">
                    {
                      selectedOffer.category
                    }
                  </span>

                  <span className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-sm font-bold text-black">
                    🔥 SPC Exclusive
                  </span>

                </div>


                {/* Business */}

                <p className="text-base font-semibold text-slate-500 md:text-lg">
                  🏢{" "}
                  {selectedOffer.businessName ||
                    "SPC Partner Business"}
                </p>


                {/* Title */}

                <h1 className="mt-2 text-3xl font-extrabold text-green-600 md:text-4xl">
                  {
                    selectedOffer.title
                  }
                </h1>


                {/* Discount */}

                <h2 className="mt-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-4xl font-extrabold text-transparent md:text-5xl">
                  {
                    selectedOffer.discount
                  }
                </h2>


                {/* Description */}

                <div className="mt-7 rounded-2xl bg-white p-6 shadow">

                  <h3 className="mb-3 text-xl font-bold text-green-600 md:text-2xl">
                    Offer Description
                  </h3>

                  <p className="leading-7 text-gray-700">
                    {
                      selectedOffer.description
                    }
                  </p>

                </div>


                {/* Popup Buttons */}

                <div className="mt-7 grid gap-3 md:grid-cols-2">

                  <button
                    onClick={() =>
                      router.push(
                        "/student/dashboard"
                      )
                    }
                    className="rounded-xl bg-green-600 py-4 text-lg font-bold text-white transition hover:bg-green-700"
                  >
                    📱 Show My QR
                  </button>

                  <button
                    onClick={() =>
                      setSelectedOffer(
                        null
                      )
                    }
                    className="rounded-xl bg-gray-700 py-4 text-lg font-bold text-white transition hover:bg-gray-800"
                  >
                    ✖ Close
                  </button>

                </div>

              </div>

            </div>

          </div>

        )}


        {/* =====================================
            TOTAL OFFERS
        ====================================== */}

        <div className="mt-12 rounded-3xl border border-gray-200 bg-slate-100 p-6 shadow-xl md:p-8">

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div>

              <h2 className="text-2xl font-bold text-green-600 md:text-3xl">
                🎉 Total Active Offers
              </h2>

              <p className="mt-2 text-gray-600">
                Discover amazing discounts
                from SPC Partner Businesses.
              </p>

            </div>

            <div className="rounded-3xl bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 px-8 py-5 shadow-lg md:px-10 md:py-6">

              <span className="block text-center text-4xl font-extrabold text-white md:text-5xl">
                {
                  filteredOffers.length
                }
              </span>

              <p className="mt-1 text-center text-xs font-bold uppercase tracking-wide text-white">
                Active Offers
              </p>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}