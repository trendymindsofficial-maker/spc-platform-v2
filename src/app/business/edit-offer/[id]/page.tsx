"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { v4 as uuid } from "uuid";

import BusinessProtected from "@/components/BusinessProtected";

import { db } from "@/lib/firebase";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

export default function EditOffer({
  params,
}: {
  params: { id: string };
}) {
  const offerId = params.id;

  const router = useRouter();

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

  const loadCategories =
    async () => {
      try {
        setLoadingCategories(true);

        const snap =
          await getDocs(
            collection(
              db,
              "categories"
            )
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
        setLoadingCategories(
          false
        );
      }
    };

  const loadOffer = async () => {
    try {
      const snap =
        await getDoc(
          doc(
            db,
            "offers",
            offerId
          )
        );

      if (!snap.exists()) {
        alert(
          "Offer Not Found"
        );

        router.replace(
          "/business/my-offers"
        );

        return;
      }

      const data =
        snap.data();

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

      setLoading(false);
    } catch (error) {
      console.error(error);

      alert(
        "Failed to load offer"
      );

      router.replace(
        "/business/my-offers"
      );
    }
  };

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

      try {
        setSaving(true);

        let image = oldImage;

        /*
         * NEW IMAGE
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
         * UPDATE
         */

        await updateDoc(
          doc(
            db,
            "offers",
            offerId
          ),
          {
            title:
              title.trim(),

            discount:
              discount.trim(),

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
          error
        );

        alert(
          "❌ Failed to update offer"
        );
      } finally {
        setSaving(false);
      }
    };

  if (loading) {
    return (
      <BusinessProtected>

        <div className="flex min-h-screen items-center justify-center bg-slate-100">

          <div className="rounded-3xl bg-white p-10 shadow-xl">

            <h2 className="text-2xl font-bold text-green-700">
              Loading Offer...
            </h2>

          </div>

        </div>

      </BusinessProtected>
    );
  }

  return (
    <BusinessProtected>

      <main className="min-h-screen bg-slate-100 p-6">

        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-xl">

          {/* HEADER */}

          <div className="mb-8 flex items-center justify-between gap-4">

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
              ✏️ Edit Offer
            </h1>

            <button
              onClick={() =>
                router.push(
                  "/business/my-offers"
                )
              }
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              ← My Offers
            </button>

          </div>

          <div className="space-y-5">

            {/* TITLE */}

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

            {/* DISCOUNT */}

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

            {/* CATEGORY */}

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

              {/* CURRENT OLD CATEGORY */}

              {category &&
                !categories.includes(
                  category
                ) && (
                  <option
                    value={category}
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

            {/* DESCRIPTION */}

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
                Change Offer Image (Optional)
              </label>

              <input
                type="file"
                accept="image/*"
                className="w-full rounded-xl border border-gray-300 p-4"
                onChange={(e) => {

                  if (
                    !e.target.files?.length
                  ) {
                    return;
                  }

                  const file =
                    e.target.files[0];

                  setImageFile(
                    file
                  );

                  setPreview(
                    URL.createObjectURL(
                      file
                    )
                  );
                }}
              />

            </div>

            {preview && (
              <img
                src={preview}
                alt="Offer Preview"
                className="h-64 w-full rounded-xl object-cover"
              />
            )}

            {/* BUTTONS */}

            <div className="flex gap-4">

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/business/my-offers"
                  )
                }
                className="flex-1 rounded-xl border border-gray-300 bg-white py-4 text-lg font-bold hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={updateOffer}
                disabled={saving}
                className="flex-1 rounded-xl bg-green-600 py-4 text-lg font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Updating..."
                  : "💾 Save Changes"}
              </button>

            </div>

          </div>

        </div>

      </main>

    </BusinessProtected>
  );
}