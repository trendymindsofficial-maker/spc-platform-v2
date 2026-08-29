"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  EmailAuthProvider,
  linkWithCredential,
  signOut,
  ConfirmationResult,
} from "firebase/auth";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function StudentRegister() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [checkingMobile, setCheckingMobile] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [college, setCollege] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");

  const recaptchaRef =
    useRef<RecaptchaVerifier | null>(null);

  const confirmationResultRef =
    useRef<ConfirmationResult | null>(null);

  /*
   * ============================================================
   * CLEANUP
   * ============================================================
   */

  useEffect(() => {
    return () => {
      try {
        recaptchaRef.current?.clear();
      } catch {}

      recaptchaRef.current = null;
      confirmationResultRef.current = null;
    };
  }, []);

  /*
   * ============================================================
   * GET PHONE NUMBER
   * ============================================================
   */

  const getPhoneNumber = () => {
    const cleaned =
      mobile.replace(/\D/g, "").trim();

    if (
      cleaned.length !== 10 ||
      !/^[6-9]\d{9}$/.test(cleaned)
    ) {
      return null;
    }

    return `+91${cleaned}`;
  };

  /*
   * ============================================================
   * RECAPTCHA
   * ============================================================
   */

  const getRecaptchaVerifier = () => {
    if (typeof window === "undefined") {
      return null;
    }

    if (recaptchaRef.current) {
      return recaptchaRef.current;
    }

    const button =
      document.getElementById(
        "student-send-otp-button"
      );

    if (!button) {
      throw new Error(
        "Send OTP button is not available."
      );
    }

    const verifier =
      new RecaptchaVerifier(
        auth,
        "student-send-otp-button",
        {
          size: "invisible",

          callback: () => {
            console.log(
              "Firebase reCAPTCHA verified"
            );
          },

          "expired-callback": () => {
            console.log(
              "Firebase reCAPTCHA expired"
            );
          },

          "error-callback": () => {
            console.log(
              "Firebase reCAPTCHA error"
            );
          },
        }
      );

    recaptchaRef.current =
      verifier;

    return verifier;
  };

  /*
   * ============================================================
   * RESET RECAPTCHA
   * ============================================================
   */

  const resetRecaptcha = () => {
    try {
      recaptchaRef.current?.clear();
    } catch {}

    recaptchaRef.current = null;
  };

  /*
   * ============================================================
   * CHECK MOBILE BEFORE OTP
   * ============================================================
   *
   * VERY IMPORTANT:
   *
   * Existing mobile:
   *      STOP
   *      NO OTP
   *
   * New mobile:
   *      Continue
   *      Send OTP
   */

  const checkMobileAlreadyRegistered =
    async (
      cleanedMobile: string
    ): Promise<boolean> => {
      try {
        setCheckingMobile(true);

        console.log(
          "🔎 Checking mobile before OTP:",
          cleanedMobile
        );

        const response =
          await fetch(
            "/api/student/check-mobile",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                mobile: cleanedMobile,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to check mobile number."
          );
        }

        /*
         * Existing mobile
         */

        if (data.exists === true) {
          console.log(
            "🚫 Mobile already registered. OTP will NOT be sent."
          );

          alert(
            "⚠️ This mobile number is already registered.\n\nPlease login using your existing SBC account."
          );

          return true;
        }

        /*
         * New mobile
         */

        console.log(
          "✅ Mobile is available for registration."
        );

        return false;
      } finally {
        setCheckingMobile(false);
      }
    };

  /*
   * ============================================================
   * SEND OTP
   * ============================================================
   */

  const sendOTP = async () => {
    if (
      otpLoading ||
      checkingMobile
    ) {
      return;
    }

    if (!fullName.trim()) {
      alert(
        "Please enter your full name."
      );
      return;
    }

    const phoneNumber =
      getPhoneNumber();

    if (!phoneNumber) {
      alert(
        "Please enter a valid 10-digit Indian mobile number."
      );
      return;
    }

    const cleanedMobile =
      mobile.replace(/\D/g, "").trim();

    try {
      setOtpLoading(true);

      /*
       * ======================================================
       * FIRST CHECK DATABASE
       * ======================================================
       *
       * This happens BEFORE Firebase OTP.
       */

      const alreadyRegistered =
        await checkMobileAlreadyRegistered(
          cleanedMobile
        );

      if (alreadyRegistered) {
        return;
      }

      /*
       * ======================================================
       * NEW NUMBER
       * NOW SEND OTP
       * ======================================================
       */

      console.log(
        "📱 New mobile. Sending OTP:",
        phoneNumber
      );

      const appVerifier =
        getRecaptchaVerifier();

      if (!appVerifier) {
        throw new Error(
          "Unable to initialize reCAPTCHA."
        );
      }

      const confirmationResult =
        await signInWithPhoneNumber(
          auth,
          phoneNumber,
          appVerifier
        );

      confirmationResultRef.current =
        confirmationResult;

      setOtpSent(true);
      setOtpVerified(false);
      setOtp("");

      alert(
        `📱 OTP sent successfully to ${phoneNumber}`
      );
    } catch (error: any) {
      console.error(
        "SEND OTP ERROR:",
        error
      );

      resetRecaptcha();

      switch (error?.code) {
        case "auth/invalid-phone-number":
          alert(
            "❌ Invalid mobile number."
          );
          break;

        case "auth/too-many-requests":
          alert(
            "❌ Too many OTP requests. Please wait and try again later."
          );
          break;

        case "auth/quota-exceeded":
          alert(
            "❌ SMS quota exceeded. Please try again later."
          );
          break;

        case "auth/operation-not-allowed":
          alert(
            "❌ Phone Authentication is not enabled in Firebase."
          );
          break;

        case "auth/captcha-check-failed":
          alert(
            "❌ Firebase reCAPTCHA verification failed. Please try again."
          );
          break;

        case "auth/invalid-app-credential":
          alert(
            "❌ Firebase reCAPTCHA application credential is invalid. Please refresh and try again."
          );
          break;

        case "auth/argument-error":
          alert(
            "❌ Firebase reCAPTCHA configuration error. Please refresh and try again."
          );
          break;

        case "auth/app-not-authorized":
          alert(
            "❌ This website is not authorized in Firebase Authentication."
          );
          break;

        case "auth/unauthorized-domain":
          alert(
            "❌ This domain is not authorized in Firebase Authentication."
          );
          break;

        default:
          alert(
            error?.message ||
              "❌ Unable to send OTP."
          );
      }
    } finally {
      setOtpLoading(false);
      setCheckingMobile(false);
    }
  };

  /*
   * ============================================================
   * VERIFY OTP
   * ============================================================
   */

  const verifyOTP = async () => {
    if (
      otp.trim().length !== 6
    ) {
      alert(
        "Please enter the 6-digit OTP."
      );
      return;
    }

    if (
      !confirmationResultRef.current
    ) {
      alert(
        "Please request OTP first."
      );
      return;
    }

    try {
      setVerifyingOtp(true);

      const result =
        await confirmationResultRef.current.confirm(
          otp.trim()
        );

      console.log(
        "OTP verified. Firebase UID:",
        result.user.uid
      );

      setOtpVerified(true);

      resetRecaptcha();

      alert(
        "✅ Mobile number verified successfully!"
      );
    } catch (error: any) {
      console.error(
        "OTP verification error:",
        error
      );

      setOtpVerified(false);

      if (
        error?.code ===
        "auth/invalid-verification-code"
      ) {
        alert(
          "❌ Invalid OTP. Please enter the correct OTP."
        );
      } else if (
        error?.code ===
        "auth/code-expired"
      ) {
        alert(
          "❌ OTP expired. Please request a new OTP."
        );
      } else {
        alert(
          error?.message ||
            "❌ OTP verification failed."
        );
      }
    } finally {
      setVerifyingOtp(false);
    }
  };

  /*
   * ============================================================
   * CHANGE MOBILE
   * ============================================================
   */

  const changeMobile = async () => {
    try {
      await signOut(auth);
    } catch {}

    confirmationResultRef.current =
      null;

    setOtpSent(false);
    setOtpVerified(false);
    setOtp("");

    resetRecaptcha();
  };

  /*
   * ============================================================
   * REGISTER STUDENT
   * ============================================================
   */

  const registerStudent =
    async () => {
      if (
        !fullName.trim() ||
        !mobile.trim() ||
        !password ||
        !college.trim() ||
        !course.trim() ||
        !year.trim()
      ) {
        alert(
          "Please fill all fields."
        );
        return;
      }

      if (
        !otpSent ||
        !otpVerified
      ) {
        alert(
          "Please verify your mobile number with OTP first."
        );
        return;
      }

      if (
        password.length < 6
      ) {
        alert(
          "Password should be at least 6 characters."
        );
        return;
      }

      const cleanedMobile =
        mobile.replace(/\D/g, "").trim();

      if (
        !/^[6-9]\d{9}$/.test(
          cleanedMobile
        )
      ) {
        alert(
          "Please enter a valid 10-digit Indian mobile number."
        );
        return;
      }

      try {
        setLoading(true);

        const currentUser =
          auth.currentUser;

        if (!currentUser) {
          alert(
            "❌ OTP verification session expired. Please verify OTP again."
          );

          setOtpVerified(false);

          return;
        }

        /*
         * ======================================================
         * SECOND SAFETY CHECK
         * ======================================================
         *
         * Even though we checked before OTP,
         * check again before account creation.
         */

        const duplicateCheck =
          await fetch(
            "/api/student/check-mobile",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                mobile:
                  cleanedMobile,
              }),
            }
          );

        const duplicateData =
          await duplicateCheck.json();

        if (
          duplicateCheck.ok &&
          duplicateData.exists === true
        ) {
          alert(
            "⚠️ This mobile number is already registered.\n\nPlease login using your existing SBC account."
          );

          try {
            await signOut(auth);
          } catch {}

          setOtpSent(false);
          setOtpVerified(false);
          confirmationResultRef.current =
            null;

          return;
        }

        /*
         * ======================================================
         * CREATE LOGIN EMAIL
         * ======================================================
         */

        const loginEmail =
          `${cleanedMobile}@student.spc`;

        const emailCredential =
          EmailAuthProvider.credential(
            loginEmail,
            password
          );

        /*
         * ======================================================
         * LINK PHONE AUTH + EMAIL/PASSWORD
         * ======================================================
         */

        const linkedUser =
          await linkWithCredential(
            currentUser,
            emailCredential
          );

        const uid =
          linkedUser.user.uid;

        /*
         * ======================================================
         * CREATE SBC CARD
         * ======================================================
         */

        const cardNumber =
          "SBC" +
          Math.floor(
            100000 +
              Math.random() *
                900000
          );

        /*
         * ======================================================
         * SAVE STUDENT
         * ======================================================
         */

        await setDoc(
          doc(
            db,
            "students",
            uid
          ),
          {
            uid,

            fullName:
              fullName.trim(),

            mobile:
              cleanedMobile,

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

            phoneVerified:
              true,

            createdAt:
              serverTimestamp(),
          }
        );

        /*
         * ======================================================
         * LOGOUT AFTER REGISTRATION
         * ======================================================
         */

        await signOut(auth);

        confirmationResultRef.current =
          null;

        resetRecaptcha();

        alert(
          `✅ Student registration successful!\n\nYour SBC Card Number: ${cardNumber}\n\nYour account is waiting for admin approval.`
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

          try {
            await signOut(auth);
          } catch {}
        } else if (
          error?.code ===
          "auth/credential-already-in-use"
        ) {
          alert(
            "❌ This mobile number is already linked to another account."
          );

          try {
            await signOut(auth);
          } catch {}
        } else if (
          error?.code ===
          "auth/provider-already-linked"
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
              "❌ Student registration failed."
          );
        }
      } finally {
        setLoading(false);
      }
    };

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <main className="min-h-screen bg-[#f5f3ed] text-[#07111f]">

      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(212,175,55,0.14),transparent_32%),radial-gradient(circle_at_90%_85%,rgba(7,17,31,0.09),transparent_30%),linear-gradient(135deg,#fffdf7_0%,#f5f3ed_52%,#eeeade_100%)]" />

        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#d4af37]/10 blur-3xl" />

        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[#07111f]/10 blur-3xl" />

        <div className="relative w-full max-w-6xl">

          {/* BACK */}

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
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
                  Start your
                  <span className="block text-[#f1cf63]">
                    SBC journey.
                  </span>
                </h2>

                <p className="mt-5 max-w-sm text-sm leading-6 text-white/55">
                  Register once, get your SBC card and unlock exclusive student benefits from partner businesses.
                </p>

              </div>

              <div className="relative space-y-3">

                <div className="grid grid-cols-2 gap-3">

                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-xl">
                      🎁
                    </p>

                    <p className="mt-2 text-xs font-black">
                      Exclusive Offers
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-xl">
                      ⭐
                    </p>

                    <p className="mt-2 text-xs font-black">
                      Reward Points
                    </p>
                  </div>

                </div>

                <div className="flex items-center justify-between pt-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
                  <span>
                    Secure Registration
                  </span>

                  <span className="text-[#f1cf63]">
                    SBC • 2026
                  </span>
                </div>

              </div>

            </div>

            {/* FORM PANEL */}

            <div className="p-6 sm:p-9 lg:p-11">

              {/* MOBILE BRANDING */}

              <div className="mb-7 text-center lg:hidden">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#07111f] text-base font-black text-[#f1cf63] shadow-lg">
                  SBC
                </div>

              </div>

              <div className="text-center lg:text-left">

                <div className="inline-flex items-center rounded-full border border-[#d4af37]/30 bg-[#fff8df] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#8a680c]">
                  ✦ Student Registration
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-[#07111f] sm:text-4xl">
                  Create Your SBC Account
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                  Complete your details and verify your mobile number.
                </p>

              </div>

              <div className="mt-8 space-y-4">

                {/* NAME */}

                <div>

                  <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                    Full Name
                  </label>

                  <div className="relative">

                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                      👤
                    </span>

                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) =>
                        setFullName(
                          e.target.value
                        )
                      }
                      disabled={loading}
                      className="w-full rounded-2xl border border-black/10 bg-[#fbfaf6] py-3.5 pl-12 pr-4 outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10 disabled:bg-slate-100"
                    />

                  </div>

                </div>

                {/* MOBILE */}

                <div>

                  <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                    Mobile Number
                  </label>

                  <div className="flex gap-2">

                    <div className="flex items-center rounded-2xl border border-black/10 bg-[#07111f] px-4 text-sm font-black text-[#f1cf63]">
                      +91
                    </div>

                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={mobile}
                      onChange={(e) => {
                        setMobile(
                          e.target.value
                            .replace(
                              /\D/g,
                              ""
                            )
                            .slice(
                              0,
                              10
                            )
                        );
                      }}
                      disabled={
                        otpSent ||
                        loading ||
                        otpLoading
                      }
                      className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-[#fbfaf6] p-3.5 outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10 disabled:bg-slate-100"
                    />

                  </div>

                </div>

                {/* SECURITY NOTE */}

                <div className="rounded-2xl border border-[#d4af37]/20 bg-[#fffdf5] p-4">

                  <p className="text-sm font-black text-[#8a680c]">
                    🔐 Secure Mobile Verification
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Your mobile number is checked before OTP is sent. Already registered numbers cannot create another SBC account.
                  </p>

                </div>

                {/* SEND OTP */}

                {!otpSent && (
                  <button
                    id="student-send-otp-button"
                    type="button"
                    onClick={sendOTP}
                    disabled={
                      otpLoading ||
                      checkingMobile ||
                      mobile.length !==
                        10 ||
                      !fullName.trim()
                    }
                    className="w-full rounded-2xl bg-[#07111f] py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-[#101d2e] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {checkingMobile
                      ? "🔎 Checking Mobile..."
                      : otpLoading
                      ? "📱 Sending OTP..."
                      : "📱 Send OTP →"}
                  </button>
                )}

                {/* OTP */}

                {otpSent && (
                  <div className="rounded-[1.5rem] border border-[#d4af37]/25 bg-[#fffdf5] p-5">

                    <div className="mb-4">

                      <p className="font-black text-[#8a680c]">
                        📱 OTP Verification
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Enter the 6-digit OTP sent to
                        <strong className="text-[#07111f]">
                          {" "}
                          +91 {mobile}
                        </strong>
                      </p>

                    </div>

                    {!otpVerified ? (
                      <>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          placeholder="Enter 6-digit OTP"
                          value={otp}
                          onChange={(e) =>
                            setOtp(
                              e.target.value
                                .replace(
                                  /\D/g,
                                  ""
                                )
                                .slice(
                                  0,
                                  6
                                )
                            )
                          }
                          className="w-full rounded-2xl border border-[#d4af37]/35 bg-white p-4 text-center text-2xl font-black tracking-[0.5em] outline-none focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10"
                        />

                        <button
                          type="button"
                          onClick={
                            verifyOTP
                          }
                          disabled={
                            verifyingOtp ||
                            otp.length !==
                              6
                          }
                          className="mt-3 w-full rounded-2xl bg-[#07111f] py-3.5 text-sm font-black text-white transition hover:bg-[#101d2e] disabled:opacity-50"
                        >
                          {verifyingOtp
                            ? "⏳ Verifying..."
                            : "✅ Verify OTP"}
                        </button>

                        <button
                          type="button"
                          onClick={
                            sendOTP
                          }
                          disabled={
                            otpLoading ||
                            checkingMobile
                          }
                          className="mt-2 w-full rounded-xl py-2.5 text-sm font-bold text-[#a37b0d] transition hover:bg-[#fff8df] disabled:opacity-50"
                        >
                          {checkingMobile
                            ? "Checking..."
                            : otpLoading
                            ? "Sending..."
                            : "🔄 Resend OTP"}
                        </button>

                        <button
                          type="button"
                          onClick={
                            changeMobile
                          }
                          className="mt-1 w-full py-2 text-xs font-bold text-slate-500 hover:underline"
                        >
                          Change Mobile Number
                        </button>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">

                        <p className="text-base font-black text-emerald-700">
                          ✅ Mobile Number Verified
                        </p>

                        <p className="mt-1 text-sm font-semibold text-emerald-700">
                          +91 {mobile}
                        </p>

                      </div>
                    )}

                  </div>
                )}

                {/* DETAILS */}

                <div className="grid gap-4 sm:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                      Password
                    </label>

                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Create password"
                      value={password}
                      onChange={(e) =>
                        setPassword(
                          e.target.value
                        )
                      }
                      disabled={
                        loading ||
                        !otpVerified
                      }
                      className="w-full rounded-2xl border border-black/10 bg-[#fbfaf6] p-3.5 outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10 disabled:bg-slate-100"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                      College
                    </label>

                    <input
                      type="text"
                      placeholder="College name"
                      value={college}
                      onChange={(e) =>
                        setCollege(
                          e.target.value
                        )
                      }
                      disabled={
                        loading ||
                        !otpVerified
                      }
                      className="w-full rounded-2xl border border-black/10 bg-[#fbfaf6] p-3.5 outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10 disabled:bg-slate-100"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                      Course
                    </label>

                    <input
                      type="text"
                      placeholder="Course"
                      value={course}
                      onChange={(e) =>
                        setCourse(
                          e.target.value
                        )
                      }
                      disabled={
                        loading ||
                        !otpVerified
                      }
                      className="w-full rounded-2xl border border-black/10 bg-[#fbfaf6] p-3.5 outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10 disabled:bg-slate-100"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                      Year
                    </label>

                    <input
                      type="text"
                      placeholder="Year"
                      value={year}
                      onChange={(e) =>
                        setYear(
                          e.target.value
                        )
                      }
                      disabled={
                        loading ||
                        !otpVerified
                      }
                      className="w-full rounded-2xl border border-black/10 bg-[#fbfaf6] p-3.5 outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10 disabled:bg-slate-100"
                    />

                  </div>

                </div>

                {/* REGISTER */}

                <button
                  type="button"
                  onClick={
                    registerStudent
                  }
                  disabled={
                    loading ||
                    !otpVerified
                  }
                  className="w-full rounded-2xl bg-[#d4af37] py-4 text-sm font-black text-[#07111f] shadow-lg transition hover:bg-[#f1cf63] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "⏳ Registering..."
                    : !otpVerified
                    ? "🔒 Verify Mobile First"
                    : "🎓 Create SBC Account →"}
                </button>

                {/* LOGIN */}

                <div className="rounded-2xl border border-black/5 bg-[#fbfaf6] p-4 text-center text-sm text-slate-500">

                  Already have an account?{" "}

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/student/login"
                      )
                    }
                    className="font-black text-[#a37b0d] hover:text-[#07111f] hover:underline"
                  >
                    Login
                  </button>

                </div>

              </div>

              <div className="mt-7 flex items-center justify-between border-t border-black/5 pt-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>
                  Student Benefit Card
                </span>

                <span className="text-[#a37b0d]">
                  SBC • 2026
                </span>
              </div>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}