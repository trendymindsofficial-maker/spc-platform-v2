import { initializeApp } from "firebase/app";

import { getFirestore } from "firebase/firestore";

import { getAuth } from "firebase/auth";

import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCLcQaHSbQ7SOz4uJkAgcXFtGg4S77x6Co",

  authDomain: "spc-platform-v2.firebaseapp.com",

  projectId: "spc-platform-v2",

  storageBucket: "spc-platform-v2.firebasestorage.app",

  messagingSenderId: "866414423703",

  appId: "1:866414423703:web:0c7e002ac9ceb0f74b03d2",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const auth = getAuth(app);

export const storage = getStorage(app);