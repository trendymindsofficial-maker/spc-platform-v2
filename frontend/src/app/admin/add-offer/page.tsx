"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";

import AdminProtected from "@/components/AdminProtected";
import { db } from "@/lib/firebase";

import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

interface Business {
  id: string;
  businessName: string;
  mobile?: string;
  address?: string;
  status?: string;
}

interface Category {
  id: string;
  name: string;
}

export default function AdminAddOffer() {
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [businessId, setBusinessId] = useState("");
  const [title] = useState("SBC Offer");
  const [discount, setDiscount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [googleReviewLink, setGoogleReviewLink] = useState("");
  const [displayPriority, setDisplayPriority] = useState<"" | "1" | "2" | "3">("");

  const [desktopImageFile, setDesktopImageFile] = useState<File | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState("");
  const [mobilePreview, setMobilePreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [businessSnap, categorySnap] = await Promise.all([
        getDocs(collection(db, "businesses")),
        getDocs(collection(db, "categories")),
      ]);

      const businessData = businessSnap.docs
        .map((item) => {
          const data = item.data();

          return {
            id: item.id,
            businessName:
              data.businessName ||
              data.name ||
              "SBC Partner Business",
            mobile:
              data.mobile ||
              data.phone ||
              data.businessMobile ||
              "",
            address:
              data.address ||
              data.businessAddress ||
              data.location ||
              data.fullAddress ||
              "",
            status: data.status || "",
          };
        })
        .filter(
          (item) =>
            String(item.status).toLowerCase() === "approved"
        )
        .sort((a, b) =>
          a.businessName.localeCompare(b.businessName)
        );

      const categoryData = categorySnap.docs
        .map((item) => {
          const data = item.data();

          return {
            id: item.id,
            name:
              data.name ||
              data.category ||
              data.title ||
              "",
          };
        })
        .filter((item) => item.name.trim() !== "")
        .sort((a, b) =>
          a.name.localeCompare(b.name)
        );

      setBusinesses(businessData);
      setCategories(categoryData);
    } catch (error) {
      console.error("Admin add offer loading error:", error);
      alert("Unable to load businesses and categories.");
    } finally {
      setLoading(false);
    }
  };

  const optimizeImage = (
    file: File,
    maxWidth: number,
    maxHeight: number
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);

        const scale = Math.min(
          1,
          maxWidth / image.naturalWidth,
          maxHeight / image.naturalHeight
        );

        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Unable to process image."));
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Unable to optimize image."));
              return;
            }

            resolve(
              new File(
                [blob],
                `${file.name.replace(/\.[^/.]+$/, "")}.webp`,
                { type: "image/webp", lastModified: Date.now() }
              )
            );
          },
          "image/webp",
          0.85
        );
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to read image."));
      };

      image.src = objectUrl;
    });
  };

  const handleDesktopImageChange = async (file: File | null) => {
    if (!file) return;
    try {
      const optimized = await optimizeImage(file, 1920, 675);
      setDesktopImageFile(optimized);
      const previewUrl = URL.createObjectURL(optimized);
      setDesktopPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return previewUrl;
      });
    } catch (error) {
      console.error("Desktop image optimization error:", error);
      alert("Unable to process the desktop image.");
    }
  };

  const handleMobileImageChange = async (file: File | null) => {
    if (!file) return;
    try {
      const optimized = await optimizeImage(file, 675, 950);
      setMobileImageFile(optimized);
      const previewUrl = URL.createObjectURL(optimized);
      setMobilePreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return previewUrl;
      });
    } catch (error) {
      console.error("Mobile image optimization error:", error);
      alert("Unable to process the mobile image.");
    }
  };

  const saveOffer = async () => {
    if (!businessId) {
      alert("Please select a business.");
      return;
    }

    if (!discount.trim()) {
      alert("Please enter the discount.");
      return;
    }

    if (!category) {
      alert("Please select a category.");
      return;
    }

    if (!description.trim()) {
      alert("Please enter the offer description.");
      return;
    }

    const selectedBusiness = businesses.find(
      (item) => item.id === businessId
    );

    if (!selectedBusiness) {
      alert("Selected business was not found.");
      return;
    }

    try {
      setSaving(true);

      // Priority is optional. If selected, each slot (1/2/3) can belong to only one offer.
      if (displayPriority) {
        const priorityQuery = query(
          collection(db, "offers"),
          where("displayPriority", "==", Number(displayPriority))
        );
        const prioritySnap = await getDocs(priorityQuery);
        if (!prioritySnap.empty) {
          alert(`Priority ${displayPriority} is already assigned to another offer. Please choose another priority or Random.`);
          return;
        }
      }

      // Preserve the existing SBC rule:
      // one active offer per business.
      const activeOfferQuery = query(
        collection(db, "offers"),
        where("businessId", "==", businessId),
        where("status", "==", "active")
      );

      const activeOfferSnap = await getDocs(activeOfferQuery);

      if (!activeOfferSnap.empty) {
        alert(
          "This business already has an active offer.\n\nPlease edit or replace the existing offer instead."
        );
        return;
      }

      const uploadToCloudinary = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "spc_offers");
        formData.append("public_id", uuid());

        const upload = await fetch(
          "https://api.cloudinary.com/v1_1/vwyjcwb2/image/upload",
          { method: "POST", body: formData }
        );

        if (!upload.ok) throw new Error("Cloudinary upload failed.");

        const uploaded = await upload.json();
        if (!uploaded.secure_url) throw new Error("Image upload failed.");

        return uploaded.secure_url as string;
      };

      let image = "";
      let desktopImage = "";
      let mobileImage = "";

      if (desktopImageFile) {
        desktopImage = await uploadToCloudinary(desktopImageFile);
        image = desktopImage;
      }

      if (mobileImageFile) {
        mobileImage = await uploadToCloudinary(mobileImageFile);
      }

      await addDoc(collection(db, "offers"), {
        title: title.trim(),
        discount: discount.trim(),
        category,
        description: description.trim(),
        image,
        desktopImage,
        mobileImage,
        businessId: selectedBusiness.id,
        businessName: selectedBusiness.businessName,
        businessMobile: selectedBusiness.mobile || "",
        businessAddress: selectedBusiness.address || "",
        googleReviewLink: googleReviewLink.trim(),
        status: "active",
        displayPriority: displayPriority ? Number(displayPriority) : null,
        createdAt: serverTimestamp(),
      });

      alert("Offer added successfully.");
      router.replace("/admin/offers");
    } catch (error) {
      console.error("Admin offer creation error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to add offer."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminProtected>
        <main className="flex min-h-screen items-center justify-center bg-[#f5f3ed] p-6">
          <div className="rounded-[28px] bg-white p-10 text-center shadow-[0_25px_80px_rgba(7,17,31,0.12)]">
            <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-[#d4af37]" />

            <h2 className="text-xl font-black text-[#07111f]">
              Loading Add Offer...
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Loading approved businesses and categories.
            </p>
          </div>
        </main>
      </AdminProtected>
    );
  }

  return (
    <AdminProtected>
      <main className="min-h-screen bg-[#f5f3ed] p-4 md:p-8">
        <div className="mx-auto max-w-3xl">

          {/* HEADER */}
          <div className="mb-5 overflow-hidden rounded-[28px] bg-[#07111f] shadow-[0_20px_60px_rgba(7,17,31,0.14)]">
            <div className="px-6 py-7 md:px-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f1cf63]">
                    SBC Admin Portal
                  </p>

                  <h1 className="mt-2 text-3xl font-black text-white">
                    + Add Offer
                  </h1>

                  <p className="mt-1 text-sm text-white/50">
                    Create an offer for an approved SBC partner business.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/admin/offers")}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
                >
                  ← Offers
                </button>
              </div>
            </div>
          </div>

          {/* FORM */}
          <div className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_20px_60px_rgba(7,17,31,0.08)]">
            <div className="space-y-5 p-6 md:p-8">

              <div className="grid gap-5 sm:grid-cols-2">

                {/* BUSINESS */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Business
                  </label>

                  <select
                    value={businessId}
                    onChange={(e) => setBusinessId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#fbfaf6] px-4 py-3.5 text-sm font-semibold text-[#07111f] outline-none transition focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
                  >
                    <option value="">Select Approved Business</option>

                    {businesses.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.businessName}
                      </option>
                    ))}
                  </select>

                  {businesses.length === 0 && (
                    <p className="mt-2 text-xs font-bold text-red-600">
                      No approved businesses available.
                    </p>
                  )}
                </div>

                {/* TITLE */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Offer Title
                  </label>

                  <input
                    type="text"
                    value="SBC Offer"
                    readOnly
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3.5 text-sm font-semibold text-[#07111f] outline-none"
                  />
                </div>

                {/* DISCOUNT */}
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Discount
                  </label>

                  <input
                    type="text"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="Example: 20% OFF"
                    className="w-full rounded-xl border border-slate-200 bg-[#fbfaf6] px-4 py-3.5 text-sm font-semibold text-[#07111f] outline-none placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
                  />
                </div>

                {/* CATEGORY */}
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Category
                  </label>

                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#fbfaf6] px-4 py-3.5 text-sm font-semibold text-[#07111f] outline-none focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
                  >
                    <option value="">Select Category</option>

                    {categories.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DISPLAY PRIORITY */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Display Priority
                  </label>

                  <select
                    value={displayPriority}
                    onChange={(e) => setDisplayPriority(e.target.value as "" | "1" | "2" | "3")}
                    className="w-full rounded-xl border border-slate-200 bg-[#fbfaf6] px-4 py-3.5 text-sm font-semibold text-[#07111f] outline-none focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
                  >
                    <option value="">Random</option>
                    <option value="1">1st Offer</option>
                    <option value="2">2nd Offer</option>
                    <option value="3">3rd Offer</option>
                  </select>

                  <p className="mt-1 text-[10px] font-semibold text-slate-400">
                    Optional. If not set, this offer will appear randomly for students.
                  </p>
                </div>

                {/* DESCRIPTION */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Offer Description
                  </label>

                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    placeholder="Describe the benefit and any important terms..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-[#fbfaf6] px-4 py-3.5 text-sm font-semibold leading-6 text-[#07111f] outline-none placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
                  />
                </div>

                {/* IMAGES */}
                <div className="sm:col-span-2">
                  <div className="mb-3">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
              {/* GOOGLE REVIEW LINK */}

              <div className="sm:col-span-2">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Google Review Link
                </label>
                <input
                  type="url"
                  value={googleReviewLink}
                  onChange={(e) => setGoogleReviewLink(e.target.value)}
                  placeholder="https://g.page/.../review"
                  className="w-full rounded-xl border border-slate-200 bg-[#fbfaf6] px-4 py-3.5 text-sm font-semibold text-[#07111f] outline-none transition focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
                />
                <p className="mt-2 text-xs font-semibold text-slate-400">
                  Optional. Leave empty if the business does not have a Google Review link yet.
                </p>
              </div>

                      Offer Images
                    </label>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Desktop: max 1920×675 • Mobile: max 675×950 • WebP 85% quality
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Desktop Image
                        <span className="ml-1 text-slate-400">(1920×675)</span>
                      </label>

                      {desktopPreview && (
                        <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          <img src={desktopPreview} alt="Desktop offer preview" className="h-32 w-full object-cover" />
                        </div>
                      )}

                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleDesktopImageChange(e.target.files?.[0] || null)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#07111f] file:px-3 file:py-2 file:font-bold file:text-white"
                      />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Mobile Image
                        <span className="ml-1 text-slate-400">(675×950)</span>
                      </label>

                      {mobilePreview && (
                        <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          <img src={mobilePreview} alt="Mobile offer preview" className="mx-auto h-32 max-w-full object-contain" />
                        </div>
                      )}

                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleMobileImageChange(e.target.files?.[0] || null)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#07111f] file:px-3 file:py-2 file:font-bold file:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push("/admin/offers")}
                  disabled={saving}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveOffer}
                  disabled={saving || businesses.length === 0}
                  className="flex-1 rounded-2xl bg-[#07111f] py-3.5 text-sm font-black text-[#f1cf63] shadow-lg transition hover:bg-[#101d2e] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-white"
                >
                  {saving ? "Saving Offer..." : "Save Offer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AdminProtected>
  );
}
