"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "@/lib/firebase";

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
  description: string;
  image?: string;
  category?: string;
  status?: string;
  businessId?: string;
  businessName?: string;
  businessMobile?: string;
  businessAddress?: string;
}

export default function StudentOffers() {
  const router = useRouter();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [selectedOffer, setSelectedOffer] =
    useState<Offer | null>(null);

  /*
   * ==========================================
   * LOAD OFFERS
   * ==========================================
   */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          router.replace("/student/login");
          return;
        }

        try {
          setLoading(true);

          /*
           * ACTIVE OFFERS
           */

          const offerQuery = query(
            collection(db, "offers"),
            where("status", "==", "active")
          );

          const offerSnap =
            await getDocs(offerQuery);

          /*
           * BUSINESSES
           */

          const businessSnap =
            await getDocs(
              collection(db, "businesses")
            );

          const businessMap = new Map<
            string,
            {
              name: string;
              mobile: string;
              address: string;
            }
          >();

          businessSnap.docs.forEach(
            (businessDoc) => {
              const data =
                businessDoc.data();

              const name =
                data.businessName ||
                data.name ||
                "";

              const mobile =
                data.mobile ||
                data.phone ||
                data.ownerMobile ||
                data.businessMobile ||
                data.contactNumber ||
                "";

              const address =
                data.address ||
                data.businessAddress ||
                data.location ||
                data.businessLocation ||
                data.fullAddress ||
                "";

              businessMap.set(
                businessDoc.id,
                {
                  name: String(name),
                  mobile: String(mobile),
                  address: String(address),
                }
              );
            }
          );

          /*
           * MERGE OFFER + BUSINESS
           */

          const data: Offer[] =
            offerSnap.docs.map(
              (offerDoc) => {
                const offerData =
                  offerDoc.data();

                const businessId =
                  offerData.businessId || "";

                const business =
                  businessMap.get(
                    businessId
                  );

                const businessName =
                  offerData.businessName ||
                  business?.name ||
                  "SPC Partner Business";

                const businessMobile =
                  offerData.businessMobile ||
                  offerData.businessPhone ||
                  business?.mobile ||
                  "";

                const businessAddress =
                  offerData.businessAddress ||
                  offerData.address ||
                  business?.address ||
                  "";

                return {
                  id: offerDoc.id,

                  title:
                    offerData.title || "",

                  discount:
                    offerData.discount || "",

                  description:
                    offerData.description || "",

                  image:
                    offerData.image || "",

                  category:
                    offerData.category ||
                    "Other",

                  status:
                    offerData.status ||
                    "active",

                  businessId,

                  businessName:
                    String(businessName),

                  businessMobile:
                    String(businessMobile),

                  businessAddress:
                    String(businessAddress),
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

    return () => unsubscribe();
  }, [router]);

  /*
   * ==========================================
   * SEARCH + CATEGORY FILTER
   * ==========================================
   */

  useEffect(() => {
    let list = [...offers];

    if (category !== "All") {
      list = list.filter(
        (offer) =>
          offer.category === category
      );
    }

    const searchText =
      search.trim().toLowerCase();

    if (searchText) {
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
        "📞 Business phone number is not available."
      );
      return;
    }

    const cleanNumber =
      mobile.replace(/[^\d+]/g, "");

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
      <main className="flex min-h-screen items-center justify-center bg-white">

        <div className="text-center">

          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />

          <h1 className="text-2xl font-bold text-green-600">
            Loading Offers...
          </h1>

        </div>

      </main>
    );
  }

  /*
   * ==========================================
   * PAGE
   * ==========================================
   */

  return (
    <main className="min-h-screen bg-white py-8 sm:py-10">

      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h1 className="text-4xl font-extrabold text-green-600 sm:text-5xl">
              🎁 Student Offers
            </h1>

            <p className="mt-2 text-gray-500">
              Exclusive Discounts for SPC Students
            </p>

          </div>

          <button
            onClick={() =>
              router.push(
                "/student/dashboard"
              )
            }
            className="w-full rounded-2xl bg-green-600 px-7 py-4 font-bold text-white shadow transition hover:bg-green-700 sm:w-auto"
          >
            🏠 Dashboard
          </button>

        </div>

        {/* SEARCH */}

        <div className="mb-10 grid gap-5 md:grid-cols-2">

          <input
            type="text"
            placeholder="🔍 Search Offers..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full rounded-2xl border border-gray-300 bg-white p-4 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />

          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value)
            }
            className="w-full rounded-2xl border border-gray-300 bg-white p-4 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
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

        {/* NO OFFERS */}

        {filteredOffers.length === 0 ? (

          <div className="rounded-3xl bg-white p-16 text-center shadow-xl">

            <div className="text-6xl">
              😔
            </div>

            <h2 className="mt-5 text-3xl font-bold text-green-600">
              No Offers Found
            </h2>

            <p className="mt-3 text-gray-500">
              No active offers available.
            </p>

          </div>

        ) : (

          /* OFFER GRID */

          <div className="grid items-stretch gap-8 md:grid-cols-2 lg:grid-cols-3">

            {filteredOffers.map(
              (offer) => (

                <div
                  key={offer.id}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg transition duration-500 hover:-translate-y-2 hover:border-yellow-400 hover:shadow-[0_20px_50px_rgba(234,179,8,0.4)]"
                >

                  {/* IMAGE */}

                  <div className="h-64 shrink-0 overflow-hidden bg-gray-100">

                    {offer.image ? (

                      <img
                        src={offer.image}
                        alt={
                          offer.title ||
                          "SPC Offer"
                        }
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                      />

                    ) : (

                      <div className="flex h-full items-center justify-center bg-slate-100">

                        <span className="text-6xl">
                          🎁
                        </span>

                      </div>

                    )}

                  </div>

                  {/* CARD CONTENT */}

                  <div className="flex flex-1 flex-col bg-slate-100 p-6">

                    {/* CATEGORY */}

                    <div className="mb-4 flex flex-wrap gap-3">

                      <span className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-bold text-white">
                        {offer.category ||
                          "Other"}
                      </span>

                      <span className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-sm font-bold text-black">
                        🔥 SPC Exclusive
                      </span>

                    </div>

                    {/* BUSINESS */}

                    <p className="text-sm font-bold text-slate-500">
                      🏢{" "}
                      {offer.businessName ||
                        "SPC Partner Business"}
                    </p>

                    {/* ADDRESS */}

                    <div className="mt-2 min-h-[40px]">

                      {offer.businessAddress ? (

                        <p className="flex items-start gap-1 text-sm font-medium leading-5 text-slate-500">

                          <span className="shrink-0">
                            📍
                          </span>

                          <span className="line-clamp-2">
                            {
                              offer.businessAddress
                            }
                          </span>

                        </p>

                      ) : (

                        <p className="text-sm text-slate-400">
                          📍 Address not available
                        </p>

                      )}

                    </div>

                    <div className="my-3 border-t border-gray-300" />

                    {/* TITLE */}

                    <h2 className="min-h-[56px] text-2xl font-bold leading-7 text-green-600">
                      {offer.title}
                    </h2>

                    {/* DISCOUNT */}

                    <h3 className="mt-3 min-h-[48px] bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-4xl font-extrabold text-transparent">
                      {offer.discount}
                    </h3>

                    {/* DESCRIPTION */}

                    <p className="mt-3 min-h-[48px] line-clamp-2 text-gray-600">
                      {offer.description ||
                        "Exclusive offer for SPC students."}
                    </p>

                    {/* BUTTONS */}

                    <div className="mt-auto flex gap-3 pt-8">

                      <button
                        onClick={() =>
                          setSelectedOffer(
                            offer
                          )
                        }
                        className="flex-1 rounded-xl bg-green-600 px-3 py-4 text-sm font-bold text-white transition hover:bg-green-700 sm:text-base"
                      >
                        👁 View Details
                      </button>

                      <button
                        onClick={() =>
                          callBusiness(
                            offer.businessMobile
                          )
                        }
                        className="flex-1 rounded-xl bg-green-600 px-3 py-4 text-sm font-bold text-white transition hover:bg-green-700 sm:text-base"
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

        {/* TOTAL */}

        <div className="mt-12 rounded-3xl border border-gray-200 bg-slate-100 p-6 shadow-xl sm:p-8">

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-2xl font-bold text-green-600 sm:text-3xl">
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

      {/* ==========================================
          OFFER DETAILS MODAL
      ========================================== */}

      {selectedOffer && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5"
          onClick={() =>
            setSelectedOffer(null)
          }
        >

          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          >

            {/* CLOSE BUTTON */}

            <button
              onClick={() =>
                setSelectedOffer(null)
              }
              className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl font-bold text-gray-700 shadow-lg hover:bg-gray-100"
              aria-label="Close"
            >
              ×
            </button>

            {/* ==================================
                TOP SECTION
            =================================== */}

            <div className="grid max-h-[calc(100vh-110px)] overflow-y-auto lg:grid-cols-2 lg:overflow-hidden">

              {/* IMAGE */}

              <div className="h-64 bg-gray-100 sm:h-72 lg:h-full lg:min-h-[520px]">

                {selectedOffer.image ? (

                  <img
                    src={
                      selectedOffer.image
                    }
                    alt={
                      selectedOffer.title
                    }
                    className="h-full w-full object-cover"
                  />

                ) : (

                  <div className="flex h-full items-center justify-center bg-slate-100">

                    <span className="text-7xl">
                      🎁
                    </span>

                  </div>

                )}

              </div>

              {/* RIGHT INFO */}

              <div className="flex flex-col bg-slate-50 p-6 sm:p-8 lg:justify-center">

                {/* BADGES */}

                <div className="flex flex-wrap gap-3">

                  <span className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-bold text-white">
                    {selectedOffer.category ||
                      "Other"}
                  </span>

                  <span className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-sm font-bold text-black">
                    🔥 SPC Exclusive
                  </span>

                </div>

                {/* BUSINESS NAME */}

                <h2 className="mt-5 text-2xl font-extrabold text-slate-700 sm:text-3xl">
                  🏢{" "}
                  {selectedOffer.businessName ||
                    "SPC Partner Business"}
                </h2>

                {/* ADDRESS */}

                {selectedOffer.businessAddress && (

                  <p className="mt-3 flex items-start gap-2 text-sm font-medium leading-6 text-slate-500 sm:text-base">

                    <span className="shrink-0">
                      📍
                    </span>

                    <span>
                      {
                        selectedOffer.businessAddress
                      }
                    </span>

                  </p>

                )}

                <div className="my-5 border-t border-gray-300" />

                {/* OFFER TITLE */}

                <h1 className="text-3xl font-extrabold leading-tight text-green-600 sm:text-4xl">
                  {selectedOffer.title}
                </h1>

                {/* DISCOUNT */}

                <h2 className="mt-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-4xl font-extrabold text-transparent sm:text-5xl">
                  {selectedOffer.discount}
                </h2>

                {/* DESCRIPTION */}

                <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">

                  <h3 className="text-xl font-bold text-green-600">
                    Offer Description
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-700 sm:text-base">
                    {selectedOffer.description ||
                      "Exclusive offer for SPC students."}
                  </p>

                </div>

              </div>

            </div>

            {/* ==================================
                BOTTOM SECTION
            =================================== */}

            <div className="grid gap-5 bg-white p-5 sm:p-6 lg:grid-cols-2">

              {/* TERMS */}

              <div className="rounded-2xl bg-slate-50 p-5">

                <h3 className="text-xl font-bold text-green-600">
                  Terms & Conditions
                </h3>

                <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">

                  <li>
                    • Offer valid for all SPC students
                  </li>

                  <li>
                    • Valid Student ID must be shown
                  </li>

                  <li>
                    • Offer cannot be combined with other offers
                  </li>

                </ul>

              </div>

              {/* CONTACT */}

              <div className="rounded-2xl bg-green-50 p-5">

                <h3 className="text-xl font-bold text-green-700">
                  Contact Business
                </h3>

                {selectedOffer.businessMobile ? (

                  <p className="mt-3 text-lg font-bold text-green-700">
                    📞{" "}
                    {selectedOffer.businessMobile}
                  </p>

                ) : (

                  <p className="mt-3 text-sm text-gray-500">
                    Business phone number unavailable
                  </p>

                )}

                <button
                  onClick={() =>
                    callBusiness(
                      selectedOffer.businessMobile
                    )
                  }
                  disabled={
                    !selectedOffer.businessMobile
                  }
                  className="mt-4 w-full rounded-xl bg-green-600 py-3 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  📞 Call Business
                </button>

              </div>

            </div>

            {/* ==================================
                CLOSE
            =================================== */}

            <div className="border-t bg-white p-4 sm:p-5">

              <button
                onClick={() =>
                  setSelectedOffer(null)
                }
                className="w-full rounded-xl bg-gray-700 py-3 font-bold text-white transition hover:bg-gray-800"
              >
                ✕ Close
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}