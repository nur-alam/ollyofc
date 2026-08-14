import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import type { User } from "firebase/auth";

import { auth, db } from "@/lib/firebase";
import type { UserProfile, UserRole } from "@/types/user";

function getDisplayName(user: User) {
  return user.displayName || user.email?.split("@")[0] || "User";
}

function parseUserRole(value: unknown): UserRole {
  if (value === "admin" || value === "moderator" || value === "user") {
    return value;
  }

  return "user";
}

export function mapUserProfile(id: string, data: DocumentData): UserProfile {
  return {
    id,
    email: typeof data.email === "string" ? data.email : "",
    displayName:
      typeof data.displayName === "string"
        ? data.displayName
        : typeof data.name === "string"
          ? data.name
          : "User",
    photoURL: typeof data.photoURL === "string" ? data.photoURL : undefined,
    role: parseUserRole(data.role),
    playerId: typeof data.playerId === "string" ? data.playerId : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, "users", userId));

  if (!snapshot.exists()) {
    return null;
  }

  return mapUserProfile(snapshot.id, snapshot.data());
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);
  const displayName = getDisplayName(user);
  const email = user.email ?? "";
  const photoURL = user.photoURL ?? "";

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      id: user.uid,
      email,
      displayName,
      photoURL: photoURL || "",
      role: "user",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const created = await getDoc(userRef);

    return mapUserProfile(created.id, created.data() ?? {});
  }

  const existing = mapUserProfile(snapshot.id, snapshot.data());
  const shouldSyncProfile =
    existing.displayName !== displayName ||
    existing.email !== email ||
    (photoURL && existing.photoURL !== photoURL);

  if (shouldSyncProfile) {
    await updateDoc(userRef, {
      displayName,
      email,
      photoURL: photoURL || existing.photoURL || "",
      updatedAt: serverTimestamp(),
    });

    return {
      ...existing,
      displayName,
      email,
      photoURL: photoURL || existing.photoURL,
    };
  }

  return existing;
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export { auth };
