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

const messaging = firebase.messaging();

/*
|--------------------------------------------------------------------------
| BACKGROUND NOTIFICATION
|--------------------------------------------------------------------------
|
| The server sends a notification payload.
| Firebase displays it automatically when the
| SBC site is in the background / screen is off.
|
*/

/*
|--------------------------------------------------------------------------
| NOTIFICATION CLICK
|--------------------------------------------------------------------------
*/

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const url =
      event.notification?.data?.url ||
      "/student/dashboard";

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          /*
           * If SBC is already open,
           * navigate/focus that tab.
           */

          for (const client of clientList) {
            if (
              "navigate" in client &&
              "focus" in client
            ) {
              return client
                .navigate(url)
                .then(() => client.focus());
            }
          }

          /*
           * Otherwise open SBC dashboard.
           */

          if (clients.openWindow) {
            return clients.openWindow(url);
          }

          return undefined;
        })
    );
  }
);