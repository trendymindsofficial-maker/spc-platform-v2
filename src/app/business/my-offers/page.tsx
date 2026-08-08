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

          setOffers(

            snap.docs.map((item) => ({

              id: item.id,

              ...item.data(),

            })) as Offer[]

          );

          setLoading(false);

        }
      );

    return () => unsubscribe();

  }, [router]);

  const logout = async () => {

    await signOut(auth);

    router.replace(
      "/business/login"
    );

  };

  const deleteOffer = async (
    id: string,
    title: string
  ) => {

    const ok = window.confirm(
      `Delete "${title}" ?`
    );

    if (!ok) return;

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

      alert("Offer Deleted Successfully");

    } catch (error) {

      console.error(error);

      alert("Failed to delete offer");

    }

  };

  if (loading) {

    return (

      <BusinessProtected>

        <div className="flex min-h-screen items-center justify-center bg-slate-100">

          <div className="rounded-3xl bg-white p-10 shadow-xl">

            <h2 className="text-2xl font-bold text-green-700">
              Loading Offers...
            </h2>

          </div>

        </div>

      </BusinessProtected>

    );

  }

  return (

    <BusinessProtected>

      <main className="min-h-screen bg-slate-100 p-6">

        <div className="mx-auto max-w-7xl">

          <div className="mb-8 flex items-center justify-between">

            <h1 className="text-4xl font-bold text-green-700">
              🎁 My Offers
            </h1>

            <div className="flex gap-3">
                            <button
                onClick={() =>
                  router.push("/business/dashboard")
                }
                className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
              >
                🏠 Dashboard
              </button>

              <button
                onClick={logout}
                className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700"
              >
                🚪 Logout
              </button>

            </div>

          </div>

          {offers.length === 0 ? (

            <div className="rounded-3xl bg-white p-12 text-center shadow-xl">

              <h2 className="text-3xl font-bold">
                No Offers Found
              </h2>

              <p className="mt-3 text-gray-500">
                Create your first offer from the Dashboard.
              </p>

            </div>

          ) : (

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

              {offers.map((offer) => (

                <div
                  key={offer.id}
                  className="overflow-hidden rounded-3xl bg-white shadow-xl"
                >

                  <img
                    src={offer.image}
                    alt={offer.title}
                    className="h-56 w-full object-cover"
                  />

                  <div className="p-6">

                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">

                      {offer.category}

                    </span>

                    <h2 className="mt-4 text-2xl font-bold">

                      {offer.title}

                    </h2>

                    <p className="mt-3 text-3xl font-bold text-green-600">

                      {offer.discount}

                    </p>

                    <p className="mt-4 text-gray-600">

                      {offer.description}

                    </p>

                    <div className="mt-6 flex gap-3">
                                            <button
                        onClick={() =>
                          router.push(
  `/business/edit-offer/${offer.id}`
)
                        }
                        className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700"
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
                        className="flex-1 rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700"
                      >
                        🗑 Delete
                      </button>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          )}

          <div className="mt-10 rounded-3xl bg-white p-6 shadow-xl">

            <div className="flex items-center justify-between">

              <div>

                <h2 className="text-xl font-bold">
                  Total Offers
                </h2>

                <p className="text-gray-500">
                  Manage all your business offers.
                </p>

              </div>

              <div className="rounded-2xl bg-green-100 px-6 py-4">

                <span className="text-2xl font-bold text-green-700">

                  {offers.length}

                </span>

              </div>

            </div>

          </div>
                  </div>

      </main>

    </BusinessProtected>

  );

}