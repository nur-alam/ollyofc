import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import type { User } from "firebase/auth";

import { auth, db } from "@/lib/firebase";
import type { UserProfile, UserRole } from "@/types/user";
import { parsePosition, type PlayerPosition } from "@/types/player";

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
    isActive: typeof data.isActive === "boolean" ? data.isActive : true,
    position: parsePosition(data.position ?? data.Position),
    isSeed: data.isSeed === true,
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
      isActive: true,
      position: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const created = await getDoc(userRef);

    return mapUserProfile(created.id, created.data() ?? {});
  }

  const existing = mapUserProfile(snapshot.id, snapshot.data());
  const data = snapshot.data();
  const missingPlayerFields =
    typeof data.isActive !== "boolean" || typeof data.position !== "string";

  const shouldSyncProfile =
    existing.email !== email ||
    (photoURL && existing.photoURL !== photoURL) ||
    missingPlayerFields;

  if (shouldSyncProfile) {
    await updateDoc(userRef, {
      email,
      photoURL: photoURL || existing.photoURL || "",
      isActive: existing.isActive,
      position: existing.position,
      updatedAt: serverTimestamp(),
    });

    return {
      ...existing,
      email,
      photoURL: photoURL || existing.photoURL,
    };
  }

  return existing;
}

export type UserCreateInput = {
  displayName: string;
  email: string;
  position: PlayerPosition | "";
};

export type UserUpdateInput = {
  displayName: string;
  email: string;
  position: PlayerPosition | "";
  isActive: boolean;
};

export async function createUserProfile(input: UserCreateInput): Promise<void> {
  const userRef = doc(collection(db, "users"));

  await setDoc(userRef, {
    id: userRef.id,
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName.trim(),
    photoURL: "",
    role: "user",
    isActive: true,
    position: input.position,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserProfile(
  userId: string,
  input: UserUpdateInput,
): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    displayName: input.displayName.trim(),
    email: input.email.trim().toLowerCase(),
    position: input.position,
    isActive: input.isActive,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteUserProfile(userId: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId));
}

export async function updateUserDisplayName(
  userId: string,
  displayName: string,
): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    displayName,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserPosition(
  userId: string,
  position: PlayerPosition | "",
): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    position,
    updatedAt: serverTimestamp(),
  });
}

export async function setUserActive(userId: string, isActive: boolean): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToUsers(
  onData: (users: UserProfile[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "users"),
    (snapshot) => {
      const users = snapshot.docs
        .map((userDoc) => mapUserProfile(userDoc.id, userDoc.data()))
        .sort((left, right) => left.displayName.localeCompare(right.displayName));
      onData(users);
    },
    (error) => {
      onData([]);
      onError?.(error instanceof Error ? error.message : "Could not load squad.");
    },
  );
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export { auth };
