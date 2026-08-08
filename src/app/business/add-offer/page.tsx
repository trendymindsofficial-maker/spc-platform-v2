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
} from "firebase/firestore";

export default function AddOffer() {

  const router = useRouter();

  const [title, setTitle] = useState("");
  const [discount, setDiscount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [preview, setPreview] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [businessName, setBusinessName] =
    useState("");

  useEffect(() => {

    loadBusiness();

  }, []);

  const loadBusiness = async () => {

    const user = auth.currentUser;

    if (!user) return;

    const snap = await getDoc(
      doc(db, "businesses", user.uid)
    );

    if (snap.exists()) {

      setBusinessName(
        snap.data().businessName || ""
      );

    }

  };

  const saveOffer = async () => {

    if (
      !title ||
      !discount ||
      !description ||
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
        throw new Error("Image upload failed");
      }

      await addDoc(
        collection(db, "offers"),
        {
          businessId: user.uid,
          businessName,

          title,
          discount,
          description,
          category,

          image: uploaded.secure_url,

          status: "active",

          createdAt: serverTimestamp(),
        }
      );

      alert("✅ Offer Added Successfully");

      router.replace("/business/dashboard");

    } catch (error) {

      console.error(error);

      alert("❌ Failed to save offer");

    } finally {

      setLoading(false);

    }

  };

  return (

    <BusinessProtected>

      <main className="min-h-screen bg-slate-100 p-6">

        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-xl">

          <div className="mb-8 flex items-center justify-between">

            <button
              onClick={() =>
                router.push("/business/dashboard")
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

          <div className="space-y-5">
                        <input
              type="text"
              placeholder="Offer Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600"
            />

            <input
              type="text"
              placeholder="Discount (Example: 20% OFF)"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600"
            >
              <option value="">Select Category</option>
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

            <textarea
              placeholder="Offer Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-36 w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-600"
            />

            <div>

              <label className="mb-2 block font-semibold">
                Offer Image
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {

                  if (!e.target.files?.length) return;

                  const file = e.target.files[0];

                  setImageFile(file);

                  setPreview(
                    URL.createObjectURL(file)
                  );

                }}
                className="w-full rounded-xl border border-gray-300 p-4"
              />

            </div>

            {preview && (

              <img
                src={preview}
                alt="Offer Preview"
                className="h-64 w-full rounded-xl object-cover"
              />

            )}
                        <div className="flex gap-4">

              <button
                type="button"
                onClick={() =>
                  router.push("/business/dashboard")
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

        </div>

      </main>

    </BusinessProtected>

  );

}