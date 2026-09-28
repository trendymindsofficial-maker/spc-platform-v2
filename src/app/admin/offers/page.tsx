"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { v4 as uuid } from "uuid";

import AdminProtected from "@/components/AdminProtected";
import { db } from "@/lib/firebase";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

interface Offer {
  id: string;
  title: string;
  discount: string;
  category: string;
  businessName: string;
  status: string;
  description?: string;
  image?: string;
  desktopImage?: string;
  mobileImage?: string;
  displayPriority?: 1 | 2 | 3 | null;
}

interface Category {
  id: string;
  name: string;
}

type ModalMode = "view" | "edit" | null;

export default function AdminOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editDisplayPriority, setEditDisplayPriority] = useState<"" | "1" | "2" | "3">("");

  const [editDesktopImageFile, setEditDesktopImageFile] =
    useState<File | null>(null);
  const [editMobileImageFile, setEditMobileImageFile] =
    useState<File | null>(null);
  const [editDesktopPreview, setEditDesktopPreview] = useState("");
  const [editMobilePreview, setEditMobilePreview] = useState("");

  useEffect(() => {
    loadOffers();
    loadCategories();
  }, []);

  const loadOffers = async () => {
    try {
      setLoading(true);

      const snap = await getDocs(collection(db, "offers"));

      const data = snap.docs.map((item) => {
        const raw = item.data();

        return {
          id: item.id,
          title: raw.title || "",
          discount: raw.discount || "",
          category: raw.category || "",
          businessName: raw.businessName || "",
          status: raw.status || "active",
          description: raw.description || "",
          image: raw.image || "",
          desktopImage: raw.desktopImage || raw.image || "",
          mobileImage: raw.mobileImage || raw.image || "",
          displayPriority: raw.displayPriority === 1 || raw.displayPriority === 2 || raw.displayPriority === 3 ? raw.displayPriority : null,
        };
      }) as Offer[];

      setOffers(data);
    } catch (error) {
      console.error("Error loading offers:", error);
      alert("Unable to load offers.");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const snap = await getDocs(collection(db, "categories"));

      const data = snap.docs
        .map((item) => {
          const raw = item.data();

          return {
            id: item.id,
            name: raw.name || raw.category || raw.title || "",
          };
        })
        .filter((item) => item.name.trim() !== "")
        .sort((a, b) => a.name.localeCompare(b.name));

      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const openView = (offer: Offer) => {
    setSelectedOffer(offer);
    setModalMode("view");
  };

  const openEdit = (offer: Offer) => {
    setSelectedOffer(offer);
    setEditTitle("SBC Offer");
    setEditDiscount(offer.discount || "");
    setEditCategory(offer.category || "");
    setEditDescription(offer.description || "");
    setEditStatus(offer.status || "active");
    setEditDisplayPriority(offer.displayPriority ? String(offer.displayPriority) as "1" | "2" | "3" : "");

    setEditDesktopImageFile(null);
    setEditMobileImageFile(null);
    setEditDesktopPreview(
      offer.desktopImage || offer.image || ""
    );
    setEditMobilePreview(
      offer.mobileImage || offer.image || ""
    );

    setModalMode("edit");
  };

  const closeModal = () => {
    if (saving) return;

    setSelectedOffer(null);
    setModalMode(null);
    setEditDesktopImageFile(null);
    setEditMobileImageFile(null);
    setEditDesktopPreview("");
    setEditMobilePreview("");
  };

  const optimizeImage = async (
    sourceFile: File,
    type: "desktop" | "mobile"
  ) => {
    const maxWidth = type === "desktop" ? 1920 : 675;
    const maxHeight = type === "desktop" ? 675 : 950;

    const objectUrl = URL.createObjectURL(sourceFile);

    try {
      const imageElement = new Image();

      await new Promise<void>((resolve, reject) => {
        imageElement.onload = () => resolve();
        imageElement.onerror = () =>
          reject(new Error("Unable to read the selected image."));
        imageElement.src = objectUrl;
      });

      const scale = Math.min(
        1,
        maxWidth / imageElement.naturalWidth,
        maxHeight / imageElement.naturalHeight
      );

      const width = Math.max(
        1,
        Math.round(imageElement.naturalWidth * scale)
      );
      const height = Math.max(
        1,
        Math.round(imageElement.naturalHeight * scale)
      );

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Image optimization is not supported.");
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(imageElement, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (result) => resolve(result),
          "image/webp",
          0.85
        );
      });

      if (!blob) {
        throw new Error("Failed to optimize image.");
      }

      return new File(
        [blob],
        `${sourceFile.name.replace(/\.[^/.]+$/, "")}.webp`,
        {
          type: "image/webp",
          lastModified: Date.now(),
        }
      );
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const uploadOptimizedImage = async (
    sourceFile: File,
    type: "desktop" | "mobile"
  ) => {
    const optimizedFile = await optimizeImage(sourceFile, type);

    const formData = new FormData();
    formData.append("file", optimizedFile);
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

    return uploaded.secure_url as string;
  };

  const saveOffer = async () => {
    if (!selectedOffer) return;

    const title = "SBC Offer";
    const discount = editDiscount.trim();
    const category = editCategory.trim();
    const description = editDescription.trim();
    const status = editStatus.trim() || "active";
    const displayPriority = editDisplayPriority ? Number(editDisplayPriority) as 1 | 2 | 3 : null;

    if (!title || !discount || !category) {
      alert("Please fill Offer Title, Discount and Category.");
      return;
    }

    try {
      setSaving(true);

      // Only one offer can occupy each priority slot (1, 2, 3).
      if (displayPriority !== null) {
        const duplicate = offers.find(
          (offer) =>
            offer.id !== selectedOffer.id &&
            offer.displayPriority === displayPriority
        );
        if (duplicate) {
          alert(`Priority ${displayPriority} is already assigned to "${duplicate.businessName || duplicate.title}". Please choose another priority or set it to Random.`);
          setSaving(false);
          return;
        }
      }

      let desktopImage =
        selectedOffer.desktopImage ||
        selectedOffer.image ||
        "";
      let mobileImage =
        selectedOffer.mobileImage ||
        selectedOffer.image ||
        "";

      if (editDesktopImageFile) {
        desktopImage = await uploadOptimizedImage(
          editDesktopImageFile,
          "desktop"
        );
      }

      if (editMobileImageFile) {
        mobileImage = await uploadOptimizedImage(
          editMobileImageFile,
          "mobile"
        );
      }

      await updateDoc(doc(db, "offers", selectedOffer.id), {
        title,
        discount,
        category,
        description,
        status,
        displayPriority,
        image: desktopImage,
        desktopImage,
        mobileImage,
      });

      const updatedOffer: Offer = {
        ...selectedOffer,
        title,
        discount,
        category,
        description,
        status,
        displayPriority,
        image: desktopImage,
        desktopImage,
        mobileImage,
      };

      setOffers((current) =>
        current.map((offer) =>
          offer.id === selectedOffer.id ? updatedOffer : offer
        )
      );

      setSelectedOffer(updatedOffer);
      setModalMode("view");
      setEditDesktopImageFile(null);
      setEditMobileImageFile(null);

      alert("Offer updated successfully.");
    } catch (error) {
      console.error("Error updating offer:", error);
      alert("Unable to update offer.");
    } finally {
      setSaving(false);
    }
  };

  const deleteOffer = async (id: string, title: string) => {
    const ok = window.confirm(
      `Delete "${title}"?\n\nThis action cannot be undone.`
    );

    if (!ok) return;

    try {
      await deleteDoc(doc(db, "offers", id));

      setOffers((current) =>
        current.filter((offer) => offer.id !== id)
      );

      if (selectedOffer?.id === id) {
        setSelectedOffer(null);
        setModalMode(null);
      }

      alert("Offer deleted successfully.");
    } catch (error) {
      console.error("Error deleting offer:", error);
      alert("Unable to delete offer.");
    }
  };

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return offers.filter((offer) => {
      const matchesSearch =
        !query ||
        offer.title?.toLowerCase().includes(query) ||
        offer.businessName?.toLowerCase().includes(query) ||
        offer.category?.toLowerCase().includes(query) ||
        offer.discount?.toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "All" ||
        offer.category?.toLowerCase() === categoryFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "All" ||
        offer.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [offers, search, categoryFilter, statusFilter]);

  const activeCount = offers.filter(
    (offer) => offer.status?.toLowerCase() === "active"
  ).length;

  return (
    <AdminProtected>
      <main className="min-h-screen bg-[#f5f3ed] text-[#07111f]">
        <div className="mx-auto max-w-[1450px] px-4 py-6 sm:px-6 lg:px-8">

          {/* HEADER */}
          <div className="mb-6 overflow-hidden rounded-[30px] bg-[#07111f] shadow-[0_20px_60px_rgba(7,17,31,0.14)]">
            <div className="relative px-6 py-7 sm:px-8">
              <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#d4af37]/10 blur-3xl" />

              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-3xl ring-1 ring-white/10">
                    🎁
                  </div>

                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#d4af37]/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#f1cf63] ring-1 ring-[#d4af37]/20">
                        SBC Admin
                      </span>

                      <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-white/60">
                        {offers.length} Offers
                      </span>
                    </div>

                    <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                      Offer Management
                    </h1>

                    <p className="mt-1 text-sm text-white/50">
                      View, search, edit and manage all SBC offers.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    href="/admin/dashboard"
                    className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
                  >
                    ← Dashboard
                  </Link>

                  <Link
                    href="/admin/add-offer"
                    className="rounded-2xl bg-[#d4af37] px-5 py-3 text-center text-sm font-black text-[#07111f] shadow-lg transition hover:bg-[#f1cf63]"
                  >
                    + Add Offer
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* STATS */}
          {!loading && (
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_12px_40px_rgba(7,17,31,0.06)]">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Total Offers
                </p>
                <p className="mt-2 text-3xl font-black text-[#07111f]">
                  {offers.length}
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                  Active Offers
                </p>
                <p className="mt-2 text-3xl font-black text-emerald-700">
                  {activeCount}
                </p>
              </div>

              <div className="rounded-3xl border border-[#d4af37]/20 bg-[#fff8df] p-5">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#a37b0d]">
                  Showing
                </p>
                <p className="mt-2 text-3xl font-black text-[#8a680c]">
                  {filteredOffers.length}
                </p>
              </div>
            </div>
          )}

          {/* SEARCH / FILTER */}
          <div className="mb-6 rounded-3xl border border-black/5 bg-white p-5 shadow-[0_12px_40px_rgba(7,17,31,0.06)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b18a16]">
              Offer Directory
            </p>

            <h2 className="mt-1 text-lg font-black">
              Search & Filter
            </h2>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px_180px]">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                  🔍
                </span>

                <input
                  type="text"
                  placeholder="Search offer, business, category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-[#fbfaf6] py-3.5 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-[#fbfaf6] px-4 py-3.5 text-sm font-bold outline-none focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10"
              >
                <option value="All">All Categories</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-[#fbfaf6] px-4 py-3.5 text-sm font-bold outline-none focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10"
              >
                <option value="All">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* OFFERS */}
          {loading ? (
            <div className="rounded-[28px] bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#d4af37]" />
              <h2 className="text-lg font-black">
                Loading Offers...
              </h2>
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff8df] text-3xl">
                🎁
              </div>

              <h2 className="mt-5 text-xl font-black">
                No Offers Found
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Try another search or filter.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredOffers.map((offer) => {
                const isActive =
                  offer.status?.toLowerCase() === "active";

                return (
                  <div
                    key={offer.id}
                    className="group overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_15px_50px_rgba(7,17,31,0.07)] transition hover:-translate-y-1 hover:shadow-[0_25px_65px_rgba(7,17,31,0.11)]"
                  >
                    {/* IMAGE / TOP */}
                    <div className="relative h-44 overflow-hidden bg-[#07111f]">
                      {(offer.desktopImage || offer.image) ? (
                        <img
                          src={offer.desktopImage || offer.image}
                          alt={offer.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#07111f] to-[#1b2c40] text-5xl">
                          🎁
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      <span
                        className={`absolute right-4 top-4 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                          isActive
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-700 text-white"
                        }`}
                      >
                        {isActive
                          ? "ACTIVE"
                          : (offer.status || "inactive").toUpperCase()}
                      </span>

                      <span className="absolute bottom-4 left-4 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#07111f]">
                        {offer.category || "Other"}
                      </span>
                    </div>

                    {/* CARD */}
                    <div className="flex min-h-[310px] flex-col p-5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#b18a16]">
                        🏪 {offer.businessName || "SBC Partner"}
                      </p>

                      <h2 className="mt-2 line-clamp-2 min-h-[52px] text-xl font-black leading-tight text-[#07111f]">
                        {offer.title || "Untitled Offer"}
                      </h2>

                      <p className="mt-2 text-2xl font-black text-[#b18a16]">
                        {offer.discount || "-"}
                      </p>

                      <p className="mt-3 line-clamp-3 min-h-[60px] text-sm leading-5 text-slate-500">
                        {offer.description || "No description available."}
                      </p>

                      <div className="flex-1" />

                      <div className="my-5 border-t border-black/5" />

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => openView(offer)}
                          className="rounded-xl border border-slate-200 bg-white py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                        >
                          👁 View
                        </button>

                        <button
                          type="button"
                          onClick={() => openEdit(offer)}
                          className="rounded-xl bg-[#07111f] py-3 text-xs font-black text-white transition hover:bg-[#101d2e]"
                        >
                          ✏️ Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteOffer(offer.id, offer.title)
                          }
                          className="rounded-xl border border-red-100 bg-red-50 py-3 text-xs font-black text-red-600 transition hover:bg-red-100"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && filteredOffers.length > 0 && (
            <div className="mt-7 rounded-[28px] bg-[#07111f] p-6 text-white shadow-[0_20px_60px_rgba(7,17,31,0.14)]">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d4af37]">
                Offer Overview
              </p>

              <div className="mt-1 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">
                    Showing {filteredOffers.length} of {offers.length} offers
                  </h2>
                  <p className="mt-1 text-sm text-white/45">
                    Manage all SBC partner offers from one place.
                  </p>
                </div>

                <div className="flex h-14 min-w-14 items-center justify-center rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-4">
                  <span className="text-2xl font-black text-[#f1cf63]">
                    {filteredOffers.length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* VIEW / EDIT MODAL */}
        {selectedOffer && modalMode && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">

              {/* MODAL HEADER */}
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff8df] text-xl">
                    {modalMode === "edit" ? "✏️" : "🎁"}
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-[#07111f]">
                      {modalMode === "edit"
                        ? "Edit Offer"
                        : "Offer Details"}
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {modalMode === "edit"
                        ? "Update offer information."
                        : "Complete offer information."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-500 hover:bg-slate-200 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
                {modalMode === "view" ? (
                  <div className="space-y-5">

                    {(selectedOffer.desktopImage || selectedOffer.image) && (
                      <div className="overflow-hidden rounded-3xl bg-[#07111f]">
                        <img
                          src={selectedOffer.desktopImage || selectedOffer.image}
                          alt={selectedOffer.title}
                          className="h-56 w-full object-cover"
                        />
                      </div>
                    )}

                    <div>
                      <span className="rounded-full bg-[#07111f] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white">
                        {selectedOffer.category || "Other"}
                      </span>

                      <h3 className="mt-4 text-2xl font-black text-[#07111f]">
                        {selectedOffer.title}
                      </h3>

                      <p className="mt-2 text-2xl font-black text-[#b18a16]">
                        {selectedOffer.discount || "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Partner Business
                      </p>

                      <p className="mt-1 text-base font-black text-slate-800">
                        🏪 {selectedOffer.businessName || "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Description
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {selectedOffer.description || "No description available."}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Status
                        </p>

                        <p
                          className={`mt-2 text-sm font-black uppercase ${
                            selectedOffer.status?.toLowerCase() === "active"
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {selectedOffer.status || "active"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Offer ID
                        </p>

                        <p className="mt-2 break-all text-xs font-bold text-slate-600">
                          {selectedOffer.id}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => openEdit(selectedOffer)}
                        className="rounded-2xl bg-[#07111f] py-3.5 text-sm font-black text-white hover:bg-[#101d2e]"
                      >
                        ✏️ Edit Offer
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteOffer(
                            selectedOffer.id,
                            selectedOffer.title
                          )
                        }
                        className="rounded-2xl bg-red-50 py-3.5 text-sm font-black text-red-600 hover:bg-red-100"
                      >
                        🗑 Delete Offer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">

                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Offer Title
                      </label>

                      <input
                        value="SBC Offer"
                        readOnly
                        className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3.5 text-sm font-semibold text-slate-600 outline-none"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Discount
                        </label>

                        <input
                          value={editDiscount}
                          onChange={(e) => setEditDiscount(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold outline-none focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Status
                        </label>

                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold outline-none focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Category
                      </label>

                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold outline-none focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
                      >
                        <option value="">Select Category</option>

                        {categories.map((category) => (
                          <option
                            key={category.id}
                            value={category.name}
                          >
                            {category.name}
                          </option>
                        ))}

                        {/* Preserve an old category if it no longer exists */}
                        {editCategory &&
                          !categories.some(
                            (category) =>
                              category.name.toLowerCase() ===
                              editCategory.toLowerCase()
                          ) && (
                            <option value={editCategory}>
                              {editCategory}
                            </option>
                          )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Display Priority
                      </label>
                      <select
                        value={editDisplayPriority}
                        onChange={(e) => setEditDisplayPriority(e.target.value as "" | "1" | "2" | "3")}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold outline-none focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
                      >
                        <option value="">Random</option>
                        <option value="1">1st Offer</option>
                        <option value="2">2nd Offer</option>
                        <option value="3">3rd Offer</option>
                      </select>
                      <p className="mt-1 text-[10px] font-semibold text-slate-400">
                        Optional. If not set, this offer is randomized for students.
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Description
                      </label>

                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={5}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold leading-6 outline-none focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
                      />
                    </div>

                    {/* OFFER IMAGES */}
                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Offer Images
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Upload separate Desktop and Mobile images. Images are automatically resized and converted to WebP at 85% quality before Cloudinary upload.
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* DESKTOP */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Desktop Image
                            <span className="ml-1 text-slate-400">
                              (1920×675)
                            </span>
                          </label>

                          {editDesktopPreview && (
                            <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                              <img
                                src={editDesktopPreview}
                                alt="Desktop offer preview"
                                className="h-32 w-full object-cover"
                              />
                            </div>
                          )}

                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => {
                              const file =
                                e.target.files?.[0] || null;
                              if (!file) return;

                              setEditDesktopImageFile(file);
                              setEditDesktopPreview(
                                URL.createObjectURL(file)
                              );
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-[#fbfaf6] p-2 text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#07111f] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
                          />

                          <p className="mt-2 text-[10px] font-semibold text-slate-400">
                            Recommended: 1920×675
                          </p>
                        </div>

                        {/* MOBILE */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Mobile Image
                            <span className="ml-1 text-slate-400">
                              (675×950)
                            </span>
                          </label>

                          {editMobilePreview && (
                            <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                              <img
                                src={editMobilePreview}
                                alt="Mobile offer preview"
                                className="h-32 w-full object-contain"
                              />
                            </div>
                          )}

                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => {
                              const file =
                                e.target.files?.[0] || null;
                              if (!file) return;

                              setEditMobileImageFile(file);
                              setEditMobilePreview(
                                URL.createObjectURL(file)
                              );
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-[#fbfaf6] p-2 text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#07111f] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
                          />

                          <p className="mt-2 text-[10px] font-semibold text-slate-400">
                            Recommended: 675×950
                          </p>
                        </div>
                      </div>
                    </div>



                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Partner Business
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-800">
                        🏪 {selectedOffer.businessName || "-"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Business is kept unchanged while editing the offer.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setModalMode("view")}
                        disabled={saving}
                        className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={saveOffer}
                        disabled={saving}
                        className="flex-1 rounded-2xl bg-[#d4af37] py-3.5 text-sm font-black text-[#07111f] hover:bg-[#f1cf63] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? "⏳ Saving..." : "💾 Save Changes"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </AdminProtected>
  );
}