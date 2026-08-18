import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

function envValue(value: string | undefined) {
  return value?.trim() ?? "";
}

function firebaseAuthDomain(value: string | undefined) {
  return envValue(value)
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

const firebaseConfig = {
  apiKey: envValue(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: firebaseAuthDomain(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: envValue(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: envValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: envValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: envValue(import.meta.env.VITE_FIREBASE_APP_ID),
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
