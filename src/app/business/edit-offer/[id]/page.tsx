"use client";

import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import { useParams, useRouter } from "next/navigation";

import BusinessProtected from "@/components/BusinessProtected";

import { auth, db } from "@/lib/firebase";

import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

export default function EditOffer() {
  const router = useRouter();
  const params = useParams();

  const offerId =
    typeof params.id === "string"
      ? params.id
      : "";

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

  /*
   * Load Offer
   */
  useEffect(() => {
    if (!offerId) {
      router.replace(
        "/business/my-offers"
      );
      return;
    }

    loadOffer();
  }, [offerId]);

  /*
   * Load offer from Firestore
   */
  const loadOffer = async () => {
    try {
      setLoading(true);

      const user = auth.currentUser;

      if (!user) {
        router.replace(
          "/business/login"
        );
        return;
      }

      const offerRef = doc(
        db,
        "offers",
        offerId
      );

      const snap =
        await getDoc(offerRef);

      if (!snap.exists()) {
        alert("Offer Not Found");

        router.replace(
          "/business/my-offers"
        );

        return;
      }

      const data = snap.data();

      /*
       * Security check:
       * Make sure this offer belongs
       * to the logged-in business.
       */
      if (
        data.businessId &&
        data.businessId !== user.uid
      ) {
        alert(
          "You are not authorized to edit this offer."
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

      setDescription(
        data.description || ""
      );

      setOldImage(
        data.image || ""
      );

      setPreview(
        data.image || ""
      );
    } catch (error) {
      console.error(
        "Load offer error:",
        error
      );

      alert(
        "Failed to load offer"
      );

      router.replace(
        "/business/my-offers"
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Image change
   */
  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    setImageFile(file);

    const objectUrl =
      URL.createObjectURL(file);

    setPreview(objectUrl);
  };

  /*
   * Update Offer
   */
  const updateOffer = async () => {
    if (!title.trim()) {
      alert(
        "Please enter Offer Title"
      );
      return;
    }

    if (!discount.trim()) {
      alert(
        "Please enter Discount"
      );
      return;
    }

    if (!category) {
      alert(
        "Please select Category"
      );
      return;
    }

    if (!description.trim()) {
      alert(
        "Please enter Offer Description"
      );
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      alert(
        "Business login required"
      );

      router.replace(
        "/business/login"
      );

      return;
    }

    try {
      setSaving(true);

      /*
       * Get existing offer again
       * before updating.
       */
      const offerRef = doc(
        db,
        "offers",
        offerId
      );

      const existingOffer =
        await getDoc(offerRef);

      if (!existingOffer.exists()) {
        alert("Offer Not Found");

        router.replace(
          "/business/my-offers"
        );

        return;
      }

      const existingData =
        existingOffer.data();

      /*
       * Security check
       */
      if (
        existingData.businessId &&
        existingData.businessId !==
          user.uid
      ) {
        alert(
          "You are not authorized to edit this offer."
        );

        router.replace(
          "/business/my-offers"
        );

        return;
      }

      /*
       * Keep old image unless
       * user selects a new image.
       */
      let image = oldImage;

      /*
       * Upload new image to Cloudinary
       */
      if (imageFile) {
        const data =
          new FormData();

        data.append(
          "file",
          imageFile
        );

        data.append(
          "upload_preset",
          "spc_offers"
        );

        data.append(
          "public_id",
          uuid()
        );

        const upload =
          await fetch(
            "https://api.cloudinary.com/v1_1/vwyjcwb2/image/upload",
            {
              method: "POST",
              body: data,
            }
          );

        if (!upload.ok) {
          throw new Error(
            "Cloudinary upload failed"
          );
        }

        const uploaded =
          await upload.json();

        if (
          !uploaded.secure_url
        ) {
          throw new Error(
            "Image upload failed"
          );
        }

        image =
          uploaded.secure_url;
      }

      /*
       * Update Firestore
       */
      await updateDoc(
        offerRef,
        {
          title: title.trim(),
          discount: discount.trim(),
          category,
          description:
            description.trim(),
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
        "Update offer error:",
        error
      );

      alert(
        "❌ Failed to update offer. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * Loading
   */
  if (loading) {
    return (
      <BusinessProtected>
        <div className="flex min-h-screen items-center justify-center bg-slate-100">

          <div className="rounded-3xl bg-white p-10 text-center shadow-xl">

            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />

            <h2 className="text-2xl font-bold text-green-700">
              Loading Offer...
            </h2>

            <p className="mt-2 text-gray-500">
              Please wait...
            </p>

          </div>

        </div>
      </BusinessProtected>
    );
  }

  return (
    <BusinessProtected>
      <main className="min-h-screen bg-slate-100 p-6">

        <div className="mx-auto max-w-2xl">

          <div className="rounded-3xl bg-white p-6 shadow-xl md:p-8">

            {/* Header */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <button
                onClick={() =>
                  router.push(
                    "/business/dashboard"
                  )
                }
                className="rounded-xl bg-gray-200 px-4 py-3 font-semibold text-gray-800 hover:bg-gray-300"
              >
                ← Dashboard
              </button>

              <h1 className="text-3xl font-bold text-green-700">
                ✏️ Edit Offer
              </h1>

              <button
                onClick={() =>
                  router.push(
                    "/business/my-offers"
                  )
                }
                className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
              >
                My Offers
              </button>

            </div>

            {/* Form */}
            <div className="space-y-5">

              {/* Title */}
              <div>
                <label className="mb-2 block font-semibold text-gray-700">
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
                  className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />
              </div>

              {/* Discount */}
              <div>
                <label className="mb-2 block font-semibold text-gray-700">
                  Discount
                </label>

                <input
                  type="text"
                  placeholder="Example: 20% OFF"
                  value={discount}
                  onChange={(e) =>
                    setDiscount(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />
              </div>

              {/* Category */}
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
                  className="w-full rounded-xl border border-gray-300 bg-white p-4 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                >
                  <option value="">
                    Select Category
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

              {/* Description */}
              <div>
                <label className="mb-2 block font-semibold text-gray-700">
                  Offer Description
                </label>

                <textarea
                  placeholder="Offer Description"
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                  className="h-36 w-full resize-none rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />
              </div>

              {/* Current / New Image */}
              <div>

                <label className="mb-2 block font-semibold text-gray-700">
                  Change Offer Image
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    (Optional)
                  </span>
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    handleImageChange
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-4"
                />

              </div>

              {/* Preview */}
              {preview && (
                <div>

                  <p className="mb-2 font-semibold text-gray-700">
                    Image Preview
                  </p>

                  <img
                    src={preview}
                    alt="Offer Preview"
                    className="h-64 w-full rounded-2xl object-cover shadow-md"
                  />

                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col gap-4 pt-4 sm:flex-row">

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/business/my-offers"
                    )
                  }
                  disabled={saving}
                  className="flex-1 rounded-xl border border-gray-300 bg-white py-4 text-lg font-bold text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={updateOffer}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-green-600 py-4 text-lg font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
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