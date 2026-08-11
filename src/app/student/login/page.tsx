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

export default function StudentLogin() {

  const router = useRouter();

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const loginStudent = async () => {

    if (!mobile || !password) {
      alert("Enter Mobile Number & Password");
      return;
    }

    try {

      setLoading(true);

      const email = `${mobile}@student.spc`;

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const uid = userCredential.user.uid;

      const studentRef = doc(
        db,
        "students",
        uid
      );

      const studentSnap =
        await getDoc(studentRef);

      if (!studentSnap.exists()) {

        alert("Student not found");

        return;

      }

      const student =
        studentSnap.data();
        console.log("Student Data:", student);
console.log("Status:", student.status);
console.log("UID:", uid);
             const status = (student.status || "").toLowerCase();



if (status !== "approved" && status !== "active") {
  alert("Your account is waiting for admin approval.");
  return;
}


      router.replace("/student/dashboard");

    } catch (error: any) {

      console.error(error);

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

    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-6">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="rounded-xl bg-gray-100 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-200"
      >
        ← Back to Home
      </button>
    </div>

        <h1 className="mb-2 text-center text-3xl font-bold text-blue-700">
          🎓 Student Login
        </h1>

        <p className="mb-8 text-center text-gray-500">
          Login to your SPC account
        </p>

        <div className="space-y-4">

          <input
            type="tel"
            placeholder="Mobile Number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full rounded-xl border p-3"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border p-3"
          />
                    <button
            onClick={loginStudent}
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Logging In..." : "Login"}
          </button>

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

      </div>
    </main>
  );
}
