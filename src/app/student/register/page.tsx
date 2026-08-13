"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

import {
  createUserWithEmailAndPassword,
} from "firebase/auth";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function StudentRegister() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [fullName, setFullName] =
    useState("");

  const [mobile, setMobile] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [college, setCollege] =
    useState("");

  const [course, setCourse] =
    useState("");

  const [year, setYear] =
    useState("");

  /*
   * ==========================================
   * REGISTER STUDENT
   * ==========================================
   */

  const registerStudent = async () => {
    if (
      !fullName.trim() ||
      !mobile.trim() ||
      !password ||
      !college.trim() ||
      !course.trim() ||
      !year.trim()
    ) {
      alert("Fill all fields");
      return;
    }

    try {
      setLoading(true);

      /*
       * IMPORTANT:
       *
       * Keep existing Firebase Auth format.
       *
       * Existing students use:
       * mobile@student.spc
       *
       * Do NOT change this to .sbc now,
       * otherwise existing students may
       * not be able to login.
       */

      const loginEmail =
        `${mobile.trim()}@student.spc`;

      console.log(
        "LOGIN EMAIL =",
        loginEmail
      );

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
       * GENERATE SPC CARD NUMBER
       *
       * Keep existing format for compatibility.
       */

      const cardNumber =
        "SPC" +
        Math.floor(
          100000 +
            Math.random() * 900000
        );

      /*
       * SAVE STUDENT
       */

      await setDoc(
        doc(db, "students", uid),
        {
          uid,

          fullName:
            fullName.trim(),

          mobile:
            mobile.trim(),

          email:
            loginEmail,

          college:
            college.trim(),

          course:
            course.trim(),

          year:
            year.trim(),

          cardNumber,

          status:
            "pending",

          createdAt:
            serverTimestamp(),
        }
      );

      alert(
        "✅ Registration successful!\n\nYour SBC account is waiting for admin approval."
      );

      router.replace(
        "/student/login"
      );

    } catch (error: any) {
      console.error(
        "Student registration error:",
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
            "Student registration failed."
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

        <h1 className="mb-2 text-center text-3xl font-bold text-blue-700">
          🎓 Student Registration
        </h1>

        <p className="mb-8 text-center text-sm font-medium text-gray-500">
          Join Student Benefit Card
        </p>

        <div className="space-y-4">

          {/* FULL NAME */}

          <input
            type="text"
            autoComplete="name"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) =>
              setFullName(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />

          {/* COLLEGE */}

          <input
            type="text"
            autoComplete="organization"
            placeholder="College"
            value={college}
            onChange={(e) =>
              setCollege(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />

          {/* COURSE */}

          <input
            type="text"
            placeholder="Course"
            value={course}
            onChange={(e) =>
              setCourse(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />

          {/* YEAR */}

          <input
            type="text"
            inputMode="numeric"
            placeholder="Year"
            value={year}
            onChange={(e) =>
              setYear(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />

          {/* REGISTER */}

          <button
            type="button"
            onClick={
              registerStudent
            }
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Registering..."
              : "Register Student"}
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