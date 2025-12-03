// src/firebase/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// AUTH para React Native + Expo
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from "firebase/auth";

import AsyncStorage from "@react-native-async-storage/async-storage";

// ⚠️ Config de tu proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBPhDMQ55qJaoavRNOWIk2fkEwyGr__5GE",
  authDomain: "mufasa-asistencias.firebaseapp.com",
  projectId: "mufasa-asistencias",
  storageBucket: "mufasa-asistencias.firebasestorage.app",
  messagingSenderId: "102919917386",
  appId: "1:102919917386:web:e1c8b1830b2e1a6617fbb3",
};

let app;
let auth;

// ✅ Inicializamos la app SOLO una vez
if (!getApps().length) {
  app = initializeApp(firebaseConfig);

  // ✅ Auth con persistencia en AsyncStorage (React Native)
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  app = getApp();
  auth = getAuth(app);
}

// ✅ Firestore
const db = getFirestore(app);

export { app, auth, db };
