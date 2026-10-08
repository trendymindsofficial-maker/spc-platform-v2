import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

/*
|--------------------------------------------------------------------------
| FIREBASE WEB CONFIG
|--------------------------------------------------------------------------
|
| These values are public by design (they ship in the browser bundle) and
| are protected by Firestore/Storage security rules, not by secrecy.
|
| They are read from NEXT_PUBLIC_* variables so the same build can point at
| a different Firebase project, and fall back to the live SBC project so
| nothing breaks when the variables are absent.
|
*/

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyCLcQaHSbQ7SOz4uJkAgcXFtGg4S77x6Co",

  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "spc-platform-v2.firebaseapp.com",

  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "spc-platform-v2",

  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "spc-platform-v2.firebasestorage.app",

  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "866414423703",

  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:866414423703:web:0c7e002ac9ceb0f74b03d2",
};

/*
 * Next.js fast-refresh and route transitions can evaluate this module more
 * than once. Reuse the existing app instead of re-initializing it.
 */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

/*
|--------------------------------------------------------------------------
| LOCAL DEVELOPMENT: INSTANT OTP
|--------------------------------------------------------------------------
|
| Real phone auth on the web always costs time we cannot remove: Google
| has to issue a reCAPTCHA token, then the carrier has to deliver an SMS.
| The SMS alone is usually several seconds and is entirely out of our
| hands.
|
| For local work, Firebase supports registering fictional test numbers
| that skip the SMS completely — you get back the fixed code you chose
| when you registered the number.
|
|   Firebase Console -> Authentication -> Sign-in method -> Phone
|     -> "Phone numbers for testing"
|     e.g. +91 8106811285  ->  123456
|
| appVerificationDisabledForTesting additionally skips the reCAPTCHA
| round trip, which makes the OTP step effectively instant and sidesteps
| reCAPTCHA failures on a dev machine.
|
| Safety: this is double-gated on NODE_ENV being development AND an opt-in
| env flag, so a production build can never turn it on. Firebase itself is
| the real backstop — the server only honours this for numbers registered
| as test numbers, so it cannot be used to skip verification for a real
| person's phone.
*/

export const AUTH_RECAPTCHA_BYPASSED =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_AUTH_DISABLE_RECAPTCHA === "true";

if (AUTH_RECAPTCHA_BYPASSED && typeof window !== "undefined") {
  auth.settings.appVerificationDisabledForTesting = true;

  console.warn(
    "[SBC] reCAPTCHA verification is DISABLED for local testing. " +
      "Only phone numbers registered under Firebase > Authentication > " +
      "Phone numbers for testing will work, and no real SMS is sent."
  );
}
