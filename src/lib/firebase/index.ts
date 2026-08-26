import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

function envValue(value: string | undefined) {
  return value?.trim() ?? "";
}

function firebaseHostedAuthDomain(value: string | undefined, projectId: string) {
  const host = envValue(value)
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (host.endsWith(".firebaseapp.com") || host.endsWith(".web.app")) {
    return host;
  }

  return projectId ? `${projectId}.firebaseapp.com` : host;
}

function firebaseAuthDomain(value: string | undefined, projectId: string) {
  const hosted = firebaseHostedAuthDomain(value, projectId);

  // Installed PWAs and Safari block third-party cookies on *.firebaseapp.com,
  // which breaks Google sign-in. Production uses the site origin plus a
  // Vercel proxy for /__/auth/* (see vercel.json).
  if (typeof window !== "undefined" && window.location.hostname === "ollyofc.vercel.app") {
    return window.location.host;
  }

  return hosted;
}

const projectId = envValue(import.meta.env.VITE_FIREBASE_PROJECT_ID);

const firebaseConfig = {
  apiKey: envValue(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: firebaseAuthDomain(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, projectId),
  projectId,
  storageBucket: envValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: envValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: envValue(import.meta.env.VITE_FIREBASE_APP_ID),
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

/** Named Firestore DB for `pnpm dev`. Production builds use `(default)`. */
export const firestoreDatabaseId = import.meta.env.DEV ? "ollyofcdev" : "(default)";

export const isUsingDevFirebase = firestoreDatabaseId !== "(default)";

const app = initializeApp(firebaseConfig);

export const firebaseApp = app;
export const auth = getAuth(app);
export const db = import.meta.env.DEV
  ? initializeFirestore(
      app,
      { experimentalForceLongPolling: true },
      firestoreDatabaseId,
    )
  : getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
