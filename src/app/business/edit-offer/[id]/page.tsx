"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { v4 as uuid } from "uuid";

import BusinessProtected from "@/components/BusinessProtected";

import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export default function EditOffer({
  params,
}: {
  params: { id: string };
}) {
  const offerId = params.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Existing offer data is kept in Firestore.
  // Businesses only change the image and short description here.
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

      const snap = await getDoc(
        doc(db, "offers", offerId)
      );

      if (!snap.exists()) {
        alert("Offer Not Found");
        router.replace("/business/my-offers");
        return;
      }

      const data = snap.data();

      setDescription(data.description || "");
      setOldImage(data.image || "");
      setPreview(data.image || "");
    } catch (error) {
      console.error("Offer loading error:", error);
      alert("Failed to load offer");
      router.replace("/business/my-offers");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const updateOffer = async () => {
    const trimmedDescription = description.trim();

    if (!oldImage && !imageFile) {
      alert("Please upload an offer image.");
      return;
    }

    if (trimmedDescription.length > 250) {
      alert("Description should be 250 characters or less.");
      return;
    }

    try {
      setSaving(true);

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
          throw new Error("Image upload failed");
        }

        const uploaded = await upload.json();

        if (!uploaded.secure_url) {
          throw new Error("Image upload failed");
        }

        image = uploaded.secure_url;
      }

      // IMPORTANT:
      // Existing title, discount and category are NOT changed.
      await updateDoc(
        doc(db, "offers", offerId),
        {
          description: trimmedDescription,
          image,
        }
      );

      alert("✅ Offer Updated Successfully");
      router.replace("/business/my-offers");
    } catch (error) {
      console.error("Offer update error:", error);

      alert(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Failed to update offer"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <BusinessProtected>
        <main className="flex min-h-screen items-center justify-center bg-[#f5f3ed] p-6">
          <div className="rounded-[2rem] bg-white p-10 text-center shadow-xl">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-[#d4af37]" />
            <h2 className="mt-4 text-2xl font-black text-[#07111f]">
              Loading Offer...
            </h2>
          </div>
        </main>
      </BusinessProtected>
    );
  }

  return (
    <BusinessProtected>
      <main className="min-h-screen bg-[#f5f3ed] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_25px_80px_rgba(7,17,31,0.12)]">

            {/* HEADER */}
            <div className="bg-[#07111f] px-6 py-7 text-white sm:px-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f1cf63]">
                    SBC Business Portal
                  </p>

                  <h1 className="mt-2 text-3xl font-black">
                    ✏️ Edit Offer
                  </h1>

                  <p className="mt-1 text-sm text-white/55">
                    Update your offer image and short description.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push("/business/my-offers")
                  }
                  className="shrink-0 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/20"
                >
                  ← My Offers
                </button>
              </div>
            </div>

            {/* FORM */}
            <div className="space-y-6 p-6 sm:p-8">

              {/* OFFER IMAGE */}
              <div>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
                      Offer Image
                    </label>

                    <p className="mt-1 text-xs text-slate-400">
                      Put all important offer details inside this image.
                    </p>
                  </div>

                  <span className="rounded-full bg-[#fff8df] px-3 py-1 text-[10px] font-black text-[#8a680c]">
                    1200 × 800 recommended
                  </span>
                </div>

                <label className="group block cursor-pointer overflow-hidden rounded-[1.5rem] border-2 border-dashed border-[#d4af37]/35 bg-[#fbfaf6] transition hover:border-[#d4af37] hover:bg-[#fffdf5]">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Offer Preview"
                      className="h-72 w-full object-cover sm:h-96"
                    />
                  ) : (
                    <div className="flex h-72 flex-col items-center justify-center text-center sm:h-96">
                      <div className="text-5xl">🖼️</div>
                      <p className="mt-4 text-base font-black text-[#07111f]">
                        Upload Offer Image
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        JPG, PNG or WEBP
                      </p>
                    </div>
                  )}

                  <div className="border-t border-black/5 bg-white px-5 py-3 text-center text-sm font-black text-[#8a680c]">
                    📷 Change Offer Image
                  </div>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) =>
                      handleImageChange(
                        e.target.files?.[0] || null
                      )
                    }
                  />
                </label>
              </div>

              {/* SHORT DESCRIPTION */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
                    Short Description
                    <span className="ml-2 font-semibold normal-case tracking-normal text-slate-400">
                      Optional
                    </span>
                  </label>

                  <span className="text-[10px] font-bold text-slate-400">
                    {description.length}/250
                  </span>
                </div>

                <textarea
                  value={description}
                  maxLength={250}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Add a short note about this offer..."
                  className="h-28 w-full resize-none rounded-2xl border border-black/10 bg-[#fbfaf6] p-4 text-sm font-medium text-[#07111f] outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Keep it short. The main offer details should be visible in the image.
                </p>
              </div>

              {/* INFO */}
              <div className="rounded-2xl border border-[#d4af37]/20 bg-[#fffdf5] p-4">
                <p className="text-sm font-black text-[#8a680c]">
                  💡 Offer display
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Students will see your offer image, business name, full address and redemption usage. Your existing offer title, category and other saved information will remain unchanged.
                </p>
              </div>

              {/* BUTTONS */}
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    router.push("/business/my-offers")
                  }
                  disabled={saving}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={updateOffer}
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-[#d4af37] py-3.5 text-sm font-black text-[#07111f] shadow-lg transition hover:bg-[#f1cf63] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "⏳ Saving..."
                    : "💾 Save Offer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </BusinessProtected>
  );
}
