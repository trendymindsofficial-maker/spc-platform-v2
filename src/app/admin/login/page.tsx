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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f3ed] px-4 py-8 text-[#07111f]">

      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#d4af37]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-[#07111f]/10 blur-3xl" />

      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_25px_80px_rgba(7,17,31,0.14)]">

        <div className="bg-[#07111f] px-8 py-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-xl font-black text-[#f1cf63]">
            SBC
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-white">
            Admin Login
          </h1>

          <p className="mt-1 text-sm font-medium text-white/60">
            Student Benefit Card
          </p>
        </div>

        <div className="p-7 sm:p-8">

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-7 rounded-xl border border-black/5 bg-[#f5f3ed] px-4 py-2.5 text-sm font-bold text-[#07111f] transition hover:bg-[#ebe7dc]"
          >
            ← Back to Home
          </button>

          <div className="mb-7">
            <h2 className="text-2xl font-black text-[#07111f]">
              Welcome Back
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Sign in to manage the SBC platform.
            </p>
          </div>

          <div className="space-y-5">

            <div>
              <label className="mb-2 block text-sm font-bold text-[#07111f]">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="admin@sbc.in"
                className="w-full rounded-xl border border-slate-200 bg-[#fbfaf6] px-4 py-3.5 text-sm font-medium text-[#07111f] outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#07111f]">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-200 bg-[#fbfaf6] px-4 py-3.5 text-sm font-medium text-[#07111f] outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
              />
            </div>

            <button
              type="button"
              onClick={login}
              disabled={loading}
              className="w-full rounded-xl bg-[#07111f] py-3.5 text-base font-black text-[#f1cf63] shadow-lg transition hover:bg-[#101d2e] hover:shadow-xl disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-white"
            >
              {loading ? "⏳ Logging In..." : "🔐 Login"}
            </button>

          </div>

          <div className="mt-7 border-t border-slate-100 pt-5 text-center">
            <p className="text-xs font-semibold text-slate-400">
              Secure Administrator Access
            </p>

            <p className="mt-1 text-[11px] font-medium text-slate-300">
              SBC • Student Benefit Card
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}
