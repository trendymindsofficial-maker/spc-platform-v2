"use client";

import {
  use,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { v4 as uuid } from "uuid";

import BusinessProtected from "@/components/BusinessProtected";

import { auth, db } from "@/lib/firebase";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

interface EditOfferProps {
  params: Promise<{
    id: string;
  }>;
}

const MAX_DESCRIPTION_LENGTH = 80;

export default function EditOffer({
  params,
}: EditOfferProps) {
  const router = useRouter();

  const { id: offerId } = use(params);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [title, setTitle] =
    useState("");

  const [discount, setDiscount] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [oldImage, setOldImage] =
    useState("");

  const [preview, setPreview] =
    useState("");

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [categories, setCategories] =
    useState<string[]>([]);

  const [loadingCategories, setLoadingCategories] =
    useState(true);

  /*
   * ==========================================
   * LOAD DATA
   * ==========================================
   */

  useEffect(() => {
    if (!offerId) {
      router.replace(
        "/business/my-offers"
      );

      return;
    }

    loadOffer();
    loadCategories();
  }, [offerId]);

  /*
   * ==========================================
   * LOAD OFFER
   * ==========================================
   */

  const loadOffer = async () => {
    try {
      setLoading(true);

      const user =
        auth.currentUser;

      if (!user) {
        router.replace(
          "/business/login"
        );

        return;
      }

      const offerRef =
        doc(
          db,
          "offers",
          offerId
        );

      const offerSnap =
        await getDoc(
          offerRef
        );

      if (!offerSnap.exists()) {
        alert(
          "❌ Offer Not Found"
        );

        router.replace(
          "/business/my-offers"
        );

        return;
      }

      const data =
        offerSnap.data();

      /*
       * SECURITY:
       * Business can edit only its own offer.
       */

      if (
        data.businessId !==
        user.uid
      ) {
        alert(
          "❌ You are not authorized to edit this offer."
        );

        router.replace(
          "/business/my-offers"
        );

        return;
      }

      setTitle(
        data.title || ""
      );

      setDiscount(
        data.discount || ""
      );

      setCategory(
        data.category || ""
      );

      /*
       * Existing descriptions longer than 80
       * are trimmed for the new fixed format.
       */

      setDescription(
        String(
          data.description || ""
        ).slice(
          0,
          MAX_DESCRIPTION_LENGTH
        )
      );

      setOldImage(
        data.image || ""
      );

      setPreview(
        data.image || ""
      );

    } catch (error) {
      console.error(
        "Offer loading error:",
        error
      );

      alert(
        "❌ Failed to load offer."
      );

      router.replace(
        "/business/my-offers"
      );
    } finally {
      setLoading(false);
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

        const uniqueCategories =
          Array.from(
            new Set(data)
          ).sort((a, b) =>
            a.localeCompare(b)
          );

        setCategories(
          uniqueCategories
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
   * IMAGE CHANGE
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
    setDescription(
      value.slice(
        0,
        MAX_DESCRIPTION_LENGTH
      )
    );
  };

  /*
   * ==========================================
   * UPDATE OFFER
   * ==========================================
   */

  const updateOffer =
    async () => {
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

      if (
        description.trim().length >
        MAX_DESCRIPTION_LENGTH
      ) {
        alert(
          `Offer description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`
        );

        return;
      }

      const user =
        auth.currentUser;

      if (!user) {
        alert(
          "❌ Business login required."
        );

        return;
      }

      try {
        setSaving(true);

        /*
         * =====================================
         * FINAL OWNERSHIP CHECK
         * =====================================
         */

        const offerRef =
          doc(
            db,
            "offers",
            offerId
          );

        const offerSnap =
          await getDoc(
            offerRef
          );

        if (!offerSnap.exists()) {
          alert(
            "❌ Offer not found."
          );

          return;
        }

        const currentData =
          offerSnap.data();

        if (
          currentData.businessId !==
          user.uid
        ) {
          alert(
            "❌ You are not authorized to edit this offer."
          );

          return;
        }

        /*
         * =====================================
         * IMAGE
         * =====================================
         */

        let image =
          oldImage;

        if (imageFile) {
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

          image =
            uploaded.secure_url;
        }

        /*
         * =====================================
         * UPDATE FIRESTORE
         * =====================================
         */

        await updateDoc(
          offerRef,
          {
            title:
              title.trim(),

            discount:
              discount.trim(),

            category,

            description:
              description
                .trim()
                .slice(
                  0,
                  MAX_DESCRIPTION_LENGTH
                ),

            image,
          }
        );

        alert(
          "✅ Offer Updated Successfully"
        );

        router.replace(
          "/business/my-offers"
        );

      } catch (error) {
        console.error(
          "Offer update error:",
          error
        );

        alert(
          error instanceof Error
            ? `❌ ${error.message}`
            : "❌ Failed to update offer."
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
    loading ||
    loadingCategories
  ) {
    return (
      <BusinessProtected>
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">

          <div className="rounded-3xl bg-white p-10 text-center shadow-xl">

            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />

            <h2 className="text-2xl font-bold text-green-700">
              Loading Offer...
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
   * PAGE
   * ==========================================
   */

  return (
    <BusinessProtected>
      <main className="min-h-screen bg-slate-100 p-6">

        <div className="mx-auto max-w-2xl">

          <div className="rounded-3xl bg-white p-8 shadow-xl">

            {/* HEADER */}

            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-green-600">
                  SBC Business
                </p>

                <h1 className="mt-1 text-3xl font-bold text-green-700">
                  ✏️ Edit Offer
                </h1>
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
                ← My Offers
              </button>

            </div>

            {/* FORM */}

            <div className="space-y-5">

              {/* TITLE */}

              <div>

                <label className="mb-2 block font-semibold text-gray-700">
                  Offer Title
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(e) =>
                    setTitle(
                      e.target.value
                    )
                  }
                  placeholder="Offer Title"
                  className="w-full rounded-xl border border-gray-300 bg-white p-4 text-gray-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />

              </div>

              {/* DISCOUNT */}

              <div>

                <label className="mb-2 block font-semibold text-gray-700">
                  Discount
                </label>

                <input
                  type="text"
                  value={discount}
                  onChange={(e) =>
                    setDiscount(
                      e.target.value
                    )
                  }
                  placeholder="Example: 20% OFF"
                  className="w-full rounded-xl border border-gray-300 bg-white p-4 text-gray-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />

              </div>

              {/* CATEGORY */}

              <div>

                <label className="mb-2 block font-semibold text-gray-700">
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

                  {category &&
                    !categories.includes(
                      category
                    ) && (
                      <option
                        value={
                          category
                        }
                      >
                        {category}
                      </option>
                    )}

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

                  <label className="block font-semibold text-gray-700">
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
                  value={description}
                  onChange={(e) =>
                    handleDescriptionChange(
                      e.target.value
                    )
                  }
                  maxLength={
                    MAX_DESCRIPTION_LENGTH
                  }
                  placeholder="Briefly describe your offer..."
                  className="h-28 w-full resize-none rounded-xl border border-gray-300 bg-white p-4 text-gray-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />

                <p className="mt-1 text-xs text-gray-400">
                  Maximum{" "}
                  {MAX_DESCRIPTION_LENGTH}{" "}
                  characters. Keep it short and clear.
                </p>

              </div>

              {/* IMAGE */}

              <div>

                <label className="mb-2 block font-semibold text-gray-700">
                  Change Offer Image
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    (Optional)
                  </span>
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
                  className="w-full rounded-xl border border-gray-300 bg-white p-4 text-sm"
                />

              </div>

              {/* PREVIEW */}

              {preview && (
                <div>

                  <p className="mb-2 text-sm font-semibold text-gray-600">
                    Image Preview
                  </p>

                  <img
                    src={preview}
                    alt="Offer Preview"
                    className="h-64 w-full rounded-2xl object-cover"
                  />

                </div>
              )}

              {/* BUTTONS */}

              <div className="flex flex-col gap-3 pt-3 sm:flex-row">

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/business/my-offers"
                    )
                  }
                  disabled={saving}
                  className="flex-1 rounded-xl border border-gray-300 bg-white py-4 text-lg font-bold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    updateOffer
                  }
                  disabled={saving}
                  className="flex-1 rounded-xl bg-green-600 py-4 text-lg font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "⏳ Updating..."
                    : "💾 Save Changes"}
                </button>

              </div>

            </div>

          </div>

        </div>

      </main>
    </BusinessProtected>
  );
}