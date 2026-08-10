"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";

import BusinessProtected from "@/components/BusinessProtected";

import { auth, db } from "@/lib/firebase";

import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

export default function AddOffer() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [discount, setDiscount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [preview, setPreview] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingOffer, setCheckingOffer] = useState(true);
  const [hasActiveOffer, setHasActiveOffer] = useState(false);

  const [businessName, setBusinessName] =
    useState("");

  const [existingOfferId, setExistingOfferId] =
    useState("");

  useEffect(() => {
    loadBusinessAndCheckOffer();
  }, []);

  const loadBusinessAndCheckOffer = async () => {
    try {
      setCheckingOffer(true);

      const user = auth.currentUser;

      if (!user) {
        router.replace("/business/login");
        return;
      }

      // Load business details
      const businessSnap = await getDoc(
        doc(db, "businesses", user.uid)
      );

      if (businessSnap.exists()) {
        setBusinessName(
          businessSnap.data().businessName || ""
        );
      }

      // Check whether this business already has
      // an active offer
      const offerQuery = query(
        collection(db, "offers"),
        where("businessId", "==", user.uid),
        where("status", "==", "active")
      );

      const offerSnap = await getDocs(offerQuery);

      if (!offerSnap.empty) {
        setHasActiveOffer(true);
        setExistingOfferId(
          offerSnap.docs[0].id
        );
      } else {
        setHasActiveOffer(false);
        setExistingOfferId("");
      }
    } catch (error) {
      console.error(
        "Error checking business offer:",
        error
      );

      alert(
        "Unable to check your existing offer."
      );
    } finally {
      setCheckingOffer(false);
    }
  };

  const saveOffer = async () => {
    if (
      !title.trim() ||
      !discount.trim() ||
      !description.trim() ||
      !category ||
      !imageFile
    ) {
      alert("Please fill all fields");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      alert("Login Required");
      return;
    }

    try {
      setLoading(true);

      // IMPORTANT:
      // Check again immediately before creating the offer.
      // This prevents a second active offer if the page
      // was left open for some time.
      const existingOfferQuery = query(
        collection(db, "offers"),
        where("businessId", "==", user.uid),
        where("status", "==", "active")
      );

      const existingOfferSnap =
        await getDocs(existingOfferQuery);

      if (!existingOfferSnap.empty) {
        setHasActiveOffer(true);
        setExistingOfferId(
          existingOfferSnap.docs[0].id
        );

        alert(
          "⚠️ You already have an active offer. Please manage your existing offer before adding a new one."
        );

        return;
      }

      // Upload image to Cloudinary
      const data = new FormData();

      data.append("file", imageFile);

      data.append(
        "upload_preset",
        "spc_offers"
      );

      data.append(
        "public_id",
        uuid()
      );

      const upload = await fetch(
        "https://api.cloudinary.com/v1_1/vwyjcwb2/image/upload",
        {
          method: "POST",
          body: data,
        }
      );

      const uploaded = await upload.json();

      if (!uploaded.secure_url) {
        throw new Error(
          "Image upload failed"
        );
      }

      // Create offer
      await addDoc(
        collection(db, "offers"),
        {
          businessId: user.uid,
          businessName,

          title: title.trim(),
          discount: discount.trim(),
          description: description.trim(),
          category,

          image: uploaded.secure_url,

          status: "active",

          createdAt: serverTimestamp(),
        }
      );

      alert(
        "✅ Offer Added Successfully"
      );

      router.replace(
        "/business/dashboard"
      );
    } catch (error) {
      console.error(
        "Error saving offer:",
        error
      );

      alert(
        "❌ Failed to save offer"
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingOffer) {
    return (
      <BusinessProtected>
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
          <div className="rounded-3xl bg-white p-10 text-center shadow-xl">
            <h1 className="text-2xl font-bold text-green-700">
              Checking Your Offers...
            </h1>

            <p className="mt-3 text-gray-500">
              Please wait.
            </p>
          </div>
        </main>
      </BusinessProtected>
    );
  }

  return (
    <BusinessProtected>
      <main className="min-h-screen bg-slate-100 p-6">

        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-xl">

          {/* Header */}
          <div className="mb-8 flex items-center justify-between gap-3">

            <button
              onClick={() =>
                router.push(
                  "/business/dashboard"
                )
              }
              className="rounded-xl bg-gray-200 px-4 py-2 font-semibold hover:bg-gray-300"
            >
              ← Dashboard
            </button>

            <h1 className="text-3xl font-bold text-green-700">
              ➕ Add Offer
            </h1>

            <button
              onClick={() => router.back()}
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              ← Back
            </button>

          </div>

          {/* Existing Active Offer Warning */}
          {hasActiveOffer ? (

            <div className="rounded-3xl border-2 border-orange-300 bg-orange-50 p-8">

              <div className="text-center">

                <div className="text-5xl">
                  ⚠️
                </div>

                <h2 className="mt-4 text-3xl font-bold text-orange-700">
                  Active Offer Already Exists
                </h2>

                <p className="mt-4 leading-7 text-gray-700">
                  Your business can have only
                  <strong> one active offer </strong>
                  at a time.
                </p>

                <p className="mt-2 text-gray-600">
                  Please manage your existing
                  offer before creating a new one.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">

                  <button
                    onClick={() =>
                      router.push(
                        "/business/my-offers"
                      )
                    }
                    className="flex-1 rounded-xl bg-green-600 py-4 font-bold text-white hover:bg-green-700"
                  >
                    🎁 Manage My Offer
                  </button>

                  <button
                    onClick={() =>
                      router.push(
                        "/business/dashboard"
                      )
                    }
                    className="flex-1 rounded-xl bg-gray-700 py-4 font-bold text-white hover:bg-gray-800"
                  >
                    ← Dashboard
                  </button>

                </div>

              </div>

            </div>

          ) : (

            <div className="space-y-5">

              {/* Offer Title */}
              <input
                type="text"
                placeholder="Offer Title"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600"
              />

              {/* Discount */}
              <input
                type="text"
                placeholder="Discount (Example: 20% OFF)"
                value={discount}
                onChange={(e) =>
                  setDiscount(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600"
              />

              {/* Category */}
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600"
              >
                <option value="">
                  Select Category
                </option>

                <option>
                  Restaurant
                </option>

                <option>
                  Hospital
                </option>

                <option>
                  Shopping
                </option>

                <option>
                  Clothing
                </option>

                <option>
                  Gym
                </option>

                <option>
                  Education
                </option>

                <option>
                  Electronics
                </option>

                <option>
                  Salon
                </option>

                <option>
                  Other
                </option>
              </select>

              {/* Description */}
              <textarea
                placeholder="Offer Description"
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                className="h-36 w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600"
              />

              {/* Image */}
              <div>

                <label className="mb-2 block font-semibold">
                  Offer Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {

                    if (
                      !e.target.files?.length
                    ) {
                      return;
                    }

                    const file =
                      e.target.files[0];

                    setImageFile(file);

                    setPreview(
                      URL.createObjectURL(
                        file
                      )
                    );
                  }}
                  className="w-full rounded-xl border border-gray-300 p-4"
                />

              </div>

              {/* Preview */}
              {preview && (
                <img
                  src={preview}
                  alt="Offer Preview"
                  className="h-64 w-full rounded-xl object-cover"
                />
              )}

              {/* Buttons */}
              <div className="flex gap-4">

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/business/dashboard"
                    )
                  }
                  className="flex-1 rounded-xl border border-gray-300 bg-white py-4 text-lg font-semibold hover:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  onClick={saveOffer}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-green-600 py-4 text-lg font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Uploading Offer..."
                    : "Save Offer"}
                </button>

              </div>

            </div>

          )}

        </div>

      </main>
    </BusinessProtected>
  );
}"use client";
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";

import BusinessProtected from "@/components/BusinessProtected";

import { auth, db } from "@/lib/firebase";

import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

export default function AddOffer() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [discount, setDiscount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [preview, setPreview] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingOffer, setCheckingOffer] = useState(true);
  const [hasActiveOffer, setHasActiveOffer] = useState(false);

  const [businessName, setBusinessName] =
    useState("");

  const [existingOfferId, setExistingOfferId] =
    useState("");

  useEffect(() => {
    loadBusinessAndCheckOffer();
  }, []);

  const loadBusinessAndCheckOffer = async () => {
    try {
      setCheckingOffer(true);

      const user = auth.currentUser;

      if (!user) {
        router.replace("/business/login");
        return;
      }

      // Load business details
      const businessSnap = await getDoc(
        doc(db, "businesses", user.uid)
      );

      if (businessSnap.exists()) {
        setBusinessName(
          businessSnap.data().businessName || ""
        );
      }

      // Check whether this business already has
      // an active offer
      const offerQuery = query(
        collection(db, "offers"),
        where("businessId", "==", user.uid),
        where("status", "==", "active")
      );

      const offerSnap = await getDocs(offerQuery);

      if (!offerSnap.empty) {
        setHasActiveOffer(true);
        setExistingOfferId(
          offerSnap.docs[0].id
        );
      } else {
        setHasActiveOffer(false);
        setExistingOfferId("");
      }
    } catch (error) {
      console.error(
        "Error checking business offer:",
        error
      );

      alert(
        "Unable to check your existing offer."
      );
    } finally {
      setCheckingOffer(false);
    }
  };

  const saveOffer = async () => {
    if (
      !title.trim() ||
      !discount.trim() ||
      !description.trim() ||
      !category ||
      !imageFile
    ) {
      alert("Please fill all fields");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      alert("Login Required");
      return;
    }

    try {
      setLoading(true);

      // IMPORTANT:
      // Check again immediately before creating the offer.
      // This prevents a second active offer if the page
      // was left open for some time.
      const existingOfferQuery = query(
        collection(db, "offers"),
        where("businessId", "==", user.uid),
        where("status", "==", "active")
      );

      const existingOfferSnap =
        await getDocs(existingOfferQuery);

      if (!existingOfferSnap.empty) {
        setHasActiveOffer(true);
        setExistingOfferId(
          existingOfferSnap.docs[0].id
        );

        alert(
          "⚠️ You already have an active offer. Please manage your existing offer before adding a new one."
        );

        return;
      }

      // Upload image to Cloudinary
      const data = new FormData();

      data.append("file", imageFile);

      data.append(
        "upload_preset",
        "spc_offers"
      );

      data.append(
        "public_id",
        uuid()
      );

      const upload = await fetch(
        "https://api.cloudinary.com/v1_1/vwyjcwb2/image/upload",
        {
          method: "POST",
          body: data,
        }
      );

      const uploaded = await upload.json();

      if (!uploaded.secure_url) {
        throw new Error(
          "Image upload failed"
        );
      }

      // Create offer
      await addDoc(
        collection(db, "offers"),
        {
          businessId: user.uid,
          businessName,

          title: title.trim(),
          discount: discount.trim(),
          description: description.trim(),
          category,

          image: uploaded.secure_url,

          status: "active",

          createdAt: serverTimestamp(),
        }
      );

      alert(
        "✅ Offer Added Successfully"
      );

      router.replace(
        "/business/dashboard"
      );
    } catch (error) {
      console.error(
        "Error saving offer:",
        error
      );

      alert(
        "❌ Failed to save offer"
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingOffer) {
    return (
      <BusinessProtected>
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
          <div className="rounded-3xl bg-white p-10 text-center shadow-xl">
            <h1 className="text-2xl font-bold text-green-700">
              Checking Your Offers...
            </h1>

            <p className="mt-3 text-gray-500">
              Please wait.
            </p>
          </div>
        </main>
      </BusinessProtected>
    );
  }

  return (
    <BusinessProtected>
      <main className="min-h-screen bg-slate-100 p-6">

        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-xl">

          {/* Header */}
          <div className="mb-8 flex items-center justify-between gap-3">

            <button
              onClick={() =>
                router.push(
                  "/business/dashboard"
                )
              }
              className="rounded-xl bg-gray-200 px-4 py-2 font-semibold hover:bg-gray-300"
            >
              ← Dashboard
            </button>

            <h1 className="text-3xl font-bold text-green-700">
              ➕ Add Offer
            </h1>

            <button
              onClick={() => router.back()}
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              ← Back
            </button>

          </div>

          {/* Existing Active Offer Warning */}
          {hasActiveOffer ? (

            <div className="rounded-3xl border-2 border-orange-300 bg-orange-50 p-8">

              <div className="text-center">

                <div className="text-5xl">
                  ⚠️
                </div>

                <h2 className="mt-4 text-3xl font-bold text-orange-700">
                  Active Offer Already Exists
                </h2>

                <p className="mt-4 leading-7 text-gray-700">
                  Your business can have only
                  <strong> one active offer </strong>
                  at a time.
                </p>

                <p className="mt-2 text-gray-600">
                  Please manage your existing
                  offer before creating a new one.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">

                  <button
                    onClick={() =>
                      router.push(
                        "/business/my-offers"
                      )
                    }
                    className="flex-1 rounded-xl bg-green-600 py-4 font-bold text-white hover:bg-green-700"
                  >
                    🎁 Manage My Offer
                  </button>

                  <button
                    onClick={() =>
                      router.push(
                        "/business/dashboard"
                      )
                    }
                    className="flex-1 rounded-xl bg-gray-700 py-4 font-bold text-white hover:bg-gray-800"
                  >
                    ← Dashboard
                  </button>

                </div>

              </div>

            </div>

          ) : (

            <div className="space-y-5">

              {/* Offer Title */}
              <input
                type="text"
                placeholder="Offer Title"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600"
              />

              {/* Discount */}
              <input
                type="text"
                placeholder="Discount (Example: 20% OFF)"
                value={discount}
                onChange={(e) =>
                  setDiscount(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600"
              />

              {/* Category */}
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600"
              >
                <option value="">
                  Select Category
                </option>

                <option>
                  Restaurant
                </option>

                <option>
                  Hospital
                </option>

                <option>
                  Shopping
                </option>

                <option>
                  Clothing
                </option>

                <option>
                  Gym
                </option>

                <option>
                  Education
                </option>

                <option>
                  Electronics
                </option>

                <option>
                  Salon
                </option>

                <option>
                  Other
                </option>
              </select>

              {/* Description */}
              <textarea
                placeholder="Offer Description"
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                className="h-36 w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600"
              />

              {/* Image */}
              <div>

                <label className="mb-2 block font-semibold">
                  Offer Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {

                    if (
                      !e.target.files?.length
                    ) {
                      return;
                    }

                    const file =
                      e.target.files[0];

                    setImageFile(file);

                    setPreview(
                      URL.createObjectURL(
                        file
                      )
                    );
                  }}
                  className="w-full rounded-xl border border-gray-300 p-4"
                />

              </div>

              {/* Preview */}
              {preview && (
                <img
                  src={preview}
                  alt="Offer Preview"
                  className="h-64 w-full rounded-xl object-cover"
                />
              )}

              {/* Buttons */}
              <div className="flex gap-4">

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/business/dashboard"
                    )
                  }
                  className="flex-1 rounded-xl border border-gray-300 bg-white py-4 text-lg font-semibold hover:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  onClick={saveOffer}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-green-600 py-4 text-lg font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Uploading Offer..."
                    : "Save Offer"}
                </button>

              </div>

            </div>

          )}

        </div>

      </main>
    </BusinessProtected>
  );
}
