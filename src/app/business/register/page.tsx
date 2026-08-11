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

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");

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
          .filter((item) => item.name.trim() !== "")
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

          email: loginEmail,

          category,

          address:
            address.trim(),

          status: "pending",

          createdAt:
            serverTimestamp(),
        }
      );

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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-xl">

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

        <h1 className="mb-6 text-center text-3xl font-bold">
          🏪 Business Registration
        </h1>

        <div className="space-y-4">

          {/* BUSINESS NAME */}

          <input
            type="text"
            placeholder="Business Name"
            className="w-full rounded-xl border p-3 outline-none focus:border-green-600"
            value={businessName}
            onChange={(e) =>
              setBusinessName(
                e.target.value
              )
            }
          />

          {/* OWNER NAME */}

          <input
            type="text"
            placeholder="Owner Name"
            className="w-full rounded-xl border p-3 outline-none focus:border-green-600"
            value={ownerName}
            onChange={(e) =>
              setOwnerName(
                e.target.value
              )
            }
          />

          {/* MOBILE */}

          <input
            type="tel"
            placeholder="Mobile Number"
            className="w-full rounded-xl border p-3 outline-none focus:border-green-600"
            value={mobile}
            onChange={(e) =>
              setMobile(
                e.target.value
              )
            }
          />

          {/* PASSWORD */}

          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-xl border p-3 outline-none focus:border-green-600"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
          />

          {/* DYNAMIC CATEGORY */}

          <select
            className="w-full rounded-xl border p-3 outline-none focus:border-green-600"
            value={category}
            onChange={(e) =>
              setCategory(
                e.target.value
              )
            }
            disabled={
              categoriesLoading
            }
          >
            <option value="">
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

          {/* CATEGORY INFO */}

          {!categoriesLoading &&
            categories.length === 0 && (
              <p className="text-sm font-medium text-red-600">
                ❌ No categories available.
                Please contact SPC Admin.
              </p>
            )}

          {/* ADDRESS */}

          <textarea
            placeholder="Business Address"
            className="h-28 w-full rounded-xl border p-3 outline-none focus:border-green-600"
            value={address}
            onChange={(e) =>
              setAddress(
                e.target.value
              )
            }
          />

          {/* REGISTER */}

          <button
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
      </div>
    </main>
  );
}