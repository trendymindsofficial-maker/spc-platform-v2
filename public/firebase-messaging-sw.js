importScripts(
  "https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey:
    "AIzaSyCLcQaHSbQ7SOz4uJkAgcXFtGg4S77x6Co",

  authDomain:
    "spc-platform-v2.firebaseapp.com",

  projectId:
    "spc-platform-v2",

  storageBucket:
    "spc-platform-v2.firebasestorage.app",

  messagingSenderId:
    "866414423703",

  appId:
    "1:866414423703:web:0c7e002ac9ceb0f74b03d2",
});

const messaging =
  firebase.messaging();

messaging.onBackgroundMessage(
  (payload) => {
    console.log(
      "[SBC SW] Background message received:",
      payload
    );

    const title =
      payload?.notification?.title ||
      payload?.data?.title ||
      "SBC Notification";

    const body =
      payload?.notification?.body ||
      payload?.data?.body ||
      "";

    const url =
      payload?.data?.url ||
      "https://www.studentbenefitcard.com/student/dashboard";

    self.registration.showNotification(
      title,
      {
        body,

        icon:
          "https://www.studentbenefitcard.com/icon-192.png",

        badge:
          "https://www.studentbenefitcard.com/icon-192.png",

        tag:
          "sbc-notification",

        requireInteraction:
          false,

        data: {
          url,
        },
      }
    );
  }
);

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const url =
      event.notification?.data?.url ||
      "https://www.studentbenefitcard.com/student/dashboard";

    event.waitUntil(
      clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      }).then((clientList) => {
        for (const client of clientList) {
          if (
            "focus" in client &&
            "navigate" in client
          ) {
            return client
              .navigate(url)
              .then(() =>
                client.focus()
              );
          }
        }

        if (
          clients.openWindow
        ) {
          return clients.openWindow(
            url
          );
        }

        return undefined;
      })
    );
  }
);