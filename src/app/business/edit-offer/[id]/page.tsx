"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";

import BusinessProtected from "@/components/BusinessProtected";
import { auth, db } from "@/lib/firebase";

import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

interface EditOfferProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditOffer({
  params,
}: EditOfferProps) {
  const router = useRouter();
  const { id: offerId } = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [description, setDescription] = useState("");
  const [oldImage, setOldImage] = useState("");
  const [preview, setPreview] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (!offerId) {
      router.replace("/business/my-offers");
      return;
    }

    loadOffer();
  }, [offerId]);

  const loadOffer = async () => {
    try {
      setLoading(true);

      const user = auth.currentUser;

      if (!user) {
        router.replace("/business/login");
        return;
      }

      const offerRef = doc(db, "offers", offerId);
      const offerSnap = await getDoc(offerRef);

      if (!offerSnap.exists()) {
        alert("❌ Offer Not Found");
        router.replace("/business/my-offers");
        return;
      }

      const data = offerSnap.data();

      if (data.businessId !== user.uid) {
        alert("❌ You are not authorized to edit this offer.");
        router.replace("/business/my-offers");
        return;
      }

      setDescription(String(data.description || ""));
      setOldImage(data.image || "");
      setPreview(data.image || "");
    } catch (error) {
      console.error("Offer loading error:", error);

      alert("❌ Failed to load offer.");
      router.replace("/business/my-offers");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("❌ Please select an image file.");
      return;
    }

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const updateOffer = async () => {
    if (!description.trim()) {
      alert("Please enter an offer description.");
      return;
    }

    if (!imageFile && !oldImage) {
      alert("Please upload an offer image.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      alert("❌ Business login required.");
      return;
    }

    try {
      setSaving(true);

      const offerRef = doc(db, "offers", offerId);
      const offerSnap = await getDoc(offerRef);

      if (!offerSnap.exists()) {
        alert("❌ Offer not found.");
        return;
      }

      const currentData = offerSnap.data();

      if (currentData.businessId !== user.uid) {
        alert("❌ You are not authorized to edit this offer.");
        return;
      }

      let image = oldImage;

      if (imageFile) {
        const formData = new FormData();

        formData.append("file", imageFile);
        formData.append("upload_preset", "spc_offers");
        formData.append("public_id", uuid());

        const upload = await fetch(
          "https://api.cloudinary.com/v1_1/vwyjcwb2/image/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!upload.ok) {
          throw new Error("Cloudinary upload failed.");
        }

        const uploaded = await upload.json();

        if (!uploaded.secure_url) {
          throw new Error("Image upload failed.");
        }

        image = uploaded.secure_url;
      }

      await updateDoc(offerRef, {
        description: description.trim(),
        image,
      });

      alert("✅ Offer Updated Successfully");
      router.replace("/business/my-offers");
    } catch (error) {
      console.error("Offer update error:", error);

      alert(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Failed to update offer."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <BusinessProtected>
        <main className="flex min-h-screen items-center justify-center bg-[#f5f7f4] p-6">
          <div className="w-full max-w-sm rounded-3xl bg-white p-10 text-center shadow-xl">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />

            <h2 className="text-xl font-black text-green-700">
              Loading Offer...
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Please wait...
            </p>
          </div>
        </main>
      </BusinessProtected>
    );
  }

  return (
    <BusinessProtected>
      <main className="min-h-screen bg-[#f5f7f4] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-xl">
          <div className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_20px_70px_rgba(0,0,0,0.10)]">

            <div className="border-b border-black/5 bg-[#07111f] px-6 py-6 text-white sm:px-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d4af37]">
                    SBC Business
                  </p>

                  <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                    ✏️ Edit Offer
                  </h1>

                  <p className="mt-1 text-sm text-white/50">
                    Update your offer image and description.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push("/business/my-offers")
                  }
                  disabled={saving}
                  className="shrink-0 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-50"
                >
                  ← Back
                </button>
              </div>
            </div>

            <div className="space-y-7 p-6 sm:p-8">

              <div>
                <div className="mb-2">
                  <label className="text-sm font-black text-gray-800">
                    Offer Description
                  </label>
                </div>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Briefly describe your offer..."
                  disabled={saving}
                  className="min-h-36 w-full resize-y rounded-2xl border border-gray-200 bg-[#fafbf9] p-4 text-sm font-medium leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10 disabled:bg-gray-100"
                />

                <p className="mt-2 text-xs text-gray-400">
                  Add the important details students should know.
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-black text-gray-800">
                    Offer Image
                  </label>

                  <span className="text-xs font-semibold text-gray-400">
                    Required
                  </span>
                </div>

                <label className="flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-[#fafbf9] px-5 py-8 text-center transition hover:border-[#d4af37] hover:bg-[#fffdf5]">
                  <div>
                    <div className="text-3xl">🖼️</div>

                    <p className="mt-2 text-sm font-black text-gray-700">
                      Change Offer Image
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Click to choose a new image
                    </p>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageChange(
                        e.target.files?.[0] || null
                      )
                    }
                    disabled={saving}
                    className="hidden"
                  />
                </label>
              </div>

              {preview && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-black text-gray-800">
                      Image Preview
                    </p>

                    <span className="text-xs font-semibold text-green-600">
                      ✓ Ready
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                    <img
                      src={preview}
                      alt="Offer Preview"
                      className="aspect-[16/9] w-full object-cover"
                    />
                  </div>

                  <p className="mt-2 text-center text-xs text-gray-400">
                    Recommended image ratio: 16:9
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-[#d4af37]/20 bg-[#fffdf5] p-4">
                <p className="text-sm font-black text-[#8a680c]">
                  💡 Offer Display
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Students will see your offer image and description
                  in a fixed-size offer card.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    router.push("/business/my-offers")
                  }
                  disabled={saving}
                  className="flex-1 rounded-2xl border border-gray-200 bg-white py-4 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={updateOffer}
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-[#d4af37] py-4 text-sm font-black text-[#07111f] shadow-lg transition hover:bg-[#f1cf63] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "⏳ Updating..."
                    : "💾 Save Changes"}
                </button>
              </div>
            </div>

            <div className="border-t border-black/5 bg-[#fafbf9] px-6 py-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
                Student Benefit Card • SBC
              </p>
            </div>
          </div>
        </div>
      </main>
    </BusinessProtected>
  );
}
