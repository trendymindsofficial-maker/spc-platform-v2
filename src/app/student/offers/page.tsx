"use client";

import { useEffect, useMemo, useState } from "react";
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

  title?: string;
  discount?: string;
  description?: string;

  category?: string;
  image?: string;

  businessId?: string;
  businessName?: string;
  businessMobile?: string;
  businessAddress?: string;

  status?: string;
}

interface Category {
  id: string;
  name: string;
  status?: string;
}

export default function StudentOffers() {
  const router = useRouter();

  const [offers, setOffers] =
    useState<Offer[]>([]);

  const [categories, setCategories] =
    useState<string[]>([]);

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
   * AUTH + LOAD DATA
   * ==========================================
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
            await Promise.all([
              loadOffers(),
              loadCategories(),
            ]);
          } finally {
            setLoading(false);
          }
        }
      );

    return () => unsubscribe();
  }, [router]);

  /*
   * ==========================================
   * LOAD ACTIVE OFFERS
   * ==========================================
   */

  const loadOffers = async () => {
    try {
      /*
       * Only ACTIVE offers should be visible
       * to students.
       */

      const offerQuery = query(
        collection(db, "offers"),
        where(
          "status",
          "==",
          "active"
        )
      );

      const offerSnap =
        await getDocs(offerQuery);

      /*
       * Load businesses
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

          businessMap.set(
            businessDoc.id,
            {
              name:
                data.businessName ||
                "",

              mobile:
                data.mobile ||
                data.phone ||
                data.businessMobile ||
                data.ownerMobile ||
                "",

              address:
                data.address ||
                data.businessAddress ||
                data.location ||
                data.fullAddress ||
                "",
            }
          );
        }
      );

      const data: Offer[] =
        offerSnap.docs.map(
          (item) => {
            const offerData =
              item.data();

            const businessId =
              offerData.businessId ||
              "";

            const business =
              businessMap.get(
                businessId
              );

            return {
              id: item.id,

              title:
                offerData.title ||
                "",

              discount:
                offerData.discount ||
                "",

              description:
                offerData.description ||
                "",

              category:
                offerData.category ||
                "Other",

              image:
                offerData.image ||
                offerData.imageUrl ||
                "",

              businessId,

              businessName:
                offerData.businessName ||
                business?.name ||
                "SPC Partner Business",

              businessMobile:
                offerData.businessMobile ||
                business?.mobile ||
                "",

              businessAddress:
                offerData.businessAddress ||
                offerData.address ||
                business?.address ||
                "",

              status:
                offerData.status ||
                "active",
            };
          }
        );

      setOffers(data);
    } catch (error) {
      console.error(
        "Offer loading error:",
        error
      );
    }
  };

  /*
   * ==========================================
   * LOAD CATEGORIES
   * ==========================================
   */

  const loadCategories = async () => {
    try {
      const snap =
        await getDocs(
          collection(
            db,
            "categories"
          )
        );

      const data =
        snap.docs
          .map(
            (item) =>
              item.data()
          )
          .filter(
            (item: any) =>
              item.status !==
              "inactive"
          )
          .map(
            (item: any) =>
              item.name
          )
          .filter(Boolean);

      setCategories(
        Array.from(
          new Set(data)
        ) as string[]
      );
    } catch (error) {
      console.error(
        "Category loading error:",
        error
      );
    }
  };

  /*
   * ==========================================
   * FILTER OFFERS
   * ==========================================
   */

  const filteredOffers =
    useMemo(() => {
      let list =
        [...offers];

      /*
       * CATEGORY
       */

      if (
        category !==
        "All"
      ) {
        list =
          list.filter(
            (offer) =>
              offer.category ===
              category
          );
      }

      /*
       * SEARCH
       */

      const searchText =
        search
          .trim()
          .toLowerCase();

      if (searchText) {
        list =
          list.filter(
            (offer) =>
              offer.title
                ?.toLowerCase()
                .includes(
                  searchText
                ) ||

              offer.businessName
                ?.toLowerCase()
                .includes(
                  searchText
                ) ||

              offer.category
                ?.toLowerCase()
                .includes(
                  searchText
                )
          );
      }

      return list;
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

  const callBusiness =
    (offer: Offer) => {
      const phone =
        offer.businessMobile ||
        "";

      if (!phone) {
        alert(
          "📞 Business phone number is not available."
        );
        return;
      }

      window.location.href =
        `tel:${phone}`;
    };

  /*
   * ==========================================
   * PAGE
   * ==========================================
   */

  return (
    <main className="min-h-screen bg-white py-8">

      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* =====================================
            HEADER
        ====================================== */}

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h1 className="text-4xl font-extrabold text-green-600">
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
            className="rounded-2xl bg-green-600 px-7 py-4 font-bold text-white hover:bg-green-700"
          >
            🏠 Dashboard
          </button>

        </div>

        {/* =====================================
            FILTERS
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
            className="w-full rounded-2xl border border-gray-300 p-4 outline-none focus:border-green-600"
          />

          <select
            value={category}
            onChange={(e) =>
              setCategory(
                e.target.value
              )
            }
            className="w-full rounded-2xl border border-gray-300 p-4 outline-none focus:border-green-600"
          >

            <option value="All">
              All Categories
            </option>

            {categories.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}

          </select>

        </div>

        {/* =====================================
            LOADING
        ====================================== */}

        {loading ? (

          <div className="rounded-3xl bg-white p-12 text-center shadow-xl">

            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />

            <h2 className="text-2xl font-bold">
              Loading Offers...
            </h2>

          </div>

        ) : filteredOffers.length === 0 ? (

          <div className="rounded-3xl bg-white p-16 text-center shadow-xl">

            <div className="text-6xl">
              🎁
            </div>

            <h2 className="mt-4 text-3xl font-bold text-green-600">
              No Offers Found
            </h2>

            <p className="mt-3 text-gray-500">
              No active offers available.
            </p>

          </div>

        ) : (

          /* =================================
             OFFER GRID
          ================================== */

          <div className="grid items-stretch gap-8 md:grid-cols-2 lg:grid-cols-3">

            {filteredOffers.map(
              (offer) => (

                <div
                  key={offer.id}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg transition hover:-translate-y-1 hover:border-yellow-400 hover:shadow-2xl"
                >

                  {/* IMAGE */}

                  <div className="h-64 overflow-hidden bg-gray-100">

                    {offer.image ? (

                      <img
                        src={offer.image}
                        alt={
                          offer.title ||
                          "Offer"
                        }
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />

                    ) : (

                      <div className="flex h-full items-center justify-center text-6xl">
                        🎁
                      </div>

                    )}

                  </div>

                  {/* CONTENT */}

                  <div className="flex flex-1 flex-col bg-slate-100 p-6">

                    <div className="flex flex-wrap gap-3">

                      <span className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white">
                        {offer.category ||
                          "Other"}
                      </span>

                      <span className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-bold text-black">
                        🔥 SPC Exclusive
                      </span>

                    </div>

                    {/* BUSINESS */}

                    <p className="mt-4 text-sm font-bold text-slate-500">
                      🏢{" "}
                      {offer.businessName ||
                        "SPC Partner Business"}
                    </p>

                    {/* ADDRESS */}

                    <div className="mt-2 min-h-[40px]">

                      {offer.businessAddress ? (

                        <p className="flex items-start gap-1 text-sm text-slate-500">

                          <span>
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

                    {/* TITLE */}

                    <h2 className="mt-3 min-h-[56px] text-2xl font-bold text-green-600">
                      {offer.title}
                    </h2>

                    {/* DISCOUNT */}

                    <h3 className="mt-3 min-h-[45px] text-4xl font-extrabold text-yellow-500">
                      {offer.discount}
                    </h3>

                    {/* DESCRIPTION */}

                    <p className="mt-3 line-clamp-2 min-h-[48px] text-gray-600">
                      {offer.description}
                    </p>

                    {/* BUTTONS */}

                    <div className="mt-auto grid grid-cols-2 gap-3 pt-8">

                      <button
                        onClick={() =>
                          setSelectedOffer(
                            offer
                          )
                        }
                        className="rounded-xl bg-green-600 py-4 text-sm font-bold text-white hover:bg-green-700"
                      >
                        👁 View Details
                      </button>

                      <button
                        onClick={() =>
                          callBusiness(
                            offer
                          )
                        }
                        className="rounded-xl bg-green-600 py-4 text-sm font-bold text-white hover:bg-green-700"
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

        {/* =====================================
            TOTAL
        ====================================== */}

        {!loading && (
          <div className="mt-12 rounded-3xl bg-slate-100 p-8 shadow-xl">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h2 className="text-3xl font-bold text-green-600">
                  🎉 Total Active Offers
                </h2>

                <p className="mt-2 text-gray-600">
                  Discover amazing discounts from SPC Partner Businesses.
                </p>

              </div>

              <div className="rounded-3xl bg-yellow-400 px-10 py-6">

                <span className="block text-center text-5xl font-extrabold text-white">
                  {filteredOffers.length}
                </span>

                <p className="text-center text-sm font-bold uppercase text-white">
                  Offers
                </p>

              </div>

            </div>

          </div>
        )}

      </div>

      {/* =====================================
          OFFER MODAL
      ====================================== */}

      {selectedOffer && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-5"
          onClick={() =>
            setSelectedOffer(null)
          }
        >

          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          >

            {/* CLOSE */}

            <button
              onClick={() =>
                setSelectedOffer(null)
              }
              className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl font-bold shadow-lg"
            >
              ✕
            </button>

            <div className="min-h-0 flex-1 overflow-y-auto">

              {/* MOBILE IMAGE */}

              <div className="bg-gray-100 md:hidden">

                {selectedOffer.image ? (

                  <img
                    src={
                      selectedOffer.image
                    }
                    alt={
                      selectedOffer.title
                    }
                    className="block max-h-[42vh] w-full object-contain"
                  />

                ) : (

                  <div className="flex h-56 items-center justify-center text-6xl">
                    🎁
                  </div>

                )}

              </div>

              {/* DESKTOP */}

              <div className="hidden md:grid md:grid-cols-2">

                <div className="flex min-h-[500px] items-center justify-center bg-gray-100">

                  {selectedOffer.image ? (

                    <img
                      src={
                        selectedOffer.image
                      }
                      alt={
                        selectedOffer.title
                      }
                      className="max-h-[620px] w-full object-contain"
                    />

                  ) : (

                    <span className="text-7xl">
                      🎁
                    </span>

                  )}

                </div>

                <OfferDetails
                  offer={
                    selectedOffer
                  }
                  callBusiness={
                    callBusiness
                  }
                />

              </div>

              {/* MOBILE */}

              <div className="md:hidden">

                <OfferDetails
                  offer={
                    selectedOffer
                  }
                  callBusiness={
                    callBusiness
                  }
                />

              </div>

            </div>

            {/* CLOSE BUTTON */}

            <div className="border-t bg-white p-4">

              <button
                onClick={() =>
                  setSelectedOffer(null)
                }
                className="w-full rounded-xl bg-gray-700 py-3 font-bold text-white hover:bg-gray-800"
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

/*
 * ============================================================
 * OFFER DETAILS
 * ============================================================
 */

function OfferDetails({
  offer,
  callBusiness,
}: {
  offer: Offer;

  callBusiness: (
    offer: Offer
  ) => void;
}) {
  return (
    <div className="p-5 sm:p-7">

      {/* BADGES */}

      <div className="flex flex-wrap gap-2">

        <span className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white">
          {offer.category ||
            "Other"}
        </span>

        <span className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-bold text-black">
          🔥 SPC Exclusive
        </span>

      </div>

      {/* BUSINESS */}

      <h2 className="mt-4 text-2xl font-bold text-slate-700 sm:text-3xl">
        🏢{" "}
        {offer.businessName ||
          "SPC Partner Business"}
      </h2>

      {/* ADDRESS */}

      {offer.businessAddress && (

        <p className="mt-2 flex items-start gap-2 text-sm text-gray-500">

          <span>
            📍
          </span>

          <span>
            {offer.businessAddress}
          </span>

        </p>

      )}

      <div className="my-5 border-t" />

      {/* TITLE */}

      <h1 className="text-3xl font-extrabold text-green-600">
        {offer.title}
      </h1>

      {/* DISCOUNT */}

      <h2 className="mt-3 text-4xl font-extrabold text-yellow-500">
        {offer.discount}
      </h2>

      {/* DESCRIPTION */}

      <div className="mt-5 rounded-2xl bg-slate-50 p-5">

        <h3 className="text-xl font-bold text-green-600">
          Offer Description
        </h3>

        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
          {offer.description ||
            "Exclusive offer for SPC students."}
        </p>

      </div>

      {/* TERMS */}

      <div className="mt-5 rounded-2xl bg-slate-50 p-5">

        <h3 className="text-xl font-bold text-green-600">
          Terms & Conditions
        </h3>

        <div className="mt-3 space-y-2 text-sm leading-6 text-gray-700">

          <p>
            • Offer valid for SPC students
          </p>

          <p>
            • Valid Student ID must be shown
          </p>

          <p>
            • Offer cannot be combined with other offers
          </p>

        </div>

      </div>

      {/* CONTACT */}

      <div className="mt-5 rounded-2xl bg-green-50 p-5">

        <h3 className="text-xl font-bold text-green-700">
          Contact Business
        </h3>

        {offer.businessMobile && (

          <p className="mt-2 font-bold text-green-700">
            📞{" "}
            {offer.businessMobile}
          </p>

        )}

        <button
          onClick={() =>
            callBusiness(
              offer
            )
          }
          className="mt-4 w-full rounded-xl bg-green-600 py-4 text-lg font-bold text-white hover:bg-green-700"
        >
          📞 Call Business
        </button>

      </div>

    </div>
  );
}