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
  title: string;
  discount: string;
  category: string;
  image: string;
}

const MAX_DESCRIPTION_LENGTH = 80;

export default function AddOffer() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [discount, setDiscount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] =
    useState("");

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [preview, setPreview] =
    useState("");

  const [categories, setCategories] =
    useState<string[]>([]);

  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [checkingOffer, setCheckingOffer] =
    useState(true);

  const [existingOffer, setExistingOffer] =
    useState<ExistingOffer | null>(null);

  const [saving, setSaving] =
    useState(false);

  /*
   * ==========================================
   * LOAD CATEGORIES
   * ==========================================
   */

  useEffect(() => {
    loadCategories();
  }, []);

  /*
   * ==========================================
   * CHECK AUTH + EXISTING ACTIVE OFFER
   * ==========================================
   */

  useEffect(() => {
    const unsubscribe =
      auth.onAuthStateChanged(
        async (user) => {
          if (!user) {
            router.replace(
              "/business/login"
            );
            return;
          }

          await checkExistingOffer(
            user.uid
          );
        }
      );

    return () => unsubscribe();
  }, [router]);

  /*
   * ==========================================
   * CHECK BUSINESS ACTIVE OFFER
   * ==========================================
   */

  const checkExistingOffer = async (
    businessId: string
  ) => {
    try {
      setCheckingOffer(true);

      const offerQuery = query(
        collection(db, "offers"),
        where(
          "businessId",
          "==",
          businessId
        ),
        where(
          "status",
          "==",
          "active"
        )
      );

      const offerSnap =
        await getDocs(
          offerQuery
        );

      if (!offerSnap.empty) {
        const offerDoc =
          offerSnap.docs[0];

        const data =
          offerDoc.data();

        setExistingOffer({
          id: offerDoc.id,
          title:
            data.title || "",
          discount:
            data.discount || "",
          category:
            data.category || "",
          image:
            data.image || "",
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
   * ==========================================
   * LOAD CATEGORIES
   * ==========================================
   */

  const loadCategories =
    async () => {
      try {
        setLoadingCategories(
          true
        );

        const snap =
          await getDocs(
            collection(
              db,
              "categories"
            )
          );

        const data =
          snap.docs
            .map((item) => {
              const itemData =
                item.data();

              return (
                itemData.name ||
                itemData.category ||
                itemData.title ||
                ""
              );
            })
            .filter(
              Boolean
            ) as string[];

        setCategories(
          Array.from(
            new Set(data)
          ).sort((a, b) =>
            a.localeCompare(b)
          )
        );
      } catch (error) {
        console.error(
          "Category loading error:",
          error
        );
      } finally {
        setLoadingCategories(
          false
        );
      }
    };

  /*
   * ==========================================
   * IMAGE SELECT
   * ==========================================
   */

  const handleImageChange = (
    file: File | null
  ) => {
    if (!file) {
      return;
    }

    setImageFile(file);

    const url =
      URL.createObjectURL(file);

    setPreview(url);
  };

  /*
   * ==========================================
   * DESCRIPTION CHANGE
   * ==========================================
   */

  const handleDescriptionChange = (
    value: string
  ) => {
    const limitedValue =
      value.slice(
        0,
        MAX_DESCRIPTION_LENGTH
      );

    setDescription(
      limitedValue
    );
  };

  /*
   * ==========================================
   * ADD OFFER
   * ==========================================
   */

  const addOffer = async () => {
    if (
      !title.trim() ||
      !discount.trim() ||
      !category ||
      !description.trim()
    ) {
      alert(
        "Please fill all fields."
      );

      return;
    }

    /*
     * FINAL DESCRIPTION LENGTH CHECK
     */

    if (
      description.trim().length >
      MAX_DESCRIPTION_LENGTH
    ) {
      alert(
        `Offer description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`
      );

      return;
    }

    if (!imageFile) {
      alert(
        "Please select offer image."
      );

      return;
    }

    const user =
      auth.currentUser;

    if (!user) {
      alert(
        "Business login required."
      );

      return;
    }

    try {
      setSaving(true);

      /*
       * ========================================
       * FINAL ACTIVE OFFER CHECK
       * ========================================
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
          title:
            data.title || "",
          discount:
            data.discount || "",
          category:
            data.category || "",
          image:
            data.image || "",
        });

        alert(
          "⚠️ You already have an active offer.\n\nPlease manage your existing offer before creating a new one."
        );

        return;
      }

      /*
       * ========================================
       * BUSINESS DETAILS
       * ========================================
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
        businessData.businessName ||
        "";

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
       * ========================================
       * CLOUDINARY IMAGE UPLOAD
       * ========================================
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

      if (
        !uploaded.secure_url
      ) {
        throw new Error(
          "Image upload failed."
        );
      }

      /*
       * ========================================
       * SAVE OFFER
       * ========================================
       */

      await addDoc(
        collection(db, "offers"),
        {
          title:
            title.trim(),

          discount:
            discount.trim(),

          category,

          description:
            description.trim().slice(
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

          status:
            "active",

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
   * ==========================================
   * LOADING
   * ==========================================
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
   * ==========================================
   * EXISTING ACTIVE OFFER
   * ==========================================
   */

  if (existingOffer) {
    return (
      <BusinessProtected>
        <main className="min-h-screen bg-slate-100 p-6">

          <div className="mx-auto max-w-2xl">

            <div className="rounded-3xl bg-white p-8 shadow-xl">

              {/* HEADER */}

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

              {/* WARNING */}

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

                {/* EXISTING OFFER */}

                <div className="mt-7 overflow-hidden rounded-2xl bg-white shadow-md">

                  {existingOffer.image ? (
                    <img
                      src={
                        existingOffer.image
                      }
                      alt={
                        existingOffer.title ||
                        "Active Offer"
                      }
                      className="h-56 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-gray-100 text-5xl">
                      🎁
                    </div>
                  )}

                  <div className="p-6">

                    {existingOffer.category && (
                      <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                        {
                          existingOffer.category
                        }
                      </span>
                    )}

                    <h3 className="mt-4 text-2xl font-bold text-gray-900">
                      {
                        existingOffer.title ||
                        "Active Offer"
                      }
                    </h3>

                    <p className="mt-3 text-3xl font-extrabold text-green-600">
                      {
                        existingOffer.discount
                      }
                    </p>

                  </div>

                </div>

                {/* ACTION */}

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
   * ==========================================
   * NORMAL ADD OFFER PAGE
   * ==========================================
   */

  return (
    <BusinessProtected>
      <main className="min-h-screen bg-slate-100 p-6">

        <div className="mx-auto max-w-2xl">

          <div className="rounded-3xl bg-white p-8 shadow-xl">

            {/* HEADER */}

            <div className="mb-8 flex items-center justify-between gap-4">

              <h1 className="text-3xl font-bold text-green-700">
                ➕ Add New Offer
              </h1>

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

            <div className="space-y-5">

              {/* TITLE */}

              <div>

                <label className="mb-2 block font-semibold text-gray-800">
                  Offer Title
                </label>

                <input
                  type="text"
                  placeholder="Offer Title"
                  value={title}
                  onChange={(e) =>
                    setTitle(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-4 text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />

              </div>

              {/* DISCOUNT */}

              <div>

                <label className="mb-2 block font-semibold text-gray-800">
                  Discount
                </label>

                <input
                  type="text"
                  placeholder="Discount (Example: 20% OFF)"
                  value={discount}
                  onChange={(e) =>
                    setDiscount(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-4 text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />

              </div>

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
                  className="w-full rounded-xl border border-gray-300 bg-white p-4 text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
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
                  placeholder="Briefly describe your offer..."
                  value={description}
                  maxLength={
                    MAX_DESCRIPTION_LENGTH
                  }
                  onChange={(e) =>
                    handleDescriptionChange(
                      e.target.value
                    )
                  }
                  className="h-28 w-full resize-none rounded-xl border border-gray-300 bg-white p-4 text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />

                <p className="mt-1 text-xs text-gray-400">
                  Keep it short and clear. Maximum{" "}
                  {MAX_DESCRIPTION_LENGTH}{" "}
                  characters.
                </p>

              </div>

              {/* IMAGE */}

              <div>

                <label className="mb-2 block font-semibold text-gray-800">
                  Offer Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleImageChange(
                      e.target.files?.[0] ||
                        null
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-4"
                />

              </div>

              {/* PREVIEW */}

              {preview && (
                <div>

                  <p className="mb-2 text-sm font-semibold text-gray-700">
                    Image Preview
                  </p>

                  <img
                    src={preview}
                    alt="Offer Preview"
                    className="h-64 w-full rounded-xl object-cover"
                  />

                </div>
              )}

              {/* SAVE */}

              <button
                type="button"
                onClick={addOffer}
                disabled={saving}
                className="w-full rounded-xl bg-green-600 py-4 text-lg font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Uploading & Saving..."
                  : "💾 Add Offer"}
              </button>

            </div>

          </div>

        </div>

      </main>
    </BusinessProtected>
  );
}