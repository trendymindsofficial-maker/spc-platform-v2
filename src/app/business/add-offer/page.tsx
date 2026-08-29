"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BusinessProtected from "@/components/BusinessProtected";

import { auth, db } from "@/lib/firebase";

import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";

import { v4 as uuid } from "uuid";

interface ExistingOffer {
  id: string;
  category: string;
  image: string;
  description: string;
}

const MAX_DESCRIPTION_LENGTH = 80;

export default function AddOffer() {
  const router = useRouter();

  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [preview, setPreview] = useState("");

  const [categories, setCategories] =
    useState<string[]>([]);

  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [checkingOffer, setCheckingOffer] =
    useState(true);

  const [existingOffer, setExistingOffer] =
    useState<ExistingOffer | null>(null);

  const [saving, setSaving] = useState(false);

  /*
   * ==========================================================
   * LOAD CATEGORIES
   * ==========================================================
   */

  useEffect(() => {
    loadCategories();
  }, []);

  /*
   * ==========================================================
   * CHECK AUTH + EXISTING ACTIVE OFFER
   * ==========================================================
   */

  useEffect(() => {
    const unsubscribe =
      auth.onAuthStateChanged(async (user) => {
        if (!user) {
          router.replace("/business/login");
          return;
        }

        await checkExistingOffer(user.uid);
      });

    return () => unsubscribe();
  }, [router]);

  /*
   * ==========================================================
   * CHECK EXISTING ACTIVE OFFER
   * ==========================================================
   */

  const checkExistingOffer = async (
    businessId: string
  ) => {
    try {
      setCheckingOffer(true);

      const offerQuery = query(
        collection(db, "offers"),
        where("businessId", "==", businessId),
        where("status", "==", "active")
      );

      const offerSnap =
        await getDocs(offerQuery);

      if (!offerSnap.empty) {
        const offerDoc =
          offerSnap.docs[0];

        const data =
          offerDoc.data();

        setExistingOffer({
          id: offerDoc.id,
          category: data.category || "",
          image: data.image || "",
          description:
            data.description || "",
        });
      } else {
        setExistingOffer(null);
      }
    } catch (error) {
      console.error(
        "Active offer checking error:",
        error
      );
    } finally {
      setCheckingOffer(false);
    }
  };

  /*
   * ==========================================================
   * LOAD CATEGORIES
   * ==========================================================
   */

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);

      const snap = await getDocs(
        collection(db, "categories")
      );

      const data = snap.docs
        .map((item) => {
          const itemData = item.data();

          return (
            itemData.name ||
            itemData.category ||
            itemData.title ||
            ""
          );
        })
        .filter(Boolean) as string[];

      const uniqueCategories =
        Array.from(new Set(data)).sort(
          (a, b) => a.localeCompare(b)
        );

      setCategories(uniqueCategories);
    } catch (error) {
      console.error(
        "Category loading error:",
        error
      );
    } finally {
      setLoadingCategories(false);
    }
  };

  /*
   * ==========================================================
   * IMAGE SELECT
   * ==========================================================
   */

  const handleImageChange = (
    file: File | null
  ) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image.");
      return;
    }

    setImageFile(file);

    const url =
      URL.createObjectURL(file);

    setPreview(url);
  };

  /*
   * ==========================================================
   * DESCRIPTION
   * ==========================================================
   */

  const handleDescriptionChange = (
    value: string
  ) => {
    setDescription(
      value.slice(
        0,
        MAX_DESCRIPTION_LENGTH
      )
    );
  };

  /*
   * ==========================================================
   * ADD OFFER
   * ==========================================================
   */

  const addOffer = async () => {
    if (!category) {
      alert("Please select a category.");
      return;
    }

    if (!description.trim()) {
      alert(
        "Please enter a short description."
      );
      return;
    }

    if (
      description.trim().length >
      MAX_DESCRIPTION_LENGTH
    ) {
      alert(
        `Short description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`
      );
      return;
    }

    if (!imageFile) {
      alert(
        "Please select an offer image."
      );
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      alert("Business login required.");
      return;
    }

    try {
      setSaving(true);

      /*
       * ======================================================
       * FINAL ACTIVE OFFER CHECK
       * ======================================================
       */

      const existingOfferQuery =
        query(
          collection(db, "offers"),
          where(
            "businessId",
            "==",
            user.uid
          ),
          where(
            "status",
            "==",
            "active"
          )
        );

      const existingOfferSnap =
        await getDocs(
          existingOfferQuery
        );

      if (
        !existingOfferSnap.empty
      ) {
        const offerDoc =
          existingOfferSnap.docs[0];

        const data =
          offerDoc.data();

        setExistingOffer({
          id: offerDoc.id,
          category:
            data.category || "",
          image:
            data.image || "",
          description:
            data.description || "",
        });

        alert(
          "⚠️ You already have an active offer.\n\nPlease manage your existing offer before creating a new one."
        );

        return;
      }

      /*
       * ======================================================
       * BUSINESS DETAILS
       * ======================================================
       */

      const businessSnap =
        await getDoc(
          doc(
            db,
            "businesses",
            user.uid
          )
        );

      const businessData =
        businessSnap.exists()
          ? businessSnap.data()
          : {};

      const businessName =
        businessData.businessName || "";

      const businessMobile =
        businessData.mobile ||
        businessData.phone ||
        businessData.businessMobile ||
        businessData.ownerMobile ||
        "";

      const businessAddress =
        businessData.address ||
        businessData.businessAddress ||
        businessData.location ||
        businessData.fullAddress ||
        "";

      /*
       * ======================================================
       * CLOUDINARY UPLOAD
       * ======================================================
       */

      const formData =
        new FormData();

      formData.append(
        "file",
        imageFile
      );

      formData.append(
        "upload_preset",
        "spc_offers"
      );

      formData.append(
        "public_id",
        uuid()
      );

      const upload =
        await fetch(
          "https://api.cloudinary.com/v1_1/vwyjcwb2/image/upload",
          {
            method: "POST",
            body: formData,
          }
        );

      if (!upload.ok) {
        throw new Error(
          "Cloudinary upload failed."
        );
      }

      const uploaded =
        await upload.json();

      if (!uploaded.secure_url) {
        throw new Error(
          "Image upload failed."
        );
      }

      /*
       * ======================================================
       * SAVE OFFER
       * ======================================================
       *
       * Title/Discount are no longer used.
       * We keep title as "SBC Offer" internally so
       * older parts of the application remain compatible.
       */

      await addDoc(
        collection(db, "offers"),
        {
          title: "SBC Offer",

          discount: "",

          category,

          description:
            description
              .trim()
              .slice(
                0,
                MAX_DESCRIPTION_LENGTH
              ),

          image:
            uploaded.secure_url,

          businessId:
            user.uid,

          businessName,

          businessMobile,

          businessAddress,

          status: "active",

          createdAt:
            serverTimestamp(),
        }
      );

      alert(
        "✅ Offer added successfully."
      );

      router.replace(
        "/business/my-offers"
      );
    } catch (error) {
      console.error(
        "Offer creation error:",
        error
      );

      alert(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Failed to add offer."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (
    checkingOffer ||
    loadingCategories
  ) {
    return (
      <BusinessProtected>
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
          <div className="rounded-3xl bg-white p-10 text-center shadow-xl">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />

            <h2 className="text-2xl font-bold text-green-700">
              Checking Offer...
            </h2>

            <p className="mt-2 text-gray-500">
              Please wait...
            </p>
          </div>
        </main>
      </BusinessProtected>
    );
  }

  /*
   * ==========================================================
   * EXISTING ACTIVE OFFER
   * ==========================================================
   */

  if (existingOffer) {
    return (
      <BusinessProtected>
        <main className="min-h-screen bg-slate-100 p-6">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-3xl bg-white p-8 shadow-xl">

              <div className="mb-8 flex items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-green-700">
                  ➕ Add New Offer
                </h1>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/business/dashboard"
                    )
                  }
                  className="rounded-xl bg-gray-200 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-300"
                >
                  ← Back
                </button>
              </div>

              <div className="rounded-3xl border-2 border-yellow-300 bg-yellow-50 p-7">

                <div className="text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 text-4xl">
                    ⚠️
                  </div>

                  <h2 className="mt-5 text-2xl font-bold text-yellow-800">
                    You Already Have an Active Offer
                  </h2>

                  <p className="mt-3 leading-6 text-yellow-700">
                    A business can have only one
                    active offer at a time.
                  </p>
                </div>

                <div className="mt-7 overflow-hidden rounded-2xl bg-white shadow-md">

                  {existingOffer.image ? (
                    <img
                      src={
                        existingOffer.image
                      }
                      alt="Active SBC Offer"
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-gray-100 text-5xl">
                      🎁
                    </div>
                  )}

                  <div className="p-6">

                    {existingOffer.category && (
                      <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                        {existingOffer.category}
                      </span>
                    )}

                    {existingOffer.description && (
                      <p className="mt-4 text-sm leading-6 text-gray-600">
                        {existingOffer.description}
                      </p>
                    )}

                  </div>
                </div>

                <div className="mt-7">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/business/my-offers"
                      )
                    }
                    className="w-full rounded-2xl bg-blue-600 py-4 text-lg font-bold text-white transition hover:bg-blue-700"
                  >
                    ✏️ Manage Existing Offer
                  </button>

                  <p className="mt-3 text-center text-sm text-gray-500">
                    Edit or delete your current
                    offer from My Offers.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </main>
      </BusinessProtected>
    );
  }

  /*
   * ==========================================================
   * NORMAL ADD OFFER PAGE
   * ==========================================================
   */

  return (
    <BusinessProtected>
      <main className="min-h-screen bg-slate-100 p-6">

        <div className="mx-auto max-w-2xl">

          <div className="rounded-3xl bg-white p-8 shadow-xl">

            {/* HEADER */}

            <div className="mb-8 flex items-center justify-between gap-4">

              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-green-600">
                  SBC Business Portal
                </p>

                <h1 className="mt-1 text-3xl font-bold text-slate-900">
                  ➕ Add New Offer
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                  Upload your offer image and add a short description.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/business/my-offers"
                  )
                }
                className="rounded-xl bg-gray-200 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-300"
              >
                ← Back
              </button>

            </div>

            {/* FORM */}

            <div className="space-y-6">

              {/* CATEGORY */}

              <div>
                <label className="mb-2 block font-semibold text-gray-800">
                  Category
                </label>

                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-4 text-gray-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                >
                  <option value="">
                    Select Category
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

              {/* SHORT DESCRIPTION */}

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label className="font-semibold text-gray-800">
                    Short Description
                  </label>

                  <span
                    className={`text-xs font-bold ${
                      description.length >=
                      MAX_DESCRIPTION_LENGTH
                        ? "text-red-600"
                        : "text-gray-400"
                    }`}
                  >
                    {description.length}/
                    {MAX_DESCRIPTION_LENGTH}
                  </span>

                </div>

                <textarea
                  placeholder="Example: Special student combo at ₹299..."
                  value={description}
                  maxLength={
                    MAX_DESCRIPTION_LENGTH
                  }
                  onChange={(e) =>
                    handleDescriptionChange(
                      e.target.value
                    )
                  }
                  className="h-24 w-full resize-none rounded-xl border border-gray-300 bg-white p-4 text-gray-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />

                <p className="mt-1 text-xs text-gray-400">
                  Maximum 80 characters. Keep it short and clear.
                </p>

              </div>

              {/* OFFER IMAGE */}

              <div>

                <label className="mb-2 block font-semibold text-gray-800">
                  Offer Image
                </label>

                <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-4">

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageChange(
                        e.target.files?.[0] ||
                          null
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white p-4 text-sm"
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    Recommended image ratio: 16:9
                  </p>

                </div>

              </div>

              {/* IMAGE PREVIEW */}

              {preview && (
                <div>

                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">
                      Image Preview
                    </p>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                      16:9 Display
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-slate-50 shadow-sm">

                    <img
                      src={preview}
                      alt="Offer Preview"
                      className="aspect-video w-full object-cover"
                    />

                  </div>

                </div>
              )}

              {/* INFO */}

              <div className="rounded-2xl border border-green-100 bg-green-50 p-4">

                <p className="text-sm font-bold text-green-800">
                  💡 Offer Display
                </p>

                <p className="mt-1 text-xs leading-5 text-green-700">
                  Students will mainly see your offer image,
                  business name, address and short description.
                  Keep the important offer details inside the image.
                </p>

              </div>

              {/* SAVE */}

              <button
                type="button"
                onClick={addOffer}
                disabled={saving}
                className="w-full rounded-xl bg-green-600 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "⏳ Uploading & Saving..."
                  : "💾 Add Offer"}
              </button>

            </div>
          </div>
        </div>
      </main>
    </BusinessProtected>
  );
}