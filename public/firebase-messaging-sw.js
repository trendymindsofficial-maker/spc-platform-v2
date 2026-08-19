importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCLcQaHSbQ7SOz4uJkAgcXFtGg4S77x6Co",
  authDomain: "spc-platform-v2.firebaseapp.com",
  projectId: "spc-platform-v2",
  storageBucket: "spc-platform-v2.firebasestorage.app",
  messagingSenderId: "866414423703",
  appId: "1:866414423703:web:0c7e002ac9ceb0f74b03d2",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Background message:",
    payload
  );

  const title =
    payload.notification?.title || "SBC Notification";

  const options = {
    body: payload.notification?.body || "",
    icon: "/icon-192.png",
    data: {
      ...(payload.data || {}),
      url: payload.data?.url || "/student/dashboard",
    },
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url =
    event.notification?.data?.url ||
    "/student/dashboard";

  event.waitUntil(
    clients.openWindow(url)
  );
});
