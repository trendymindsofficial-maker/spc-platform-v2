"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

import { createUserWithEmailAndPassword } from "firebase/auth";

import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

interface Category {
  id: string;
  name: string;
}

export default function BusinessRegister() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [categoriesLoading, setCategoriesLoading] =
    useState(true);

  const [businessName, setBusinessName] =
    useState("");

  const [ownerName, setOwnerName] =
    useState("");

  const [mobile, setMobile] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [address, setAddress] =
    useState("");

  /*
   * ==========================================
   * LOAD CATEGORIES FROM FIRESTORE
   * ==========================================
   */

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);

        const snap = await getDocs(
          collection(db, "categories")
        );

        const data: Category[] = snap.docs
          .map((item) => {
            const itemData = item.data();

            return {
              id: item.id,

              name:
                itemData.name ||
                itemData.category ||
                itemData.title ||
                "",
            };
          })
          .filter(
            (item) =>
              item.name.trim() !== ""
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

        alert(
          "Unable to load business categories."
        );
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  /*
   * ==========================================
   * REGISTER BUSINESS
   * ==========================================
   */

  const registerBusiness = async () => {
    if (
      !businessName.trim() ||
      !ownerName.trim() ||
      !mobile.trim() ||
      !password ||
      !category ||
      !address.trim()
    ) {
      alert("Fill all fields");
      return;
    }

    try {
      setLoading(true);

      /*
       * IMPORTANT:
       *
       * Keep existing .spc Firebase Auth format.
       *
       * Do NOT change this to .sbc because
       * existing business accounts use this format.
       */

      const loginEmail =
        `${mobile.trim()}@business.spc`;

      /*
       * CREATE FIREBASE AUTH USER
       */

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          loginEmail,
          password
        );

      const uid =
        userCredential.user.uid;

      /*
       * SAVE BUSINESS DATA
       */

      await setDoc(
        doc(db, "businesses", uid),
        {
          uid,

          businessName:
            businessName.trim(),

          ownerName:
            ownerName.trim(),

          mobile:
            mobile.trim(),

          email:
            loginEmail,

          category,

          address:
            address.trim(),

          status:
            "pending",

          createdAt:
            serverTimestamp(),
        }
      );

      /*
       * SUCCESS
       */

      alert(
        "✅ Business registration successful!\n\nYour account is waiting for admin approval."
      );

      router.replace(
        "/business/login"
      );

    } catch (error: any) {
      console.error(
        "Business registration error:",
        error
      );

      if (
        error?.code ===
        "auth/email-already-in-use"
      ) {
        alert(
          "❌ This mobile number is already registered."
        );
      } else if (
        error?.code ===
        "auth/weak-password"
      ) {
        alert(
          "❌ Password should be at least 6 characters."
        );
      } else {
        alert(
          error?.message ||
            "Business registration failed."
        );
      }

    } finally {
      setLoading(false);
    }
  };

  /*
   * ==========================================
   * PAGE
   * ==========================================
   */

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-gray-900">

      <div className="w-full max-w-xl rounded-3xl bg-white p-8 text-gray-900 shadow-xl">

        {/* BACK HOME */}

        <div className="mb-6">

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="rounded-xl bg-gray-100 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            ← Back to Home
          </button>

        </div>

        {/* TITLE */}

        <h1 className="mb-2 text-center text-3xl font-bold text-green-700">
          🏪 Business Registration
        </h1>

        <p className="mb-8 text-center text-sm font-medium text-gray-500">
          Become a Student Benefit Card Partner
        </p>

        <div className="space-y-4">

          {/* BUSINESS NAME */}

          <input
            type="text"
            autoComplete="organization"
            placeholder="Business Name"
            value={businessName}
            onChange={(e) =>
              setBusinessName(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />

          {/* OWNER NAME */}

          <input
            type="text"
            autoComplete="name"
            placeholder="Owner Name"
            value={ownerName}
            onChange={(e) =>
              setOwnerName(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />

          {/* MOBILE */}

          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="Mobile Number"
            value={mobile}
            onChange={(e) =>
              setMobile(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />

          {/* PASSWORD */}

          <input
            type="password"
            autoComplete="new-password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
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
              categoriesLoading
            }
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
          >

            <option
              value=""
              className="text-gray-500"
            >
              {categoriesLoading
                ? "Loading Categories..."
                : categories.length === 0
                ? "No Categories Available"
                : "Select Category"}
            </option>

            {categories.map(
              (item) => (
                <option
                  key={item.id}
                  value={item.name}
                >
                  {item.name}
                </option>
              )
            )}

          </select>

          {/* CATEGORY ERROR */}

          {!categoriesLoading &&
            categories.length === 0 && (
              <p className="text-sm font-medium text-red-600">
                ❌ No categories available.
                Please contact SBC Admin.
              </p>
            )}

          {/* ADDRESS */}

          <textarea
            autoComplete="street-address"
            placeholder="Business Address"
            value={address}
            onChange={(e) =>
              setAddress(
                e.target.value
              )
            }
            className="h-28 w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />

          {/* REGISTER */}

          <button
            type="button"
            onClick={
              registerBusiness
            }
            disabled={
              loading ||
              categoriesLoading ||
              categories.length === 0
            }
            className="w-full rounded-xl bg-green-600 py-4 text-lg font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Registering..."
              : "Register Business"}
          </button>

        </div>

        {/* BRANDING */}

        <p className="mt-6 text-center text-xs text-gray-400">
          Student Benefit Card • SBC
        </p>

      </div>

    </main>
  );
}