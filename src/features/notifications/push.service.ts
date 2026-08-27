import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from "firebase/messaging";

import { db, firebaseApp, isFirebaseConfigured } from "@/lib/firebase";
import { isIosDevice, isStandalonePwa } from "@/lib/pwa";

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim() ?? "";

export function isPushConfigured() {
  return isFirebaseConfigured && Boolean(vapidKey);
}

export function iosNeedsInstalledPwa() {
  return isIosDevice() && !isStandalonePwa();
}

export const IOS_INSTALL_PUSH_MESSAGE =
  "On iPhone, install Ollyo FC to the Home Screen first, then enable notifications.";

export const NOTIFICATION_BLOCKED_MESSAGE =
  "Notifications are blocked for this site. iPhone will not show Allow again. Open Settings → Ollyo FC (the Home Screen app) → Notifications → Allow, then tap the bell again.";

export function canRequestPushPermission() {
  if (!isPushConfigured() || typeof Notification === "undefined") {
    return false;
  }

  if (iosNeedsInstalledPwa()) {
    return false;
  }

  return true;
}

async function getMessagingIfSupported() {
  if (!isPushConfigured() || !(await isSupported())) {
    return null;
  }

  return getMessaging(firebaseApp);
}

async function tokenDocId(token: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));

  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function savePushToken(userId: string, token: string) {
  await setDoc(doc(db, "users", userId, "fcmTokens", await tokenDocId(token)), {
    token,
    userAgent: navigator.userAgent,
    updatedAt: serverTimestamp(),
  });
}

async function readToken(messaging: Messaging) {
  return getToken(messaging, { vapidKey });
}

export async function getExistingPushToken() {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return null;
  }

  const messaging = await getMessagingIfSupported();

  if (!messaging) {
    return null;
  }

  try {
    return await readToken(messaging);
  } catch {
    return null;
  }
}

export async function enablePushNotifications(userId: string) {
  if (iosNeedsInstalledPwa()) {
    throw new Error(IOS_INSTALL_PUSH_MESSAGE);
  }

  if (!canRequestPushPermission()) {
    throw new Error("Push notifications are not available in this browser.");
  }

  if (typeof Notification !== "undefined" && Notification.permission === "denied") {
    throw new Error(NOTIFICATION_BLOCKED_MESSAGE);
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error(NOTIFICATION_BLOCKED_MESSAGE);
  }

  const messaging = await getMessagingIfSupported();

  if (!messaging) {
    throw new Error("Push notifications are not available in this browser.");
  }

  const token = await readToken(messaging);

  if (!token) {
    throw new Error("Could not enable notifications.");
  }

  await savePushToken(userId, token);
  return token;
}

export async function disablePushNotifications(userId: string) {
  const messaging = await getMessagingIfSupported();

  if (!messaging) {
    return;
  }

  let token: string | null = null;

  try {
    token = await readToken(messaging);
  } catch {
    token = null;
  }

  await deleteToken(messaging);

  if (token) {
    await deleteDoc(doc(db, "users", userId, "fcmTokens", await tokenDocId(token)));
  }
}

export const PUSH_ENABLED_EVENT = "ollyfc-push-enabled";

export function emitPushEnabled(enabled: boolean) {
  window.dispatchEvent(new CustomEvent(PUSH_ENABLED_EVENT, { detail: enabled }));
}

export function subscribeToForegroundPush(
  onPayload: (title: string, body: string, url: string) => void,
) {
  let unsubscribe: (() => void) | undefined;

  void (async () => {
    const messaging = await getMessagingIfSupported();

    if (!messaging) {
      return;
    }

    unsubscribe = onMessage(messaging, (payload) => {
      const data = payload.data ?? {};
      const title = data.title || payload.notification?.title || "Ollyo FC";
      const body = data.body || payload.notification?.body || "A new game was created.";
      const url = data.url || (data.gameId ? `/games/${data.gameId}` : "/games");
      onPayload(title, body, url);
    });
  })();

  return () => {
    unsubscribe?.();
  };
}
