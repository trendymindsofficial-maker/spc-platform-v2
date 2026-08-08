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

  const [offers, setOffers] = useState<any[]>([]);
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

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {

          if (!user) {

            router.replace("/student/login");

            return;

          }

          const q = query(
            collection(db, "offers"),
            where("status", "==", "active")
          );

          const snap =
            await getDocs(q);

          const data =
            snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

          setOffers(data);

          setFilteredOffers(data);

          setLoading(false);

        }
      );

    return () => unsubscribe();

  }, [router]);

  useEffect(() => {

    let list = offers;

    if (category !== "All") {

      list = list.filter(
        (offer) =>
          offer.category === category
      );

    }

    if (search) {

      list = list.filter(
        (offer) =>
          offer.title
            .toLowerCase()
            .includes(
              search.toLowerCase()
            )
      );

    }

    setFilteredOffers(list);

  }, [
    offers,
    search,
    category,
  ]);

  if (loading) {

    return (

      <div className="flex min-h-screen items-center justify-center bg-white">

        <h1 className="text-3xl font-bold text-green-600">

          Loading Offers...

        </h1>

      </div>

    );

  }

  return (

    <main className="min-h-screen bg-white py-10">

      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-10 flex items-center justify-between">

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
              router.push("/student/dashboard")
            }
            className="rounded-2xl bg-green-600 px-8 py-4 font-bold text-white transition-all hover:bg-green-700"
          >
            🏠 Dashboard
          </button>

        </div>

        <div className="mb-10 grid gap-6 md:grid-cols-2">

          <input
            placeholder="🔍 Search Offers..."
            value={search}
            onChange={(e)=>
              setSearch(e.target.value)
            }
            className="rounded-2xl border border-gray-300 bg-white p-4 outline-none focus:border-green-600"
          />

          <select
            value={category}
            onChange={(e)=>
              setCategory(e.target.value)
            }
            className="rounded-2xl border border-gray-300 bg-white p-4 outline-none focus:border-green-600"
          >

            <option>All</option>
            <option>Restaurant</option>
            <option>Hospital</option>
            <option>Shopping</option>
            <option>Clothing</option>
            <option>Gym</option>
            <option>Education</option>
            <option>Electronics</option>
            <option>Salon</option>
            <option>Other</option>

          </select>

        </div>
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

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

            {filteredOffers.map((offer) => (

              <div
                key={offer.id}
                className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:border-yellow-400 hover:shadow-[0_20px_50px_rgba(234,179,8,0.45)]"
              >

                {/* Offer Image */}

                <div className="overflow-hidden">

                  <img
                    src={offer.image}
                    alt={offer.title}
                    className="h-64 w-full object-cover transition duration-700 group-hover:scale-110"
                  />

                </div>

                {/* Content */}

                <div className="rounded-b-3xl bg-slate-100 p-6">

                  {/* Category + Ribbon */}

                  <div className="mb-4 flex flex-wrap gap-3">

                    <span className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-bold text-white shadow">

                      {offer.category}

                    </span>

                    <span className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-sm font-bold text-black shadow">

                      🔥 SPC Exclusive

                    </span>

                  </div>

                  {/* Business */}

                  <p className="text-sm font-semibold text-slate-500">

                    🏢 {offer.businessName || "SPC Partner Business"}

                  </p>

                  {/* Offer Title */}

                  <h2 className="mt-2 text-3xl font-bold text-green-600">

                    {offer.title}

                  </h2>

                  {/* Discount */}

                  <h3 className="mt-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-4xl font-extrabold text-transparent">

                    {offer.discount}

                  </h3>

                  {/* Description */}

                  <p className="mt-4 line-clamp-2 text-gray-600">

                    {offer.description}

                  </p>

                  <div className="mt-8 flex gap-3">

                    <button
                      onClick={() =>
                        setSelectedOffer(offer)
                      }
                      className="flex-1 rounded-xl bg-green-600 py-4 font-bold text-white transition hover:bg-green-700"
                    >
                      👁 View Details
                    </button>

                    <button
                      onClick={() =>
                        router.push("/student/dashboard")
                      }
                      className="flex-1 rounded-xl bg-green-600 py-4 font-bold text-white transition hover:bg-green-700"
                    >
                      📱 My QR
                    </button>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}
                {/* Premium Offer Popup */}

        {selectedOffer && (

          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedOffer(null)}
          >

            <div
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl transition-all duration-300"
            >

              {/* Offer Image */}

              <img
                src={selectedOffer.image}
                alt={selectedOffer.title}
                className="h-80 w-full object-cover"
              />

              {/* Details */}

              <div className="bg-slate-100 p-8">

                {/* Category + Ribbon */}

                <div className="mb-5 flex flex-wrap gap-3">

                  <span className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-bold text-white">

                    {selectedOffer.category}

                  </span>

                  <span className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-sm font-bold text-black">

                    🔥 SPC Exclusive

                  </span>

                </div>

                {/* Business */}

                <p className="text-lg font-semibold text-slate-500">

                  🏢 {selectedOffer.businessName || "SPC Partner Business"}

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

                    {selectedOffer.description}

                  </p>

                </div>

                <div className="mt-8 flex gap-4">

                  <button
                    onClick={() =>
                      router.push("/student/dashboard")
                    }
                    className="flex-1 rounded-xl bg-green-600 py-4 text-lg font-bold text-white transition hover:bg-green-700"
                  >
                    📱 Show My QR
                  </button>

                  <button
                    onClick={() =>
                      setSelectedOffer(null)
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
                {/* Total Offers */}

        <div className="mt-12 rounded-3xl border border-gray-200 bg-slate-100 p-8 shadow-xl">

          <div className="flex items-center justify-between">

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