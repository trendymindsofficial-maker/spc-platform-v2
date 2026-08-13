"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

import {
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

export default function StudentLogin() {
  const router = useRouter();

  const [mobile, setMobile] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  /*
   * ==========================================
   * STUDENT LOGIN
   * ==========================================
   */

  const loginStudent = async () => {
    if (
      !mobile.trim() ||
      !password
    ) {
      alert(
        "Enter Mobile Number & Password"
      );
      return;
    }

    try {
      setLoading(true);

      /*
       * IMPORTANT:
       *
       * Keep existing Firebase Auth format.
       *
       * Existing student accounts use:
       * mobile@student.spc
       *
       * Do NOT change this to .sbc now.
       */

      const email =
        `${mobile.trim()}@student.spc`;

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const uid =
        userCredential.user.uid;

      /*
       * LOAD STUDENT
       */

      const studentRef = doc(
        db,
        "students",
        uid
      );

      const studentSnap =
        await getDoc(studentRef);

      if (!studentSnap.exists()) {
        alert(
          "Student not found"
        );
        return;
      }

      const student =
        studentSnap.data();

      console.log(
        "Student Data:",
        student
      );

      console.log(
        "Status:",
        student.status
      );

      console.log(
        "UID:",
        uid
      );

      /*
       * CHECK APPROVAL
       */

      const status =
        (
          student.status ||
          ""
        ).toLowerCase();

      if (
        status !== "approved" &&
        status !== "active"
      ) {
        alert(
          "Your account is waiting for admin approval."
        );
        return;
      }

      /*
       * LOGIN SUCCESS
       */

      router.replace(
        "/student/dashboard"
      );

    } catch (error: any) {
      console.error(
        "Student Login Error:",
        error
      );

      if (
        error?.code ===
          "auth/invalid-credential" ||
        error?.code ===
          "auth/user-not-found" ||
        error?.code ===
          "auth/wrong-password"
      ) {
        alert(
          "Invalid Mobile Number or Password"
        );
      } else {
        alert(
          "Login Failed"
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

        {/* HEADER */}

        <h1 className="mb-2 text-center text-3xl font-bold text-blue-700">
          🎓 Student Login
        </h1>

        <p className="mb-2 text-center text-gray-500">
          Login to your SBC account
        </p>

        <p className="mb-8 text-center text-sm font-medium text-gray-400">
          Student Benefit Card
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
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />

          {/* LOGIN */}

          <button
            type="button"
            onClick={
              loginStudent
            }
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Logging In..."
              : "Login"}
          </button>

          {/* REGISTER */}

          <div className="text-center text-sm text-gray-600">

            Don't have an account?{" "}

            <Link
              href="/student/register"
              className="font-semibold text-blue-600 hover:underline"
            >
              Register
            </Link>

          </div>

        </div>

        {/* BRANDING */}

        <p className="mt-6 text-center text-xs text-gray-400">
          Student Benefit Card • SBC
        </p>

      </div>

    </main>
  );
}