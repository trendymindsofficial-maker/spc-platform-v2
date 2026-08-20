import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
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

  /*
   * ==========================================
   * BROWSER PERMISSION
   * ==========================================
   *
   * IMPORTANT:
   *
   * If permission is already "granted",
   * NEVER call requestPermission().
   *
   * Only ask when permission is "default".
   */

  let permission =
    Notification.permission;

  if (
    permission === "default"
  ) {
    permission =
      await Notification.requestPermission();
  }

  if (
    permission !== "granted"
  ) {
    throw new Error(
      "Notification permission was not granted."
    );
  }

  /*
   * ==========================================
   * SERVICE WORKER
   * ==========================================
   */

  const registration =
    await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

  /*
   * Wait until service worker is ready.
   */

  await navigator.serviceWorker.ready;

  /*
   * ==========================================
   * FIREBASE MESSAGING
   * ==========================================
   */

  const app = getApp();

  const messaging =
    getMessaging(app);

  /*
   * ==========================================
   * FOREGROUND MESSAGE LISTENER
   * ==========================================
   *
   * This handles notifications when the
   * student dashboard/browser tab is open.
   */

  onMessage(
    messaging,
    (payload) => {
      console.log(
        "🔔 Foreground FCM notification received:",
        payload
      );

      const title =
        payload.notification?.title ||
        "SBC Notification";

      const body =
        payload.notification?.body ||
        "";

      if (
        Notification.permission ===
        "granted"
      ) {
        try {
          const notification =
            new Notification(
              title,
              {
                body,
                icon:
                  "/icon-192.png",
                data: {
                  url:
                    payload.data?.url ||
                    "/student/dashboard",
                },
              }
            );

          notification.onclick =
            () => {
              notification.close();

              const url =
                payload.data?.url ||
                "/student/dashboard";

              window.location.href =
                url;
            };
        } catch (error) {
          console.error(
            "Foreground notification display error:",
            error
          );
        }
      }
    }
  );

  /*
   * ==========================================
   * GET FCM TOKEN
   * ==========================================
   */

  const token =
    await getToken(
      messaging,
      {
        vapidKey:
          VAPID_KEY,

        serviceWorkerRegistration:
          registration,
      }
    );

  if (!token) {
    throw new Error(
      "Unable to get notification token."
    );
  }

  console.log(
    "✅ FCM token received."
  );

  /*
   * ==========================================
   * SAVE TOKEN
   * ==========================================
   */

  await setDoc(
    doc(
      db,
      "fcmTokens",
      token
    ),
    {
      token,

      studentId:
        user.uid,

      platform:
        "web",

      userAgent:
        navigator.userAgent,

      updatedAt:
        serverTimestamp(),

      createdAt:
        serverTimestamp(),
    },
    {
      merge: true,
    }
  );

  console.log(
    "✅ FCM token saved to Firestore."
  );

  return token;
}