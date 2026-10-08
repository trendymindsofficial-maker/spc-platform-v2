
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  auth,
  db,
  AUTH_RECAPTCHA_BYPASSED,
} from "@/lib/firebase";
import { apiFetch } from "@/lib/api";
import {
  checkRecaptchaReachable,
  RECAPTCHA_BLOCKED_MESSAGE,
} from "@/lib/recaptcha-health";

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

import MembershipPayment from "@/components/MembershipPayment";

/*
 * The invisible reCAPTCHA gets its own off-screen container. It must not
 * share a DOM node with any button the user actually clicks.
 */
const RECAPTCHA_CONTAINER_ID = "student-register-recaptcha-container";

export default function StudentRegister() {
  const router = useRouter();

  const [referralCode, setReferralCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [checkingMobile, setCheckingMobile] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  /*
   * Set once the account exists and the student still owes the
   * membership fee. Switches the page to the payment step.
   */
  const [registeredUid, setRegisteredUid] = useState("");
  const [registeredCardNumber, setRegisteredCardNumber] = useState("");
  const [registeredMobile, setRegisteredMobile] = useState("");
  const [membershipActivated, setMembershipActivated] = useState(false);

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [college, setCollege] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");

  const [recaptchaReady, setRecaptchaReady] = useState(false);

  /*
   * True when the browser is confirmed to be blocking reCAPTCHA, so the
   * page can warn before the student wastes an attempt.
   */
  const [recaptchaBlocked, setRecaptchaBlocked] = useState(false);

  const recaptchaRef =
    useRef<RecaptchaVerifier | null>(null);

  const confirmationResultRef =
    useRef<ConfirmationResult | null>(null);

  /*
   * ============================================================
   * REFERRAL CODE
   * ============================================================
   *
   * Example:
   * /student/register?ref=ABC123
   *
   * We only capture the referral code here.
   * The referral becomes successful only after the referred
   * student's eligible SBC payment is successfully completed.
   */

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(
      window.location.search
    );

    const urlReferralCode =
      params.get("ref")?.trim() || "";

    let storedReferralCode = "";

    try {
      storedReferralCode =
        sessionStorage.getItem(
          "sbc_referral_code"
        )?.trim() || "";
    } catch {}

    const ref =
      urlReferralCode || storedReferralCode;

    if (ref) {
      const normalizedRef =
        ref.slice(0, 64);

      setReferralCode(
        normalizedRef
      );

      try {
        sessionStorage.setItem(
          "sbc_referral_code",
          normalizedRef
        );
      } catch {}

      console.log(
        "🎁 SBC referral code captured:",
        normalizedRef
      );
    }
  }, []);

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

  /*
   * The verifier is bound to its own hidden container, never to the
   * Send OTP button.
   *
   * Binding an invisible reCAPTCHA to a real button makes Firebase take
   * over that button's click to run the challenge. With our own onClick
   * on the same button, the challenge and the click fight each other and
   * signInWithPhoneNumber ends up asking a verifier that was never
   * triggered by a user gesture for a token — which Firebase rejects as
   * auth/invalid-app-credential.
   */
  const getRecaptchaVerifier = () => {
    if (typeof window === "undefined") {
      return null;
    }

    if (recaptchaRef.current) {
      return recaptchaRef.current;
    }

    const container =
      document.getElementById(
        RECAPTCHA_CONTAINER_ID
      );

    if (!container) {
      throw new Error(
        "Security verification is not ready yet. Please try again."
      );
    }

    const verifier =
      new RecaptchaVerifier(
        auth,
        RECAPTCHA_CONTAINER_ID,
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

            /*
             * An expired token can never be used again, so drop the
             * verifier and let the next attempt build a fresh one.
             */
            resetRecaptcha();
          },

          "error-callback": () => {
            console.log(
              "Firebase reCAPTCHA error"
            );

            resetRecaptcha();
          },
        }
      );

    recaptchaRef.current =
      verifier;

    return verifier;
  };

  /*
   * ============================================================
   * WARM UP RECAPTCHA
   * ============================================================
   *
   * render() downloads the reCAPTCHA script and builds the widget.
   * Doing it once on mount is the main reason OTP feels slow
   * otherwise: when it runs inside the click handler the user waits
   * for the script download, the widget build AND the SMS.
   *
   * Warming it up here moves all of that off the critical path.
   */
  useEffect(() => {
    let cancelled = false;

    const warmUp = async () => {
      try {
        /*
         * Detect a blocking browser before anything else, so the warning
         * is shown while the student is still filling the form rather
         * than after a failed OTP attempt.
         */
        if (!AUTH_RECAPTCHA_BYPASSED) {
          const health = await checkRecaptchaReachable();

          if (cancelled) return;

          if (health === "blocked") {
            setRecaptchaBlocked(true);

            console.error(
              "reCAPTCHA is blocked by this browser. Firebase phone auth cannot work until it is allowed."
            );

            return;
          }
        }

        const verifier = getRecaptchaVerifier();

        if (!verifier || cancelled) return;

        if (!AUTH_RECAPTCHA_BYPASSED) {
          await verifier.render();
        }

        if (!cancelled) {
          setRecaptchaReady(true);

          console.log(
            AUTH_RECAPTCHA_BYPASSED
              ? "reCAPTCHA bypassed (local testing)"
              : "reCAPTCHA ready"
          );
        }
      } catch (error) {
        console.warn(
          "reCAPTCHA warm-up skipped:",
          error
        );
      }
    };

    warmUp();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    /*
     * clear() does not always empty the host element, and a leftover
     * widget in there makes the next verifier fail to mount.
     */
    if (typeof window !== "undefined") {
      const container =
        document.getElementById(
          RECAPTCHA_CONTAINER_ID
        );

      if (container) {
        container.innerHTML = "";
      }
    }

    setRecaptchaReady(false);
  };

  /*
   * ============================================================
   * CHECK MOBILE BEFORE OTP
   * ============================================================
   *
   * Existing registered mobile:
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
          await apiFetch(
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

    /*
     * Fail early with a useful message rather than letting Firebase
     * return auth/invalid-app-credential.
     */
    if (recaptchaBlocked) {
      alert("❌ " + RECAPTCHA_BLOCKED_MESSAGE);
      return;
    }

    try {
      setOtpLoading(true);

      /*
       * ======================================================
       * DUPLICATE CHECK + RECAPTCHA, IN PARALLEL
       * ======================================================
       *
       * The duplicate check still gates the OTP — no SMS is sent
       * unless it comes back clean. But there is no reason to wait
       * for it before getting reCAPTCHA ready, so both run at once
       * and the user waits for the slower of the two instead of the
       * sum of both.
       *
       * The verifier is usually already warm from mount, in which
       * case this resolves instantly.
       */

      const verifierPromise = (async () => {
        const verifier = getRecaptchaVerifier();

        if (!verifier) {
          throw new Error(
            "Unable to initialize security verification."
          );
        }

        /*
         * When reCAPTCHA is bypassed for local testing there is no
         * widget to render, and waiting on render() would only add
         * latency to the thing we are trying to speed up.
         */
        if (!AUTH_RECAPTCHA_BYPASSED) {
          await verifier.render();
        }

        return verifier;
      })();

      /*
       * Avoid an unhandled rejection if the duplicate check wins the
       * race and we return early.
       */
      verifierPromise.catch(() => {});

      const alreadyRegistered =
        await checkMobileAlreadyRegistered(
          cleanedMobile
        );

      if (alreadyRegistered) {
        return;
      }

      console.log(
        "📱 New mobile. Sending OTP:",
        phoneNumber
      );

      const appVerifier =
        await verifierPromise;

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

        /*
         * All of these mean the same thing in practice: Firebase would
         * not accept the reCAPTCHA token for this page.
         *
         * It is almost never the phone number's fault. The two real
         * causes are the page's origin not being an authorized domain,
         * or the browser blocking Google's reCAPTCHA script.
         */
        case "auth/captcha-check-failed":
        case "auth/invalid-app-credential":
        case "auth/argument-error":
        case "auth/app-not-authorized":
        case "auth/unauthorized-domain": {
          const origin =
            typeof window !== "undefined"
              ? window.location.origin
              : "unknown";

          console.error(
            "reCAPTCHA / domain rejected by Firebase.",
            "\n  code       :", error?.code,
            "\n  this origin:", origin,
            "\n\nFix 1: add this exact origin under",
            "Firebase Console > Authentication > Settings > Authorized domains.",
            "Opening the app on a LAN IP such as 192.168.x.x instead of localhost causes this.",
            "\nFix 2: allow google.com/recaptcha — ad blockers, privacy extensions",
            "and Brave Shields block it, which silently breaks phone auth.",
            "\n\nFor fast local testing, register a test number under",
            "Authentication > Sign-in method > Phone > Phone numbers for testing",
            "and set NEXT_PUBLIC_AUTH_DISABLE_RECAPTCHA=true in frontend/.env.local"
          );

          alert(
            "❌ Security verification failed.\n\n" +
              `This page is open on: ${origin}\n\n` +
              "Two usual causes:\n\n" +
              "1) This address is not in your Firebase authorized domains.\n" +
              "   Use http://localhost:3000 instead of a 192.168.x.x address.\n\n" +
              "2) An ad blocker, privacy extension, or Brave Shields is\n" +
              "   blocking Google reCAPTCHA. Turn it off for this site.\n\n" +
              "Then reload and try again. See the browser console for details."
          );
          break;
        }

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

        /*
         * ======================================================
         * CURRENT FIREBASE USER
         * ======================================================
         *
         * IMPORTANT:
         *
         * After OTP verification Firebase Auth has already
         * created / signed in the phone-auth user.
         *
         * Therefore currentUser.uid must be passed to the
         * duplicate-check API so that the API does NOT
         * consider this same user as another registered user.
         */

        const currentUser =
          auth.currentUser;

        if (!currentUser) {
          alert(
            "❌ OTP verification session expired. Please verify OTP again."
          );

          setOtpVerified(false);

          return;
        }

        console.log(
          "👤 Current OTP Firebase UID:",
          currentUser.uid
        );

        /*
         * ======================================================
         * SECOND SAFETY CHECK
         * ======================================================
         *
         * This checks again immediately before account creation.
         *
         * IMPORTANT:
         *
         * excludeUid tells the API:
         *
         * "If the Firebase Auth user belongs to this same UID,
         * do NOT treat it as a duplicate."
         */

        const duplicateCheck =
          await apiFetch(
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

                /*
                 * THIS IS THE IMPORTANT FIX
                 */
                excludeUid:
                  currentUser.uid,
              }),
            }
          );

        const duplicateData =
          await duplicateCheck.json();

        if (!duplicateCheck.ok) {
          throw new Error(
            duplicateData.error ||
              "Unable to verify mobile registration status."
          );
        }

        /*
         * If another student / another Firebase Auth account
         * already owns this mobile, stop registration.
         */

        if (
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
         * ACCOUNT FIRST, THEN PAYMENT
         * ======================================================
         *
         * The SBC membership fee is collected by the hosted
         * Razorpay Payment Button, which reports the payment to
         * our backend over a signed webhook rather than to this
         * page.
         *
         * The webhook has to be able to find the student it is
         * paying for, so the account is created here first, in a
         * deliberately unpaid state:
         *
         *     status           = pending_payment
         *     paymentStatus    = pending
         *     membershipStatus = pending_payment
         *
         * Nothing is granted by this document. Offer redemption
         * and referral credit both require paymentStatus "paid",
         * so an unpaid account carries no benefits at all. Only
         * the verified webhook flips it to active and writes the
         * membership dates.
         */

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
         *
         * Firebase phone user already exists because OTP
         * was verified.
         *
         * We now attach email/password login to that same UID.
         */

        const linkedUser =
          await linkWithCredential(
            currentUser,
            emailCredential
          );

        const uid =
          linkedUser.user.uid;

        console.log(
          "✅ Phone + Email credential linked. UID:",
          uid
        );

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

            /*
             * Unpaid on purpose. Membership dates are written only
             * by the server, when Razorpay confirms the payment
             * over the webhook. The client never sets them.
             */
            membershipStatus:
              "pending_payment",

            membershipPlan:
              "1_year",

            status:
              "pending_payment",

            phoneVerified:
              true,

            // This student's own referral code is separate
            // from the code used to refer them.
            referralCode:
              uid.slice(0, 8).toUpperCase(),

            ...(referralCode
              ? {
                  referredBy:
                    referralCode,
                  referralStatus:
                    "pending",

                  /*
                   * Stays pending until the payment webhook
                   * activates this student. Referral credit is
                   * gated on paymentStatus "paid" server-side.
                   */
                  referralPaymentStatus:
                    "pending",
                }
              : {}),

            paymentStatus:
              "pending",
            paymentAmount:
              199,
            paymentCurrency:
              "INR",

            createdAt:
              serverTimestamp(),
          }
        );

        console.log(
          "✅ Student document created:",
          uid
        );

        /*
         * ======================================================
         * HAND OVER TO PAYMENT
         * ======================================================
         *
         * The account exists but is unpaid, and the Firebase
         * session stays signed in. Showing the payment step now
         * lets the student pay, and lets them sign back in later
         * to finish if they close the tab.
         */

        confirmationResultRef.current =
          null;

        resetRecaptcha();

        setRegisteredUid(uid);
        setRegisteredCardNumber(cardNumber);
        setRegisteredMobile(cleanedMobile);
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

  /*
   * Registration finished and the payment webhook has activated
   * the membership.
   */
  if (membershipActivated) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-[#f7f9fc] px-5 py-10 text-[#07111f]">
        <section className="w-full max-w-md rounded-3xl border border-emerald-200 bg-white p-7 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600">
            ✓
          </div>

          <h1 className="mt-5 text-2xl font-black">
            Welcome to SBC
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Your ₹199 payment is confirmed and your membership is
            active for one year.
          </p>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Your SBC Card Number
            </p>
            <p className="mt-1 text-lg font-black tracking-wide">
              {registeredCardNumber}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.replace("/student/dashboard")}
            className="mt-6 min-h-12 w-full rounded-2xl bg-[#1557d6] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#124bb8]"
          >
            Go to Dashboard →
          </button>
        </section>
      </main>
    );
  }

  /*
   * Account created, membership fee still outstanding.
   *
   * The hosted Razorpay Payment Button takes over from here and the
   * backend webhook decides when the membership becomes active.
   */
  if (registeredUid) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-5 py-10 text-white">
        <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
            Student Benefit Card
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Last step — pay ₹199
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/60">
            Your SBC account is created. Your membership activates as
            soon as your payment is confirmed.
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-wider text-white/45">
              Your SBC Card Number
            </p>
            <p className="mt-1 text-lg font-bold tracking-wide">
              {registeredCardNumber}
            </p>
          </div>

          <div className="mt-6">
            <MembershipPayment
              uid={registeredUid}
              mode="registration"
              registeredMobile={registeredMobile}
              onActivated={() => setMembershipActivated(true)}
            />
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-white/35">
            Closing this page will not lose your payment. You can sign in
            again with your mobile number and password to finish.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#f7f9fc] text-[#07111f]">

      <div className="relative min-h-screen w-full overflow-x-hidden px-0 py-0 sm:flex sm:items-center sm:justify-center sm:px-6 sm:py-8">

        <div className="absolute inset-0 bg-[linear-gradient(180deg,#f7faff_0%,#f7f9fc_45%,#ffffff_100%)]" />

        <div className="absolute -left-24 top-20 hidden h-72 w-72 rounded-full bg-[#d4af37]/10 blur-3xl sm:block" />

        <div className="absolute -right-24 bottom-0 hidden h-80 w-80 rounded-full bg-[#07111f]/10 blur-3xl sm:block" />

        <div className="relative mx-auto w-full min-w-0 max-w-6xl px-0 sm:px-0">

          {/* BACK */}

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="flex h-14 w-full items-center border-b border-black/[.06] bg-white px-4 text-sm font-bold text-[#07111f] shadow-sm sm:mb-4 sm:h-auto sm:w-auto sm:rounded-full sm:border sm:px-4 sm:py-2 sm:text-sm"
          >
            ← Back to Home
          </button>

          <div className="grid w-full min-w-0 max-w-full overflow-hidden border-0 bg-white shadow-none sm:rounded-3xl sm:border sm:border-black/5 sm:shadow-[0_18px_50px_rgba(7,17,31,0.10)] lg:grid-cols-[0.8fr_1.2fr]">

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

            <div className="min-w-0 max-w-full px-4 pb-8 pt-5 sm:p-9 lg:p-11">

              {/* MOBILE BRANDING */}

              <div className="mb-4 flex items-center justify-center gap-3 text-left lg:hidden">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#07111f] text-xs font-black text-[#f1cf63] shadow-md">
                  SBC
                </div>

              </div>

              <div className="text-left">

                <div className="inline-flex items-center rounded-full border border-[#d4af37]/30 bg-[#fff8df] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#8a680c]">
                  ✦ Student Registration
                </div>

                <h1 className="mt-3 max-w-full break-words text-[1.9rem] font-black leading-[1.08] tracking-[-0.03em] text-[#07111f] sm:text-4xl">
                  Create Your SBC Account
                </h1>

                <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
                  Complete your details and verify your mobile number.
                </p>

              </div>

              <div className="mt-6 min-w-0 max-w-full space-y-4 sm:mt-7">

                {/* NAME */}

                <div>

                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500 sm:text-xs">
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
                      className="block h-12 w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-3 text-sm shadow-[0_2px_8px_rgba(7,17,31,.03)] outline-none transition placeholder:text-slate-400 focus:border-[#1557d6] focus:ring-4 focus:ring-[#1557d6]/10 disabled:bg-slate-100 sm:h-auto sm:rounded-2xl sm:py-3.5 sm:pr-4"
                    />

                  </div>

                </div>

                {/* MOBILE */}

                <div>

                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500 sm:text-xs">
                    Mobile Number
                  </label>

                  <div className="flex w-full min-w-0 gap-2">

                    <div className="flex h-12 shrink-0 items-center rounded-xl bg-[#07111f] px-3 text-sm font-black text-[#f1cf63] sm:h-auto sm:rounded-2xl sm:px-4">
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
                      className="block h-12 w-0 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-[0_2px_8px_rgba(7,17,31,.03)] outline-none transition placeholder:text-slate-400 focus:border-[#1557d6] focus:bg-white focus:ring-4 focus:ring-[#1557d6]/10 disabled:bg-slate-100 sm:h-auto sm:rounded-2xl sm:p-3.5"
                    />

                  </div>

                </div>

                {/* SECURITY NOTE */}

                <div className="rounded-xl border border-blue-100 bg-[#f7faff] p-3.5 sm:rounded-2xl sm:p-4">

                  <p className="text-sm font-black text-[#8a680c]">
                    🔐 Secure Mobile Verification
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Your mobile number is checked before OTP is sent. Already registered numbers cannot create another SBC account.
                  </p>

                </div>

                {/* REFERRAL */}

                {referralCode && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-black text-emerald-700">
                      🎁 Referral Applied
                    </p>
                    <p className="mt-1 text-xs leading-5 text-emerald-700/80">
                      You joined SBC using a referral link. Your friend&apos;s
                      referral will be counted after you successfully complete
                      the required SBC payment.
                    </p>
                    <p className="mt-2 text-[11px] font-black uppercase tracking-wider text-emerald-800">
                      Referral Code: {referralCode}
                    </p>
                  </div>
                )}

                {/* RECAPTCHA BLOCKED WARNING */}

                {recaptchaBlocked && (
                  <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
                    <p className="text-sm font-black text-red-700">
                      🛡️ Your browser is blocking OTP
                    </p>

                    <p className="mt-1 text-xs leading-5 text-red-700/80">
                      Google reCAPTCHA is blocked, and Firebase needs it to
                      send the OTP. In{" "}
                      <strong>Brave</strong>, click the lion icon in the
                      address bar and set <strong>Shields = DOWN</strong> for
                      this site. Otherwise turn off your ad blocker or
                      privacy extension here, then reload.
                    </p>
                  </div>
                )}

                {/* LOCAL TEST MODE NOTICE */}

                {AUTH_RECAPTCHA_BYPASSED && (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
                    <p className="text-sm font-black text-amber-800">
                      ⚡ Local test mode — instant OTP
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-800/80">
                      reCAPTCHA is skipped and no real SMS is sent. Only
                      numbers registered under Firebase → Authentication →
                      Phone numbers for testing will work, using the fixed
                      code you set there.
                    </p>
                  </div>
                )}

                {/* SEND OTP */}

                {!otpSent && (
                  <button
                    type="button"
                    onClick={sendOTP}
                    disabled={
                      otpLoading ||
                      checkingMobile ||
                      mobile.length !==
                        10 ||
                      !fullName.trim()
                    }
                    className="h-12 w-full rounded-xl bg-[#07111f] px-4 text-sm font-black text-white shadow-[0_8px_20px_rgba(7,17,31,.12)] transition hover:bg-[#101d2e] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {checkingMobile
                      ? "🔎 Checking Mobile..."
                      : otpLoading
                      ? "📱 Sending OTP..."
                      : recaptchaReady
                      ? "📱 Send OTP →"
                      : "📱 Send OTP"}
                  </button>
                )}

                {/* OTP */}

                {otpSent && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(7,17,31,.04)] sm:rounded-2xl sm:p-5">

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
                          className="block h-14 w-full min-w-0 max-w-full rounded-xl border border-blue-100 bg-white px-3 text-center text-xl font-black tracking-[0.35em] shadow-inner outline-none focus:border-[#1557d6] focus:ring-4 focus:ring-[#1557d6]/10 sm:h-auto sm:rounded-2xl sm:p-4 sm:text-2xl sm:tracking-[0.5em]"
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
                          className="mt-3 h-12 w-full rounded-xl bg-[#07111f] text-sm font-black text-white transition hover:bg-[#101d2e] disabled:opacity-50 sm:h-auto sm:rounded-2xl sm:py-3.5"
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
                          className="mt-1 w-full rounded-xl py-2 text-xs font-bold text-[#1557d6] transition hover:bg-blue-50 disabled:opacity-50 sm:py-2.5 sm:text-sm"
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
                          className="mt-0.5 w-full py-2 text-[11px] font-bold text-slate-500 hover:underline"
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

                <div className="grid min-w-0 max-w-full grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">

                  <div>

                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500 sm:text-xs">
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
                      className="block h-12 w-full min-w-0 max-w-full rounded-xl border border-black/10 bg-[#fbfaf6] px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10 disabled:bg-slate-100 sm:h-auto sm:rounded-2xl sm:p-3.5"
                    />

                  </div>

                  <div>

                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500 sm:text-xs">
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
                      className="block h-12 w-full min-w-0 max-w-full rounded-xl border border-black/10 bg-[#fbfaf6] px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10 disabled:bg-slate-100 sm:h-auto sm:rounded-2xl sm:p-3.5"
                    />

                  </div>

                  <div>

                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500 sm:text-xs">
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
                      className="block h-12 w-full min-w-0 max-w-full rounded-xl border border-black/10 bg-[#fbfaf6] px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10 disabled:bg-slate-100 sm:h-auto sm:rounded-2xl sm:p-3.5"
                    />

                  </div>

                  <div>

                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500 sm:text-xs">
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
                      className="block h-12 w-full min-w-0 max-w-full rounded-xl border border-black/10 bg-[#fbfaf6] px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:bg-white focus:ring-4 focus:ring-[#d4af37]/10 disabled:bg-slate-100 sm:h-auto sm:rounded-2xl sm:p-3.5"
                    />

                  </div>

                </div>

                {/* PAYMENT NOTE */}

                {otpVerified && (
                  <div className="rounded-xl border border-[#d4af37]/25 bg-[#fffdf5] p-3 sm:rounded-2xl sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#07111f]">
                          SBC Membership Fee
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Payable on the next step. Secure payment by
                          Razorpay.
                        </p>
                      </div>

                      <div className="shrink-0 text-lg font-black text-[#8a680c] sm:text-xl">
                        ₹199
                      </div>
                    </div>
                  </div>
                )}

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
                  className="min-h-12 w-full rounded-xl bg-[#1557d6] px-4 py-3.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(21,87,214,.18)] transition hover:bg-[#124bb8] disabled:cursor-not-allowed disabled:opacity-50 sm:h-auto sm:rounded-2xl sm:py-4"
                >
                  {loading
                    ? "⏳ Creating your account..."
                    : !otpVerified
                    ? "🔒 Verify Mobile First"
                    : "Create account & continue to payment →"}
                </button>

                {/* LOGIN */}

                <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3 text-center text-xs text-slate-500 sm:rounded-2xl sm:p-4 sm:text-sm">

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

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:mt-7 sm:pt-5 sm:text-[10px]">
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

      {/*
        Invisible reCAPTCHA host. Kept off-screen and non-interactive,
        and deliberately separate from the Send OTP button so Firebase
        does not hijack that button's click.
      */}
      <div
        id={RECAPTCHA_CONTAINER_ID}
        className="pointer-events-none absolute h-0 w-0 overflow-hidden"
      />

    </main>
  );
}
