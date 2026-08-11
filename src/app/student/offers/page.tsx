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

interface Offer {
  id: string;
  title: string;
  discount: string;
  description?: string;
  image?: string;
  category?: string;
  status?: string;
  businessId?: string;
  businessName?: string;
  businessMobile?: string;
}

export default function StudentOffers() {
  const router = useRouter();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [filteredOffers, setFilteredOffers] =
    useState<Offer[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("All");

  const [selectedOffer, setSelectedOffer] =
    useState<Offer | null>(null);

  /*
   * ==========================================
   * LOAD ACTIVE OFFERS
   * ==========================================
   */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!user) {
            router.replace("/student/login");
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

            /*
             * ==================================
             * LOAD BUSINESSES
             * ==================================
             *
             * We load all businesses once and
             * match businessId with offer.
             *
             * This avoids one Firestore read
             * for every individual offer.
             */

            const businessSnap =
              await getDocs(
                collection(
                  db,
                  "businesses"
                )
              );

            const businessMap =
              new Map<
                string,
                string
              >();

            businessSnap.docs.forEach(
              (businessDoc) => {
                const data =
                  businessDoc.data();

                const mobile =
                  data.mobile ||
                  data.businessMobile ||
                  data.phone ||
                  data.ownerMobile ||
                  "";

                businessMap.set(
                  businessDoc.id,
                  String(mobile)
                );
              }
            );

            /*
             * ==================================
             * COMBINE OFFER + BUSINESS MOBILE
             * ==================================
             */

            const data: Offer[] =
              snap.docs.map(
                (offerDoc) => {
                  const offerData =
                    offerDoc.data();

                  const businessId =
                    offerData.businessId ||
                    "";

                  const mobileFromBusiness =
                    businessMap.get(
                      businessId
                    ) || "";

                  return {
                    id: offerDoc.id,

                    title:
                      offerData.title ||
                      "",

                    discount:
                      offerData.discount ||
                      "",

                    description:
                      offerData.description ||
                      "",

                    image:
                      offerData.image ||
                      "",

                    category:
                      offerData.category ||
                      "Other",

                    status:
                      offerData.status ||
                      "active",

                    businessId,

                    businessName:
                      offerData.businessName ||
                      "SPC Partner Business",

                    /*
                     * First preference:
                     * mobile saved inside offer.
                     *
                     * Fallback:
                     * mobile from businesses.
                     */

                    businessMobile:
                      offerData.businessMobile ||
                      offerData.businessPhone ||
                      mobileFromBusiness ||
                      "",
                  };
                }
              );

            setOffers(data);
            setFilteredOffers(data);
          } catch (error) {
            console.error(
              "Offers loading error:",
              error
            );

            alert(
              "Unable to load offers."
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
   * ==========================================
   * FILTER OFFERS
   * ==========================================
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
      const searchText =
        search
          .trim()
          .toLowerCase();

      list = list.filter(
        (offer) =>
          offer.title
            ?.toLowerCase()
            .includes(searchText) ||

          offer.businessName
            ?.toLowerCase()
            .includes(searchText) ||

          offer.category
            ?.toLowerCase()
            .includes(searchText)
      );
    }

    setFilteredOffers(list);
  }, [
    offers,
    search,
    category,
  ]);

  /*
   * ==========================================
   * CALL BUSINESS
   * ==========================================
   */

  const callBusiness = (
    mobile?: string
  ) => {
    if (!mobile) {
      alert(
        "❌ Business phone number is not available."
      );

      return;
    }

    /*
     * Keep only numbers and +
     */

    const cleanNumber =
      mobile.replace(
        /[^\d+]/g,
        ""
      );

    if (!cleanNumber) {
      alert(
        "❌ Invalid business phone number."
      );

      return;
    }

    window.location.href =
      `tel:${cleanNumber}`;
  };

  /*
   * ==========================================
   * LOADING
   * ==========================================
   */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">

        <h1 className="text-3xl font-bold text-green-600">
          Loading Offers...
        </h1>

      </div>
    );
  }

  /*
   * ==========================================
   * PAGE
   * ==========================================
   */

  return (
    <main className="min-h-screen bg-white py-10">

      <div className="mx-auto max-w-7xl px-6">

        {/* ==================================
            HEADER
        =================================== */}

        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div>

            <h1 className="text-5xl font-extrabold text-green-600">
              🎁 Student Offers
            </h1>

            <p className="mt-2 text-lg text-gray-500">
              Exclusive Discounts for SPC Students
            </p>

          </div>

          <button
            onClick={() =>
              router.push(
                "/student/dashboard"
              )
            }
            className="rounded-2xl bg-green-600 px-8 py-4 font-bold text-white transition-all hover:bg-green-700"
          >
            🏠 Dashboard
          </button>

        </div>

        {/* ==================================
            SEARCH + CATEGORY
        =================================== */}

        <div className="mb-10 grid gap-6 md:grid-cols-2">

          <input
            type="text"
            placeholder="🔍 Search Offers..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="rounded-2xl border border-gray-300 bg-white p-4 outline-none focus:border-green-600"
          />

          <select
            value={category}
            onChange={(e) =>
              setCategory(
                e.target.value
              )
            }
            className="rounded-2xl border border-gray-300 bg-white p-4 outline-none focus:border-green-600"
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

        {/* ==================================
            NO OFFERS
        =================================== */}

        {filteredOffers.length === 0 ? (

          <div className="rounded-3xl bg-white p-16 text-center shadow-xl">

            <h2 className="text-4xl font-bold text-green-600">
              No Offers Found
            </h2>

            <p className="mt-3 text-gray-500">
              No active offers available.
            </p>

          </div>

        ) : (

          /* ==================================
             OFFER GRID
          =================================== */

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

            {filteredOffers.map(
              (offer) => (

                <div
                  key={offer.id}
                  className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:border-yellow-400 hover:shadow-[0_20px_50px_rgba(234,179,8,0.45)]"
                >

                  {/* ==================================
                      OFFER IMAGE
                  =================================== */}

                  <div className="overflow-hidden">

                    {offer.image ? (

                      <img
                        src={
                          offer.image
                        }
                        alt={
                          offer.title
                        }
                        className="h-64 w-full object-cover transition duration-700 group-hover:scale-110"
                      />

                    ) : (

                      <div className="flex h-64 w-full items-center justify-center bg-slate-200">

                        <span className="text-5xl">
                          🎁
                        </span>

                      </div>

                    )}

                  </div>

                  {/* ==================================
                      CONTENT
                  =================================== */}

                  <div className="rounded-b-3xl bg-slate-100 p-6">

                    {/* Category + Exclusive */}

                    <div className="mb-4 flex flex-wrap gap-3">

                      <span className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-bold text-white shadow">

                        {offer.category ||
                          "Other"}

                      </span>

                      <span className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-sm font-bold text-black shadow">

                        🔥 SPC Exclusive

                      </span>

                    </div>

                    {/* Business */}

                    <p className="text-sm font-semibold text-slate-500">

                      🏢{" "}
                      {offer.businessName ||
                        "SPC Partner Business"}

                    </p>

                    {/* Title */}

                    <h2 className="mt-2 text-3xl font-bold text-green-600">

                      {offer.title}

                    </h2>

                    {/* Discount */}

                    <h3 className="mt-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-4xl font-extrabold text-transparent">

                      {offer.discount}

                    </h3>

                    {/* Description */}

                    <p className="mt-4 line-clamp-2 text-gray-600">

                      {offer.description ||
                        "Exclusive SPC student offer."}

                    </p>

                    {/* ==================================
                        BUTTONS
                    =================================== */}

                    <div className="mt-8 flex gap-3">

                      {/* VIEW DETAILS */}

                      <button
                        onClick={() =>
                          setSelectedOffer(
                            offer
                          )
                        }
                        className="flex-1 rounded-xl bg-green-600 py-4 font-bold text-white transition hover:bg-green-700"
                      >
                        👁 View Details
                      </button>

                      {/* CALL US */}

                      <button
                        onClick={() =>
                          callBusiness(
                            offer.businessMobile
                          )
                        }
                        disabled={
                          !offer.businessMobile
                        }
                        className={`flex-1 rounded-xl py-4 font-bold text-white transition ${
                          offer.businessMobile
                            ? "bg-green-600 hover:bg-green-700"
                            : "cursor-not-allowed bg-gray-400"
                        }`}
                      >
                        📞 Call Us
                      </button>

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        )}

        {/* ==================================
            PREMIUM OFFER POPUP
        =================================== */}

        {selectedOffer && (

          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() =>
              setSelectedOffer(
                null
              )
            }
          >

            <div
              onClick={(e) =>
                e.stopPropagation()
              }
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            >

              {/* Image */}

              {selectedOffer.image ? (

                <img
                  src={
                    selectedOffer.image
                  }
                  alt={
                    selectedOffer.title
                  }
                  className="h-80 w-full object-cover"
                />

              ) : (

                <div className="flex h-80 w-full items-center justify-center bg-slate-200">

                  <span className="text-6xl">
                    🎁
                  </span>

                </div>

              )}

              {/* Details */}

              <div className="bg-slate-100 p-8">

                {/* Category */}

                <div className="mb-5 flex flex-wrap gap-3">

                  <span className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-bold text-white">

                    {selectedOffer.category ||
                      "Other"}

                  </span>

                  <span className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-sm font-bold text-black">

                    🔥 SPC Exclusive

                  </span>

                </div>

                {/* Business */}

                <p className="text-lg font-semibold text-slate-500">

                  🏢{" "}
                  {selectedOffer.businessName ||
                    "SPC Partner Business"}

                </p>

                {/* Title */}

                <h1 className="mt-2 text-4xl font-extrabold text-green-600">

                  {selectedOffer.title}

                </h1>

                {/* Discount */}

                <h2 className="mt-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-5xl font-extrabold text-transparent">

                  {selectedOffer.discount}

                </h2>

                {/* Description */}

                <div className="mt-8 rounded-2xl bg-white p-6 shadow">

                  <h3 className="mb-3 text-2xl font-bold text-green-600">

                    Offer Description

                  </h3>

                  <p className="leading-8 text-gray-700">

                    {selectedOffer.description ||
                      "Exclusive SPC student offer."}

                  </p>

                </div>

                {/* Business Phone */}

                <div className="mt-6 rounded-2xl bg-white p-6 shadow">

                  <p className="text-sm font-semibold text-gray-500">
                    📞 Business Contact
                  </p>

                  <p className="mt-2 text-xl font-bold text-gray-800">

                    {selectedOffer.businessMobile ||
                      "Phone number not available"}

                  </p>

                </div>

                {/* ==================================
                    MODAL BUTTONS
                =================================== */}

                <div className="mt-8 flex gap-4">

                  {/* CALL */}

                  <button
                    onClick={() =>
                      callBusiness(
                        selectedOffer.businessMobile
                      )
                    }
                    disabled={
                      !selectedOffer.businessMobile
                    }
                    className={`flex-1 rounded-xl py-4 text-lg font-bold text-white transition ${
                      selectedOffer.businessMobile
                        ? "bg-green-600 hover:bg-green-700"
                        : "cursor-not-allowed bg-gray-400"
                    }`}
                  >
                    📞 Call Business
                  </button>

                  {/* CLOSE */}

                  <button
                    onClick={() =>
                      setSelectedOffer(
                        null
                      )
                    }
                    className="flex-1 rounded-xl bg-gray-700 py-4 text-lg font-bold text-white transition hover:bg-gray-800"
                  >
                    ✖ Close
                  </button>

                </div>

              </div>

            </div>

          </div>

        )}

        {/* ==================================
            TOTAL ACTIVE OFFERS
        =================================== */}

        <div className="mt-12 rounded-3xl border border-gray-200 bg-slate-100 p-8 shadow-xl">

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div>

              <h2 className="text-3xl font-bold text-green-600">

                🎉 Total Active Offers

              </h2>

              <p className="mt-2 text-gray-600">

                Discover amazing discounts from SPC Partner Businesses.

              </p>

            </div>

            <div className="rounded-3xl bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 px-10 py-6 shadow-lg">

              <span className="block text-center text-5xl font-extrabold text-white">

                {filteredOffers.length}

              </span>

              <p className="mt-1 text-center text-sm font-bold uppercase tracking-wide text-white">

                Active Offers

              </p>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}