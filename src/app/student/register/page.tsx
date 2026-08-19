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
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function StudentRegister() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
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

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    return () => {
      try {
        recaptchaRef.current?.clear();
      } catch {}
      recaptchaRef.current = null;
      confirmationResultRef.current = null;
    };
  }, []);

  const getPhoneNumber = () => {
    const cleaned = mobile.replace(/\D/g, "").trim();
    if (cleaned.length !== 10 || !/^[6-9]\d{9}$/.test(cleaned)) {
      return null;
    }
    return `+91${cleaned}`;
  };

  /*
   * Firebase Web Phone Auth:
   * invisible reCAPTCHA is attached to the Send OTP button.
   * This is the documented Firebase flow.
   */
  const getRecaptchaVerifier = () => {
    if (typeof window === "undefined") return null;

    if (recaptchaRef.current) {
      return recaptchaRef.current;
    }

    const button = document.getElementById("student-send-otp-button");
    if (!button) {
      throw new Error("Send OTP button is not available.");
    }

    const verifier = new RecaptchaVerifier(
      auth,
      "student-send-otp-button",
      {
        size: "invisible",
        callback: () => {
          console.log("Firebase reCAPTCHA verified");
        },
        "expired-callback": () => {
          console.log("Firebase reCAPTCHA expired");
        },
        "error-callback": () => {
          console.log("Firebase reCAPTCHA error");
        },
      }
    );

    recaptchaRef.current = verifier;
    return verifier;
  };

  const resetRecaptcha = () => {
    try {
      recaptchaRef.current?.clear();
    } catch {}
    recaptchaRef.current = null;
  };

  const sendOTP = async () => {
    if (otpLoading) return;

    if (!fullName.trim()) {
      alert("Please enter your full name.");
      return;
    }

    const phoneNumber = getPhoneNumber();
    if (!phoneNumber) {
      alert("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    try {
      setOtpLoading(true);

      const appVerifier = getRecaptchaVerifier();
      if (!appVerifier) {
        throw new Error("Unable to initialize reCAPTCHA.");
      }

      console.log("Sending OTP to:", phoneNumber);

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        appVerifier
      );

      confirmationResultRef.current = confirmationResult;
      setOtpSent(true);
      setOtpVerified(false);
      setOtp("");

      alert(`📱 OTP sent successfully to ${phoneNumber}`);
    } catch (error: any) {
      console.error("SEND OTP ERROR:", error);
      resetRecaptcha();

      switch (error?.code) {
        case "auth/invalid-phone-number":
          alert("❌ Invalid mobile number.");
          break;
        case "auth/too-many-requests":
          alert("❌ Too many OTP requests. Please wait and try again later.");
          break;
        case "auth/quota-exceeded":
          alert("❌ SMS quota exceeded. Please try again later.");
          break;
        case "auth/operation-not-allowed":
          alert("❌ Phone Authentication is not enabled in Firebase.");
          break;
        case "auth/captcha-check-failed":
          alert("❌ Firebase reCAPTCHA verification failed. Please try again.");
          break;
        case "auth/invalid-app-credential":
          alert("❌ Firebase reCAPTCHA application credential is invalid. Please refresh and try again.");
          break;
        case "auth/argument-error":
          alert("❌ Firebase reCAPTCHA configuration error. Please refresh and try again.");
          break;
        case "auth/app-not-authorized":
          alert("❌ This website is not authorized in Firebase Authentication.");
          break;
        case "auth/unauthorized-domain":
          alert("❌ This domain is not authorized in Firebase Authentication.");
          break;
        default:
          alert(error?.message || "❌ Unable to send OTP.");
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.trim().length !== 6) {
      alert("Please enter the 6-digit OTP.");
      return;
    }

    if (!confirmationResultRef.current) {
      alert("Please request OTP first.");
      return;
    }

    try {
      setVerifyingOtp(true);

      const result = await confirmationResultRef.current.confirm(otp.trim());

      console.log("OTP verified. Firebase UID:", result.user.uid);

      setOtpVerified(true);
      resetRecaptcha();

      alert("✅ Mobile number verified successfully!");
    } catch (error: any) {
      console.error("OTP verification error:", error);
      setOtpVerified(false);

      if (error?.code === "auth/invalid-verification-code") {
        alert("❌ Invalid OTP. Please enter the correct OTP.");
      } else if (error?.code === "auth/code-expired") {
        alert("❌ OTP expired. Please request a new OTP.");
      } else {
        alert(error?.message || "❌ OTP verification failed.");
      }
    } finally {
      setVerifyingOtp(false);
    }
  };

  const changeMobile = async () => {
    try {
      await signOut(auth);
    } catch {}

    confirmationResultRef.current = null;
    setOtpSent(false);
    setOtpVerified(false);
    setOtp("");
    resetRecaptcha();
  };

  const registerStudent = async () => {
    if (
      !fullName.trim() ||
      !mobile.trim() ||
      !password ||
      !college.trim() ||
      !course.trim() ||
      !year.trim()
    ) {
      alert("Please fill all fields.");
      return;
    }

    if (!otpSent || !otpVerified) {
      alert("Please verify your mobile number with OTP first.");
      return;
    }

    if (password.length < 6) {
      alert("Password should be at least 6 characters.");
      return;
    }

    const cleanedMobile = mobile.replace(/\D/g, "").trim();

    if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
      alert("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    try {
      setLoading(true);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        alert("❌ OTP verification session expired. Please verify OTP again.");
        setOtpVerified(false);
        return;
      }

      const loginEmail = `${cleanedMobile}@student.spc`;

      const emailCredential = EmailAuthProvider.credential(
        loginEmail,
        password
      );

      const linkedUser = await linkWithCredential(
        currentUser,
        emailCredential
      );

      const uid = linkedUser.user.uid;

      const cardNumber =
        "SBC" +
        Math.floor(100000 + Math.random() * 900000);

      await setDoc(doc(db, "students", uid), {
        uid,
        fullName: fullName.trim(),
        mobile: cleanedMobile,
        email: loginEmail,
        college: college.trim(),
        course: course.trim(),
        year: year.trim(),
        cardNumber,
        status: "pending",
        phoneVerified: true,
        createdAt: serverTimestamp(),
      });

      await signOut(auth);

      confirmationResultRef.current = null;
      resetRecaptcha();

      alert(
        `✅ Student registration successful!\n\nYour SBC Card Number: ${cardNumber}\n\nYour account is waiting for admin approval.`
      );

      router.replace("/student/login");
    } catch (error: any) {
      console.error("Student registration error:", error);

      if (error?.code === "auth/email-already-in-use") {
        alert("❌ This mobile number is already registered.");
        try { await signOut(auth); } catch {}
      } else if (error?.code === "auth/credential-already-in-use") {
        alert("❌ This mobile number is already linked to another account.");
        try { await signOut(auth); } catch {}
      } else if (error?.code === "auth/provider-already-linked") {
        alert("❌ This mobile number is already registered.");
      } else if (error?.code === "auth/weak-password") {
        alert("❌ Password should be at least 6 characters.");
      } else {
        alert(error?.message || "❌ Student registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-xl">

        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200"
          >
            ← Back to Home
          </button>
        </div>

        <h1 className="mb-2 text-center text-3xl font-bold text-blue-700">
          🎓 Student Registration
        </h1>

        <p className="mb-6 text-center text-gray-500">
          Create your SBC Student Account
        </p>

        <div className="space-y-4">

          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-600"
          />

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Mobile Number
            </label>

            <div className="flex gap-2">
              <div className="flex items-center rounded-xl border border-gray-300 bg-gray-50 px-4 font-bold text-gray-700">
                +91
              </div>

              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                placeholder="10-digit Mobile Number"
                value={mobile}
                onChange={(e) =>
                  setMobile(
                    e.target.value.replace(/\D/g, "").slice(0, 10)
                  )
                }
                disabled={otpSent || loading}
                className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-600 disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-700">
              🔐 Secure Mobile Verification
            </p>
            <p className="mt-1 text-xs text-blue-600">
              Firebase will automatically perform security verification when you send the OTP.
            </p>
          </div>

          {!otpSent && (
            <button
              id="student-send-otp-button"
              type="button"
              onClick={sendOTP}
              disabled={
                otpLoading ||
                mobile.length !== 10 ||
                !fullName.trim()
              }
              className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {otpLoading ? "📱 Sending OTP..." : "📱 Send OTP"}
            </button>
          )}

          {otpSent && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <div className="mb-4">
                <p className="font-bold text-blue-700">
                  📱 OTP Verification
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Enter the 6-digit OTP sent to
                  <strong> +91 {mobile}</strong>
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
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    className="w-full rounded-xl border border-blue-300 bg-white p-4 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-blue-600"
                  />

                  <button
                    type="button"
                    onClick={verifyOTP}
                    disabled={verifyingOtp || otp.length !== 6}
                    className="mt-3 w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {verifyingOtp ? "⏳ Verifying..." : "✅ Verify OTP"}
                  </button>

                  <button
                    type="button"
                    onClick={sendOTP}
                    disabled={otpLoading}
                    className="mt-3 w-full rounded-xl bg-white py-3 font-semibold text-blue-600 hover:bg-blue-100 disabled:opacity-50"
                  >
                    {otpLoading ? "Sending..." : "🔄 Resend OTP"}
                  </button>

                  <button
                    type="button"
                    onClick={changeMobile}
                    className="mt-2 w-full py-2 text-sm font-semibold text-gray-600 hover:underline"
                  >
                    Change Mobile Number
                  </button>
                </>
              ) : (
                <div className="rounded-xl bg-green-100 p-4 text-center">
                  <p className="text-lg font-bold text-green-700">
                    ✅ Mobile Number Verified
                  </p>
                  <p className="mt-1 text-sm text-green-700">
                    +91 {mobile}
                  </p>
                </div>
              )}
            </div>
          )}

          <input
            type="password"
            autoComplete="new-password"
            placeholder="Create Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || !otpVerified}
            className="w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-600 disabled:bg-gray-100"
          />

          <input
            type="text"
            placeholder="College"
            value={college}
            onChange={(e) => setCollege(e.target.value)}
            disabled={loading || !otpVerified}
            className="w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-600 disabled:bg-gray-100"
          />

          <input
            type="text"
            placeholder="Course"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            disabled={loading || !otpVerified}
            className="w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-600 disabled:bg-gray-100"
          />

          <input
            type="text"
            placeholder="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={loading || !otpVerified}
            className="w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-600 disabled:bg-gray-100"
          />

          <button
            type="button"
            onClick={registerStudent}
            disabled={loading || !otpVerified}
            className="w-full rounded-xl bg-green-600 py-4 text-lg font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "⏳ Registering..."
              : !otpVerified
              ? "🔒 Verify Mobile First"
              : "🎓 Register Student"}
          </button>

          <div className="pt-2 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/student/login")}
              className="font-bold text-blue-600 hover:underline"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}