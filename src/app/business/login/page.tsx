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

      const email = `${mobile}@business.spc`;

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const uid = userCredential.user.uid;

      const businessSnap =
        await getDoc(doc(db, "businesses", uid));

      if (!businessSnap.exists()) {
        alert("Business Not Found");
        return;
      }

      const business = businessSnap.data();

      if ((business.status || "").toLowerCase() !== "approved") {
        alert("Waiting for Admin Approval");
        return;
      }

      router.replace("/business/dashboard");

    } catch (error: any) {

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

        <h1 className="mb-2 text-center text-3xl font-bold text-green-700">
          🏪 Business Login
        </h1>

        <p className="mb-8 text-center text-gray-500">
          Login to your Business Account
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
            onClick={loginBusiness}
            disabled={loading}
            className="w-full rounded-xl bg-green-600 py-3 text-lg font-bold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Logging In..." : "Login"}
          </button>

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