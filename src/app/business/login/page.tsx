"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

import { signInWithEmailAndPassword } from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

export default function BusinessLogin() {
  const router = useRouter();

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const loginBusiness = async () => {
    if (!mobile || !password) {
      alert("Enter Mobile Number & Password");
      return;
    }

    try {
      setLoading(true);

      /*
       * IMPORTANT:
       * Keep the existing Firebase Auth email format.
       * Changing .spc to .sbc would affect existing
       * registered business accounts.
       */
      const email = `${mobile}@business.spc`;

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const uid = userCredential.user.uid;

      const businessSnap = await getDoc(
        doc(db, "businesses", uid)
      );

      if (!businessSnap.exists()) {
        alert("Business Not Found");
        return;
      }

      const business = businessSnap.data();

      if (
        (business.status || "").toLowerCase() !==
        "approved"
      ) {
        alert("Waiting for Admin Approval");
        return;
      }

      router.replace("/business/dashboard");

    } catch (error: any) {
      console.error("Business Login Error:", error);

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        alert("Invalid Mobile Number or Password");
      } else {
        alert("Login Failed");
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-gray-900">

      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-gray-900 shadow-xl">

        {/* Back to Home */}

        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl bg-gray-100 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            ← Back to Home
          </button>
        </div>

        {/* Header */}

        <h1 className="mb-2 text-center text-3xl font-bold text-green-700">
          🏪 Business Login
        </h1>

        <p className="mb-2 text-center text-gray-500">
          Login to your SBC Business Account
        </p>

        <p className="mb-8 text-center text-sm font-medium text-gray-400">
          Student Benefit Card Partner
        </p>

        {/* Form */}

        <div className="space-y-4">

          {/* Mobile Number */}

          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="Mobile Number"
            value={mobile}
            onChange={(e) =>
              setMobile(e.target.value)
            }
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />

          {/* Password */}

          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />

          {/* Login Button */}

          <button
            type="button"
            onClick={loginBusiness}
            disabled={loading}
            className="w-full rounded-xl bg-green-600 py-3 text-lg font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Logging In..."
              : "Login"}
          </button>

          {/* Registration */}

          <div className="text-center text-sm text-gray-600">
            Don't have a business account?{" "}

            <Link
              href="/business/register"
              className="font-semibold text-green-600 hover:underline"
            >
              Register
            </Link>
          </div>

        </div>

      </div>

    </main>
  );
}