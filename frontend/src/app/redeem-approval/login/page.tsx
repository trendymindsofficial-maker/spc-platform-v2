"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function RedeemApprovalLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const uid = credential.user.uid;

      // Main Admin accounts are not automatically Redeem Approval accounts.
      const approvalRef = doc(db, "redeemApprovalAdmins", uid);
      const approvalSnap = await getDoc(approvalRef);

      if (!approvalSnap.exists() || approvalSnap.data()?.active !== true) {
        await signOut(auth);
        setError("Access denied. You are not authorised for Redeem Approval.");
        return;
      }

      router.replace("/redeem-approval/dashboard");
    } catch {
      setError("Login failed. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07111f] px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-[#d4af37]/30 bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-[#9a7a10]">
            Student Benefit Card
          </p>
          <h1 className="text-2xl font-black text-[#07111f]">
            Redeem Approval Login
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Authorised redemption request management
          </p>
        </div>

        <form onSubmit={login} className="space-y-5">
          <div>
            <label
              htmlFor="approval-email"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Email Address
            </label>
            <input
              id="approval-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter authorised email"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#9a7a10] focus:ring-2 focus:ring-[#d4af37]/20"
            />
          </div>

          <div>
            <label
              htmlFor="approval-password"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Password
            </label>
            <input
              id="approval-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#9a7a10] focus:ring-2 focus:ring-[#d4af37]/20"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#07111f] py-3.5 font-black text-[#f1cf63] transition hover:bg-[#101d2e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Verifying..." : "Login to Redeem Approval"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => router.push("/admin/login")}
          className="mt-6 w-full text-center text-sm font-semibold text-slate-500 hover:text-[#9a7a10]"
        >
          Back to Admin Login
        </button>
      </section>
    </main>
  );
}
