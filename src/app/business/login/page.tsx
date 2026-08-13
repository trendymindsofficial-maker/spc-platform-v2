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

  /*
   * ==========================================
   * NORMALIZE MOBILE NUMBER
   * ==========================================
   */

  const normalizeMobile = (
    value: string
  ) => {
    let number = value.trim();

    // Remove spaces, hyphens and brackets
    number = number.replace(
      /[\s\-()]/g,
      ""
    );

    // Convert +91XXXXXXXXXX
    if (number.startsWith("+91")) {
      number = number.slice(3);
    }

    // Convert 91XXXXXXXXXX
    if (
      number.startsWith("91") &&
      number.length === 12
    ) {
      number = number.slice(2);
    }

    // Convert 0XXXXXXXXXX
    if (
      number.startsWith("0") &&
      number.length === 11
    ) {
      number = number.slice(1);
    }

    return number;
  };

  /*
   * ==========================================
   * LOGIN
   * ==========================================
   */

  const loginBusiness = async () => {
    const normalizedMobile =
      normalizeMobile(mobile);

    if (!normalizedMobile) {
      alert(
        "Please enter your mobile number."
      );
      return;
    }

    if (!/^\d{10}$/.test(normalizedMobile)) {
      alert(
        "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    if (!password) {
      alert(
        "Please enter your password."
      );
      return;
    }

    try {
      setLoading(true);

      /*
       * IMPORTANT
       *
       * Existing business accounts use:
       *
       * mobile@business.spc
       *
       * Keep this format.
       */

      const email =
        `${normalizedMobile}@business.spc`;

      console.log(
        "Business login email:",
        email
      );

      /*
       * FIREBASE AUTH LOGIN
       */

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const uid =
        userCredential.user.uid;

      /*
       * LOAD BUSINESS PROFILE
       */

      const businessRef = doc(
        db,
        "businesses",
        uid
      );

      const businessSnap =
        await getDoc(
          businessRef
        );

      /*
       * AUTH ACCOUNT EXISTS,
       * BUT BUSINESS DOCUMENT DOES NOT
       */

      if (!businessSnap.exists()) {
        alert(
          "Your Firebase account exists, but your business profile was not found. Please contact SBC Admin."
        );

        return;
      }

      const business =
        businessSnap.data();

      /*
       * CHECK APPROVAL
       */

      const status =
        String(
          business.status || ""
        ).toLowerCase();

      if (status !== "approved") {
        if (status === "pending") {
          alert(
            "⏳ Your business registration is still waiting for admin approval."
          );
        } else if (
          status === "rejected"
        ) {
          alert(
            "❌ Your business registration was rejected. Please contact SBC Admin."
          );
        } else {
          alert(
            `Your business account is not approved yet.\n\nCurrent status: ${
              business.status || "Unknown"
            }`
          );
        }

        return;
      }

      /*
       * SUCCESS
       */

      router.replace(
        "/business/dashboard"
      );

    } catch (error: any) {
      console.error(
        "Business Login Error:",
        error
      );

      /*
       * FIREBASE AUTH ERRORS
       */

      switch (error?.code) {
        case "auth/invalid-credential":
          alert(
            "❌ Invalid mobile number or password."
          );
          break;

        case "auth/user-not-found":
          alert(
            "❌ No business account exists with this mobile number."
          );
          break;

        case "auth/wrong-password":
          alert(
            "❌ Incorrect password."
          );
          break;

        case "auth/invalid-email":
          alert(
            "❌ Invalid business login format."
          );
          break;

        case "auth/user-disabled":
          alert(
            "❌ This business account has been disabled."
          );
          break;

        case "auth/too-many-requests":
          alert(
            "⚠️ Too many login attempts. Please wait and try again."
          );
          break;

        case "auth/network-request-failed":
          alert(
            "🌐 Network error. Please check your internet connection and try again."
          );
          break;

        default:
          alert(
            `❌ Login failed.\n\nError: ${
              error?.code ||
              "Unknown error"
            }`
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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-gray-900">

      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-gray-900 shadow-xl">

        {/* BACK TO HOME */}

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

        {/* HEADER */}

        <h1 className="mb-2 text-center text-3xl font-bold text-green-700">
          🏪 Business Login
        </h1>

        <p className="mb-2 text-center text-gray-500">
          Login to your SBC Business Account
        </p>

        <p className="mb-8 text-center text-sm font-medium text-gray-400">
          Student Benefit Card Partner
        </p>

        {/* FORM */}

        <div className="space-y-4">

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
            onKeyDown={(e) => {
              if (
                e.key === "Enter"
              ) {
                loginBusiness();
              }
            }}
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />

          {/* PASSWORD */}

          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            onKeyDown={(e) => {
              if (
                e.key === "Enter"
              ) {
                loginBusiness();
              }
            }}
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />

          {/* LOGIN */}

          <button
            type="button"
            onClick={
              loginBusiness
            }
            disabled={loading}
            className="w-full rounded-xl bg-green-600 py-3 text-lg font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Logging In..."
              : "Login"}
          </button>

          {/* REGISTRATION */}

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