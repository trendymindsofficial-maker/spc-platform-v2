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
} from "firebase/firestore";

import {
  v4 as uuid,
} from "uuid";

export default function AddOffer() {
  const router = useRouter();

  const [title, setTitle] =
    useState("");

  const [discount, setDiscount] =
    useState("");

  const [category, setCategory] =
    useState("");

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

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);

      const snap = await getDocs(
        collection(db, "categories")
      );

      const data = snap.docs
        .map(
          (item) =>
            item.data().name
        )
        .filter(Boolean) as string[];

      setCategories(data);
    } catch (error) {
      console.error(
        "Category loading error:",
        error
      );
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleImageChange = (
    file: File | null
  ) => {
    if (!file) return;

    setImageFile(file);

    const url =
      URL.createObjectURL(file);

    setPreview(url);
  };

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
       * BUSINESS DETAILS
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
        businessData.ownerMobile ||
        businessData.businessMobile ||
        "";

      const businessAddress =
        businessData.address ||
        businessData.businessAddress ||
        businessData.location ||
        businessData.fullAddress ||
        "";

      /*
       * CLOUDINARY
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

      const uploaded =
        await upload.json();

      if (!uploaded.secure_url) {
        throw new Error(
          "Image upload failed"
        );
      }

      /*
       * SAVE OFFER
       */

      await addDoc(
        collection(db, "offers"),
        {
          title: title.trim(),

          discount:
            discount.trim(),

          category,

          description:
            description.trim(),

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
        "❌ Failed to add offer."
      );
    } finally {
      setSaving(false);
    }
  };

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
                onClick={() =>
                  router.push(
                    "/business/my-offers"
                  )
                }
                className="rounded-xl bg-gray-200 px-4 py-2 font-semibold hover:bg-gray-300"
              >
                ← Back
              </button>

            </div>

            {/* FORM */}

            <div className="space-y-5">

              <input
                type="text"
                placeholder="Offer Title"
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600"
              />

              <input
                type="text"
                placeholder="Discount (Example: 20% OFF)"
                value={discount}
                onChange={(e) =>
                  setDiscount(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600"
              />

              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value
                  )
                }
                disabled={
                  loadingCategories
                }
                className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600 disabled:bg-gray-100"
              >

                <option value="">
                  {loadingCategories
                    ? "Loading Categories..."
                    : "Select Category"}
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

              {/* IMAGE */}

              <div>

                <label className="mb-2 block font-semibold">
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
                  className="w-full rounded-xl border border-gray-300 p-4"
                />

              </div>

              {preview && (
                <img
                  src={preview}
                  alt="Preview"
                  className="h-64 w-full rounded-xl object-cover"
                />
              )}

              {/* SAVE */}

              <button
                onClick={addOffer}
                disabled={saving}
                className="w-full rounded-xl bg-green-600 py-4 text-lg font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
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