"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";

import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) {
      alert("Enter Email & Password");
      return;
    }

    try {
      setLoading(true);

      const credential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const uid = credential.user.uid;

      const adminRef = doc(db, "admins", uid);

      const adminSnap = await getDoc(adminRef);

      if (!adminSnap.exists()) {
        await signOut(auth);

        alert("Unauthorized Admin");

        return;
      }

      router.replace("/admin/dashboard");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">

        <h1 className="text-center text-4xl font-bold text-blue-700">
          SPC Admin
        </h1>

        <p className="mt-3 text-center text-gray-500">
          Administrator Login
        </p>

        <div className="mt-8">

          <label className="font-semibold">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="admin@spc.in"
            className="mt-2 w-full rounded-xl border p-3 outline-none focus:border-blue-600"
          />

        </div>

        <div className="mt-5">

          <label className="font-semibold">
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="********"
            className="mt-2 w-full rounded-xl border p-3 outline-none focus:border-blue-600"
          />

        </div>

        <button
          onClick={login}
          disabled={loading}
          className="mt-8 w-full rounded-xl bg-blue-600 py-3 text-lg font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Logging In..." : "Login"}
        </button>

      </div>
    </main>
  );
}