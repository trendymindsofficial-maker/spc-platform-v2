"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";

import AdminProtected from "@/components/AdminProtected";

import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";

interface Category {
  id: string;
  name: string;
  createdAt?: unknown;
}

export default function AdminDashboard() {
  const router = useRouter();

  const [students, setStudents] = useState(0);
  const [businesses, setBusinesses] = useState(0);

  const [pendingBusinesses, setPendingBusinesses] =
    useState(0);

  const [pendingStudents, setPendingStudents] =
    useState(0);

  const [offers, setOffers] = useState(0);
  const [redemptions, setRedemptions] = useState(0);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [newCategory, setNewCategory] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [categoryLoading, setCategoryLoading] =
    useState(true);

  const [addingCategory, setAddingCategory] =
    useState(false);

  const [deletingCategory, setDeletingCategory] =
    useState<string | null>(null);

  /*
   * ==========================================
   * LOAD DASHBOARD
   * ==========================================
   */

  useEffect(() => {
    loadDashboard();
    loadCategories();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      /*
       * TOTAL STUDENTS
       */

      const studentSnap = await getDocs(
        collection(db, "students")
      );

      /*
       * TOTAL BUSINESSES
       */

      const businessSnap = await getDocs(
        collection(db, "businesses")
      );

      /*
       * PENDING BUSINESSES
       */

      const pendingBusinessQuery = query(
        collection(db, "businesses"),
        where("status", "==", "pending")
      );

      const pendingBusinessSnap =
        await getDocs(
          pendingBusinessQuery
        );

      /*
       * PENDING STUDENTS
       */

      const pendingStudentQuery = query(
        collection(db, "students"),
        where("status", "==", "pending")
      );

      const pendingStudentSnap =
        await getDocs(
          pendingStudentQuery
        );

      /*
       * TOTAL OFFERS
       */

      const offerSnap = await getDocs(
        collection(db, "offers")
      );

      /*
       * TOTAL REDEMPTIONS
       */

      const redemptionSnap =
        await getDocs(
          collection(
            db,
            "redemptions"
          )
        );

      /*
       * UPDATE COUNTS
       */

      setStudents(
        studentSnap.size
      );

      setBusinesses(
        businessSnap.size
      );

      setPendingBusinesses(
        pendingBusinessSnap.size
      );

      setPendingStudents(
        pendingStudentSnap.size
      );

      setOffers(
        offerSnap.size
      );

      setRedemptions(
        redemptionSnap.size
      );

    } catch (error) {
      console.error(
        "Dashboard loading error:",
        error
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

  const loadCategories = async () => {
    try {
      setCategoryLoading(true);

      const snap = await getDocs(
        collection(db, "categories")
      );

      const data = snap.docs
        .map((item) => ({
          id: item.id,

          name:
            item.data().name || "",

          createdAt:
            item.data().createdAt,
        }))
        .filter(
          (category) =>
            category.name.trim() !== ""
        )
        .sort((a, b) =>
          a.name.localeCompare(b.name)
        );

      setCategories(data);

    } catch (error) {
      console.error(
        "Category loading error:",
        error
      );
    } finally {
      setCategoryLoading(false);
    }
  };

  /*
   * ==========================================
   * ADD CATEGORY
   * ==========================================
   */

  const handleAddCategory = async () => {
    const categoryName =
      newCategory.trim();

    if (!categoryName) {
      alert(
        "Please enter a category name."
      );

      return;
    }

    try {
      setAddingCategory(true);

      /*
       * CHECK DUPLICATE
       */

      const existingCategory =
        categories.find(
          (category) =>
            category.name
              .trim()
              .toLowerCase() ===
            categoryName.toLowerCase()
        );

      if (existingCategory) {
        alert(
          `"${categoryName}" already exists.`
        );

        return;
      }

      /*
       * SAVE CATEGORY
       */

      const categoryRef =
        await addDoc(
          collection(
            db,
            "categories"
          ),
          {
            name: categoryName,

            createdAt:
              serverTimestamp(),
          }
        );

      /*
       * UPDATE UI
       */

      setCategories((current) =>
        [
          ...current,

          {
            id: categoryRef.id,
            name: categoryName,
          },
        ].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );

      setNewCategory("");

      alert(
        `"${categoryName}" category added successfully.`
      );

    } catch (error) {
      console.error(
        "Add category error:",
        error
      );

      alert(
        "Unable to add category. Please try again."
      );

    } finally {
      setAddingCategory(false);
    }
  };

  /*
   * ==========================================
   * DELETE CATEGORY
   * ==========================================
   */

  const handleDeleteCategory = async (
    category: Category
  ) => {
    const ok =
      window.confirm(
        `Delete "${category.name}" category?\n\nThis will remove it from the category list. Existing businesses and offers will NOT be deleted.`
      );

    if (!ok) {
      return;
    }

    try {
      setDeletingCategory(
        category.id
      );

      await deleteDoc(
        doc(
          db,
          "categories",
          category.id
        )
      );

      setCategories((current) =>
        current.filter(
          (item) =>
            item.id !==
            category.id
        )
      );

      alert(
        `"${category.name}" category deleted successfully.`
      );

    } catch (error) {
      console.error(
        "Delete category error:",
        error
      );

      alert(
        "Unable to delete category. Please try again."
      );

    } finally {
      setDeletingCategory(null);
    }
  };

  /*
   * ==========================================
   * CATEGORY ENTER
   * ==========================================
   */

  const handleCategoryKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();

      handleAddCategory();
    }
  };

  /*
   * ==========================================
   * LOGOUT
   * ==========================================
   */

  const logout = async () => {
    try {
      await signOut(auth);

      router.replace(
        "/admin/login"
      );

    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  };

  /*
   * ==========================================
   * TOTAL PENDING APPROVALS
   * ==========================================
   */

  const totalPendingApprovals =
    pendingBusinesses +
    pendingStudents;

  /*
   * ==========================================
   * PAGE
   * ==========================================
   */

  return (
    <AdminProtected>

      <main className="min-h-screen bg-gray-100 p-6 md:p-10">

        <div className="mx-auto max-w-7xl">

          {/* ==================================
              HEADER
          =================================== */}

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>

              <h1 className="text-4xl font-bold text-blue-700">
                👋 Welcome Super Admin
              </h1>

              <p className="mt-2 text-gray-600">
                SBC Administration Dashboard
              </p>

            </div>

            <button
              onClick={logout}
              className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-700"
            >
              Logout
            </button>

          </div>


          {/* ==================================
              STATISTICS
          =================================== */}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

            {/* STUDENTS */}

            <div className="rounded-3xl bg-white p-8 shadow-xl">

              <p className="text-gray-500">
                👨‍🎓 Total Students
              </p>

              <h2 className="mt-4 text-5xl font-bold text-blue-700">

                {loading
                  ? "..."
                  : students}

              </h2>

            </div>


            {/* BUSINESSES */}

            <div className="rounded-3xl bg-white p-8 shadow-xl">

              <p className="text-gray-500">
                🏪 Total Businesses
              </p>

              <h2 className="mt-4 text-5xl font-bold text-green-700">

                {loading
                  ? "..."
                  : businesses}

              </h2>

            </div>


            {/* OFFERS */}

            <div className="rounded-3xl bg-white p-8 shadow-xl">

              <p className="text-gray-500">
                🎁 Total Offers
              </p>

              <h2 className="mt-4 text-5xl font-bold text-orange-600">

                {loading
                  ? "..."
                  : offers}

              </h2>

            </div>


            {/* REDEMPTIONS */}

            <div className="rounded-3xl bg-white p-8 shadow-xl">

              <p className="text-gray-500">
                🎉 Total Redemptions
              </p>

              <h2 className="mt-4 text-5xl font-bold text-purple-700">

                {loading
                  ? "..."
                  : redemptions}

              </h2>

            </div>

          </div>


          {/* ==================================
              CATEGORY MANAGEMENT
          =================================== */}

          <div className="mt-10 rounded-3xl bg-white p-8 shadow-xl">

            <div className="mb-6">

              <h2 className="text-3xl font-bold text-indigo-700">
                🏷️ Manage Categories
              </h2>

              <p className="mt-2 text-gray-600">
                Add or remove categories used
                across Business Registration,
                Offers and Student Offers.
              </p>

            </div>


            {/* ADD CATEGORY */}

            <div className="rounded-2xl bg-indigo-50 p-5">

              <label className="mb-2 block font-bold text-gray-700">
                Add New Category
              </label>

              <div className="flex flex-col gap-3 md:flex-row">

                <input
                  type="text"
                  value={newCategory}
                  onChange={(event) =>
                    setNewCategory(
                      event.target.value
                    )
                  }
                  onKeyDown={
                    handleCategoryKeyDown
                  }
                  placeholder="Example: Bakery"
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  disabled={
                    addingCategory
                  }
                />

                <button
                  onClick={
                    handleAddCategory
                  }
                  disabled={
                    addingCategory
                  }
                  className="rounded-xl bg-indigo-600 px-7 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {addingCategory
                    ? "Adding..."
                    : "➕ Add Category"}

                </button>

              </div>

            </div>


            {/* CATEGORY LIST */}

            <div className="mt-6">

              <div className="mb-4 flex items-center justify-between">

                <h3 className="text-xl font-bold text-gray-800">
                  Available Categories
                </h3>

                <span className="rounded-full bg-indigo-100 px-4 py-2 text-sm font-bold text-indigo-700">
                  {categories.length} Categories
                </span>

              </div>


              {categoryLoading ? (

                <div className="rounded-2xl bg-gray-50 p-6 text-center">

                  <p className="font-semibold text-gray-500">
                    Loading categories...
                  </p>

                </div>

              ) : categories.length === 0 ? (

                <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">

                  <p className="text-lg font-bold text-gray-600">
                    No categories added yet.
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    Add your first category above.
                  </p>

                </div>

              ) : (

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                  {categories.map(
                    (category) => (

                      <div
                        key={
                          category.id
                        }
                        className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-4"
                      >

                        <div className="flex min-w-0 items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xl">
                            🏷️
                          </div>

                          <span className="truncate font-bold text-gray-800">
                            {category.name}
                          </span>

                        </div>

                        <button
                          onClick={() =>
                            handleDeleteCategory(
                              category
                            )
                          }
                          disabled={
                            deletingCategory ===
                            category.id
                          }
                          className="ml-3 shrink-0 rounded-lg bg-red-100 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >

                          {deletingCategory ===
                          category.id
                            ? "..."
                            : "🗑️"}

                        </button>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </div>


          {/* ==================================
              QUICK ACTIONS
          =================================== */}

          <div className="mt-10 grid gap-6 md:grid-cols-2">

            {/* PENDING APPROVALS */}

            <Link
              href="/admin/pending-approvals"
              className="rounded-3xl border-2 border-yellow-200 bg-white p-8 shadow-xl transition hover:scale-[1.02] hover:border-yellow-400 hover:shadow-2xl"
            >

              <div className="flex items-start justify-between gap-4">

                <div>

                  <h2 className="text-3xl font-bold text-yellow-700">
                    ⏳ Pending Approvals
                  </h2>

                  <p className="mt-3 text-gray-600">
                    Review and approve pending
                    student and business
                    registrations.
                  </p>

                </div>

                <div className="shrink-0 rounded-2xl bg-yellow-100 px-5 py-3 text-center">

                  <span className="block text-3xl font-extrabold text-yellow-700">

                    {loading
                      ? "..."
                      : totalPendingApprovals}

                  </span>

                  <span className="text-xs font-bold uppercase text-yellow-700">
                    Pending
                  </span>

                </div>

              </div>

            </Link>


            {/* BUSINESSES */}

            <Link
              href="/admin/businesses"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-[1.02] hover:shadow-2xl"
            >

              <h2 className="text-3xl font-bold text-green-700">
                🏪 Manage Businesses
              </h2>

              <p className="mt-3 text-gray-600">
                Approve, Reject and Manage Businesses
              </p>

            </Link>


            {/* STUDENTS */}

            <Link
              href="/admin/students"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-[1.02] hover:shadow-2xl"
            >

              <h2 className="text-3xl font-bold text-blue-700">
                👨‍🎓 Manage Students
              </h2>

              <p className="mt-3 text-gray-600">
                View all registered students
              </p>

            </Link>


            {/* OFFERS */}

            <Link
              href="/admin/offers"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-[1.02] hover:shadow-2xl"
            >

              <h2 className="text-3xl font-bold text-orange-600">
                🎁 Manage Offers
              </h2>

              <p className="mt-3 text-gray-600">
                View and manage all offers
              </p>

            </Link>


            {/* REDEMPTIONS */}

            <Link
              href="/admin/redemptions"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-[1.02] hover:shadow-2xl"
            >

              <h2 className="text-3xl font-bold text-purple-700">
                📊 Redemption Reports
              </h2>

              <p className="mt-3 text-gray-600">
                View all redemption history
              </p>

            </Link>

          </div>


          {/* ==================================
              PORTAL INFORMATION
          =================================== */}

          <div className="mt-10 rounded-3xl bg-white p-8 shadow-xl">

            <h2 className="text-3xl font-bold text-blue-700">
              🚀 SBC Admin Portal
            </h2>

            <p className="mt-4 text-lg text-gray-600">
              Manage Students, Businesses,
              Offers, Categories and
              Redemptions from one central
              dashboard.
            </p>

          </div>

        </div>

      </main>

    </AdminProtected>
  );
}