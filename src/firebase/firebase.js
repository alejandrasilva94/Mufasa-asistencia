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

// ⬇️ PEGÁ TU CONFIG AQUÍ
const firebaseConfig = {apiKey: "AIzaSyBPhDMQ55qJaoavRNOWIk2fkEwyGr__5GE",
  authDomain: "mufasa-asistencias.firebaseapp.com",
  projectId: "mufasa-asistencias",
  storageBucket: "mufasa-asistencias.firebasestorage.app",
  messagingSenderId: "102919917386",
  appId: "1:102919917386:web:e1c8b1830b2e1a6617fbb3"
};

// ⬇️ Inicializar app de forma segura
// Esto evita initializeApp() duplicado
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ⬇️ Inicializar AUTH de forma segura
let auth;

// Si Auth YA existe -> lo reutilizamos
try {
  auth = getAuth(app);
} catch (e) {
  // Sino, lo inicializamos con persistencia
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

// Firestore
export const db = getFirestore(app);
export { auth };
