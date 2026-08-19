import {
  getMessaging,
  getToken,
  isSupported,
} from "firebase/messaging";

import { getApp } from "firebase/app";

import { auth, db } from "@/lib/firebase";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

const VAPID_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export async function enableStudentNotifications() {
  if (typeof window === "undefined") {
    throw new Error(
      "Notifications are only available in a browser."
    );
  }

  if (!("Notification" in window)) {
    throw new Error(
      "This browser does not support notifications."
    );
  }

  if (!VAPID_KEY) {
    throw new Error(
      "Firebase VAPID key is not configured."
    );
  }

  const supported = await isSupported();

  if (!supported) {
    throw new Error(
      "Web push is not supported in this browser."
    );
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "Please login first."
    );
  }

  const permission =
    await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error(
      "Notification permission was not granted."
    );
  }

  const registration =
    await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

  const app = getApp();

  const messaging =
    getMessaging(app);

  const token = await getToken(
    messaging,
    {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration:
        registration,
    }
  );

  if (!token) {
    throw new Error(
      "Unable to get notification token."
    );
  }

  await setDoc(
    doc(
      db,
      "fcmTokens",
      token
    ),
    {
      token,
      studentId: user.uid,
      platform: "web",
      userAgent:
        navigator.userAgent,
      createdAt:
        serverTimestamp(),
      updatedAt:
        serverTimestamp(),
    },
    {
      merge: true,
    }
  );

  return token;
}