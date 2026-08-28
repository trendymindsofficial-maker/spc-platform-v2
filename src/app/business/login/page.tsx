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

    number = number.replace(
      /[\s\-()]/g,
      ""
    );

    if (number.startsWith("+91")) {
      number = number.slice(3);
    }

    if (
      number.startsWith("91") &&
      number.length === 12
    ) {
      number = number.slice(2);
    }

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

      const email =
        `${normalizedMobile}@business.spc`;

      console.log(
        "Business login email:",
        email
      );

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const uid =
        userCredential.user.uid;

      const businessRef = doc(
        db,
        "businesses",
        uid
      );

      const businessSnap =
        await getDoc(
          businessRef
        );

      if (!businessSnap.exists()) {
        alert(
          "Your Firebase account exists, but your business profile was not found. Please contact SBC Admin."
        );

        return;
      }

      const business =
        businessSnap.data();

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

      router.replace(
        "/business/dashboard"
      );

    } catch (error: any) {
      console.error(
        "Business Login Error:",
        error
      );

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
    <main className="min-h-screen bg-[#f5f3ed] text-[#07111f]">
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(212,175,55,0.14),transparent_32%),radial-gradient(circle_at_90%_85%,rgba(7,17,31,0.09),transparent_30%),linear-gradient(135deg,#fffdf7_0%,#f5f3ed_52%,#eeeade_100%)]" />
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#d4af37]/10 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[#07111f]/10 blur-3xl" />

        <div className="relative w-full max-w-5xl">

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-5 rounded-full border border-black/10 bg-white/85 px-5 py-2.5 text-sm font-bold text-[#07111f] shadow-sm backdrop-blur transition hover:border-[#d4af37]/50 hover:bg-white"
          >
            ← Back to Home
          </button>

          <div className="grid overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_30px_100px_rgba(7,17,31,0.16)] backdrop-blur-xl lg:grid-cols-[0.8fr_1.2fr]">

            {/* BRAND PANEL */}
            <div className="relative hidden overflow-hidden bg-[#07111f] p-10 text-white lg:flex lg:flex-col lg:justify-between">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#d4af37]/15 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#d4af37]/10 blur-3xl" />

              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-lg font-black text-[#f1cf63]">
                  SBC
                </div>

                <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-[#d4af37]">
                  Student Benefit Card
                </p>

                <h2 className="mt-3 text-4xl font-black leading-tight">
                  Welcome back,
                  <span className="block text-[#f1cf63]">Partner.</span>
                </h2>

                <p className="mt-5 max-w-sm text-sm leading-6 text-white/55">
                  Manage your SBC business account and connect with students through exclusive benefits.
                </p>
              </div>

              <div className="relative grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-xl">🏪</p>
                  <p className="mt-2 text-xs font-black">Business Portal</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-xl">🎁</p>
                  <p className="mt-2 text-xs font-black">Student Benefits</p>
                </div>
              </div>
            </div>

            {/* LOGIN PANEL */}
            <div className="p-6 sm:p-9 lg:p-11">

              <div className="mb-7 text-center lg:hidden">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#07111f] text-base font-black text-[#f1cf63] shadow-lg">
                  SBC
                </div>
              </div>

              <div className="text-center lg:text-left">
                <div className="inline-flex items-center rounded-full border border-[#d4af37]/30 bg-[#fff8df] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#8a680c]">
                  ✦ Business Login
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-[#07111f] sm:text-4xl">
                  Welcome Back
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                  Login to your SBC Business Account
                </p>

                <p className="mt-1 text-xs font-semibold text-[#a37b0d]">
                  Student Benefit Card Partner
                </p>
              </div>

              <div className="mt-8 space-y-5">

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                    Mobile Number
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                      📱
                    </span>

                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="Enter mobile number"
                      value={mobile}
                      onChange={(e) =>
                        setMobile(
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          loginBusiness();
                        }
                      }}
                      className="w-full rounded-2xl border border-black/10 bg-[#fbfaf6] py-3.5 pl-12 pr-4 text-base text-[#07111f] outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                    Password
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                      🔒
                    </span>

                    <input
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) =>
                        setPassword(
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          loginBusiness();
                        }
                      }}
                      className="w-full rounded-2xl border border-black/10 bg-[#fbfaf6] py-3.5 pl-12 pr-4 text-base text-[#07111f] outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loginBusiness}
                  disabled={loading}
                  className="w-full rounded-2xl bg-[#07111f] py-4 text-sm font-black text-white shadow-lg transition hover:bg-[#101d2e] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "⏳ Logging In..."
                    : "Login to Business Portal →"}
                </button>

                <div className="rounded-2xl border border-black/5 bg-[#fbfaf6] p-4 text-center text-sm text-slate-500">
                  Don't have a business account?{" "}
                  <Link
                    href="/business/register"
                    className="font-black text-[#a37b0d] hover:text-[#07111f] hover:underline"
                  >
                    Register
                  </Link>
                </div>
              </div>

              <div className="mt-7 flex items-center justify-between border-t border-black/5 pt-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Student Benefit Card</span>
                <span className="text-[#a37b0d]">SBC • 2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
